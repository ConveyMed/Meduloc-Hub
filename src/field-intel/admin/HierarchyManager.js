import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const ROLE_COLORS = {
  vp: '#7c3aed',
  manager: '#2563eb',
  rep: '#059669',
};

const ROLE_LABELS = {
  vp: 'VP',
  manager: 'Manager',
  rep: 'Rep',
};

const HierarchyManager = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalUserId, setModalUserId] = useState('');
  const [modalRole, setModalRole] = useState('vp');
  const [modalRegionIds, setModalRegionIds] = useState([]);
  const [modalParentId, setModalParentId] = useState('');
  const [modalParentIds, setModalParentIds] = useState([]);
  const [modalLabel, setModalLabel] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [usersRes, assignmentsRes, regionsRes] = await Promise.all([
      supabase.from('users').select('id, first_name, last_name, email').order('first_name'),
      supabase.from('hierarchy_assignments').select('*'),
      supabase.from('regions').select('*').order('name'),
    ]);
    if (usersRes.data) setUsers(usersRes.data);
    if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    if (regionsRes.data) setRegions(regionsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build tree data
  const buildTree = () => {
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = u;
    });

    // Group assignments by user
    const userAssignments = {};
    assignments.forEach(a => {
      if (!userAssignments[a.user_id]) {
        userAssignments[a.user_id] = [];
      }
      userAssignments[a.user_id].push(a);
    });

    // Get unique assigned user IDs
    const assignedUserIds = new Set(Object.keys(userAssignments));

    // Regions with their VPs
    const regionMap = {};
    regions.forEach(r => {
      regionMap[r.id] = { ...r, vps: [], unattached: [] };
    });

    // Sort assignments: VPs first, then managers, then reps
    const vps = [];
    const managers = [];
    const reps = [];

    Object.entries(userAssignments).forEach(([userId, userAssigns]) => {
      const role = userAssigns[0].role_tier;
      if (role === 'vp') vps.push({ userId, assignments: userAssigns });
      else if (role === 'manager') managers.push({ userId, assignments: userAssigns });
      else if (role === 'rep') reps.push({ userId, assignments: userAssigns });
    });

    // Build region trees
    const tree = [];

    regions.forEach(region => {
      const regionNode = {
        region,
        children: [], // VPs
      };

      // Find VPs in this region
      vps.forEach(vp => {
        const vpInRegion = vp.assignments.find(a => a.region_id === region.id);
        if (vpInRegion) {
          const vpNode = {
            userId: vp.userId,
            user: userMap[vp.userId],
            role: 'vp',
            label: vpInRegion.custom_label,
            children: [], // Managers
          };

          // Find managers under this VP (manager can have multiple VPs)
          managers.forEach(mgr => {
            const mgrUnderVp = mgr.assignments.find(a => a.parent_user_id === vp.userId);
            if (mgrUnderVp) {
              const mgrNode = {
                userId: mgr.userId,
                user: userMap[mgr.userId],
                role: 'manager',
                label: mgrUnderVp.custom_label,
                children: [], // Reps
              };

              // Find reps under this manager
              reps.forEach(rep => {
                const repAssign = rep.assignments[0];
                if (repAssign.parent_user_id === mgr.userId) {
                  mgrNode.children.push({
                    userId: rep.userId,
                    user: userMap[rep.userId],
                    role: 'rep',
                    label: repAssign.custom_label,
                  });
                }
              });

              vpNode.children.push(mgrNode);
            }
          });

          regionNode.children.push(vpNode);
        }
      });

      tree.push(regionNode);
    });

    // Find unassigned users
    const unassigned = users.filter(u => !assignedUserIds.has(u.id));

    return { tree, unassigned };
  };

  const getUserName = (user) => {
    if (!user) return 'Unknown';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown';
  };

  const openAssignModal = (userId = null) => {
    if (userId) {
      // Editing existing
      const userAssigns = assignments.filter(a => a.user_id === userId);
      if (userAssigns.length > 0) {
        const role = userAssigns[0].role_tier;
        setModalUserId(userId);
        setModalRole(role);
        setModalRegionIds(userAssigns.map(a => a.region_id).filter(Boolean));
        setModalParentIds(userAssigns.map(a => a.parent_user_id).filter(Boolean));
        setModalParentId(userAssigns[0].parent_user_id || '');
        setModalLabel(userAssigns[0].custom_label || '');
        setEditingUserId(userId);
      }
    } else {
      setModalUserId('');
      setModalRole('vp');
      setModalRegionIds([]);
      setModalParentId('');
      setModalParentIds([]);
      setModalLabel('');
      setEditingUserId(null);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    const userId = modalUserId;
    if (!userId) return;
    setSaving(true);

    // Delete existing assignments for this user
    await supabase.from('hierarchy_assignments').delete().eq('user_id', userId);

    if (modalRole === 'vp') {
      // One row per region, or one row with no region if none selected yet
      const rows = modalRegionIds.length > 0
        ? modalRegionIds.map(regionId => ({
            user_id: userId,
            role_tier: 'vp',
            region_id: regionId,
            parent_user_id: null,
            custom_label: modalLabel.trim() || null,
          }))
        : [{
            user_id: userId,
            role_tier: 'vp',
            region_id: null,
            parent_user_id: null,
            custom_label: modalLabel.trim() || null,
          }];
      const { error } = await supabase.from('hierarchy_assignments').insert(rows);
      if (error) {
        console.error('[HierarchyManager] VP insert error:', error);
        alert('Failed to save: ' + error.message);
      }
    } else if (modalRole === 'manager') {
      // One row per VP
      if (modalParentIds.length === 0) {
        alert('Select at least one VP for Manager');
        setSaving(false);
        return;
      }
      const rows = modalParentIds.map(parentId => ({
        user_id: userId,
        role_tier: 'manager',
        region_id: null,
        parent_user_id: parentId,
        custom_label: modalLabel.trim() || null,
      }));
      const { error } = await supabase.from('hierarchy_assignments').insert(rows);
      if (error) {
        console.error('[HierarchyManager] Manager insert error:', error);
        alert('Failed to save: ' + error.message);
      }
    } else {
      // Single row for rep
      const row = {
        user_id: userId,
        role_tier: 'rep',
        region_id: null,
        parent_user_id: modalParentId || null,
        custom_label: modalLabel.trim() || null,
      };
      const { error } = await supabase.from('hierarchy_assignments').insert(row);
      if (error) {
        console.error('[HierarchyManager] Rep insert error:', error);
        alert('Failed to save: ' + error.message);
      }
    }

    setSaving(false);
    setShowModal(false);
    fetchData();
  };

  const handleRemove = async () => {
    if (!editingUserId) return;

    // Fetch impact counts before removal
    const { data: delegationData } = await supabase
      .from('account_delegations')
      .select('id')
      .eq('delegated_to', editingUserId);

    const { data: subordinateData } = await supabase
      .from('hierarchy_assignments')
      .select('id')
      .eq('parent_user_id', editingUserId);

    const delegationCount = (delegationData || []).length;
    const subordinateCount = (subordinateData || []).length;

    const impacts = [];
    if (delegationCount > 0) impacts.push(`${delegationCount} account${delegationCount !== 1 ? 's' : ''}`);
    if (subordinateCount > 0) impacts.push(`${subordinateCount} ${subordinateCount !== 1 ? 'people' : 'person'}`);

    const message = impacts.length > 0
      ? `This person has ${impacts.join(' and ')} assigned. Removing them will unassign everything. Proceed?`
      : 'Remove this person from the hierarchy?';

    if (!window.confirm(message)) return;

    setSaving(true);
    await supabase.from('hierarchy_assignments').delete().eq('user_id', editingUserId);
    setSaving(false);
    setShowModal(false);
    fetchData();
  };

  // Get VPs for manager parent dropdown
  const vpUsers = assignments
    .filter(a => a.role_tier === 'vp')
    .reduce((acc, a) => {
      if (!acc.find(x => x.userId === a.user_id)) {
        acc.push({ userId: a.user_id, user: users.find(u => u.id === a.user_id) });
      }
      return acc;
    }, []);

  // Get managers for rep parent dropdown
  const managerUsers = assignments
    .filter(a => a.role_tier === 'manager')
    .reduce((acc, a) => {
      if (!acc.find(x => x.userId === a.user_id)) {
        acc.push({ userId: a.user_id, user: users.find(u => u.id === a.user_id) });
      }
      return acc;
    }, []);

  const { tree, unassigned } = buildTree();

  const renderNode = (node, depth, parentKey = '') => {
    const color = ROLE_COLORS[node.role] || '#64748b';
    const indent = depth * 24;
    const nodeKey = parentKey ? `${parentKey}-${node.userId}` : node.userId;
    return (
      <div key={nodeKey} style={{ marginLeft: indent }}>
        <button
          onClick={() => openAssignModal(node.userId)}
          style={styles.treeNode}
        >
          <div style={{ ...styles.roleDot, backgroundColor: color }} />
          <div style={styles.nodeInfo}>
            <span style={styles.nodeName}>{getUserName(node.user)}</span>
            <span style={{ ...styles.roleBadge, backgroundColor: color }}>
              {node.label || ROLE_LABELS[node.role]}
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        {node.children && node.children.map(child => renderNode(child, depth + 1, nodeKey))}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <button onClick={() => navigate('/field-intel/settings')} style={styles.backBtn}>
            <ArrowLeftIcon />
          </button>
          <h2 style={styles.title}>Org Hierarchy</h2>
        </div>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <button onClick={() => navigate('/field-intel/settings')} style={styles.backBtn}>
          <ArrowLeftIcon />
        </button>
        <h2 style={styles.title}>Org Hierarchy</h2>
        <button onClick={() => openAssignModal()} style={styles.addBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Assign User
        </button>
      </div>

      {/* Tree View */}
      {tree.map(({ region, children }) => (
        <div key={region.id} style={styles.regionSection}>
          <div style={styles.regionHeader}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span style={styles.regionName}>{region.name}</span>
          </div>
          {children.length === 0 ? (
            <div style={styles.emptyRegion}>
              <span style={styles.emptyRegionText}>No assignments in this region</span>
            </div>
          ) : (
            <div style={styles.treeList}>
              {children.map(vpNode => renderNode(vpNode, 0))}
            </div>
          )}
        </div>
      ))}

      {/* Unassigned Users */}
      {unassigned.length > 0 && (
        <div style={styles.unassignedSection}>
          <span style={styles.unassignedTitle}>Unassigned Users ({unassigned.length})</span>
          <div style={styles.unassignedList}>
            {unassigned.map(u => (
              <button
                key={u.id}
                onClick={() => {
                  setModalUserId(u.id);
                  setModalRole('vp');
                  setModalRegionIds([]);
                  setModalParentId('');
                  setModalParentIds([]);
                  setModalLabel('');
                  setEditingUserId(null);
                  setShowModal(true);
                }}
                style={styles.unassignedCard}
              >
                <span style={styles.unassignedName}>{getUserName(u)}</span>
                <span style={styles.unassignedEmail}>{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingUserId ? 'Edit Assignment' : 'Assign Role'}
            </h3>

            {/* User Selector */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>User</label>
              <select
                value={modalUserId}
                onChange={(e) => setModalUserId(e.target.value)}
                style={styles.select}
                disabled={!!editingUserId}
              >
                <option value="">Select a user...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{getUserName(u)}</option>
                ))}
              </select>
            </div>

            {/* Role Toggle */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Role</label>
              <div style={styles.roleToggle}>
                {['vp', 'manager', 'rep'].map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      setModalRole(role);
                      setModalRegionIds([]);
                      setModalParentId('');
                      setModalParentIds([]);
                    }}
                    style={{
                      ...styles.roleBtn,
                      ...(modalRole === role ? {
                        backgroundColor: ROLE_COLORS[role],
                        color: '#ffffff',
                        border: `1px solid ${ROLE_COLORS[role]}`,
                      } : {}),
                    }}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>

            {/* VP: Region checkboxes */}
            {modalRole === 'vp' && (
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Regions</label>
                <div style={styles.checkboxList}>
                  {regions.map(r => {
                    const checked = modalRegionIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          if (checked) {
                            setModalRegionIds(modalRegionIds.filter(id => id !== r.id));
                          } else {
                            setModalRegionIds([...modalRegionIds, r.id]);
                          }
                        }}
                        style={styles.checkboxRow}
                      >
                        <div style={{
                          ...styles.checkbox,
                          ...(checked ? styles.checkboxChecked : {}),
                        }}>
                          {checked && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span style={styles.checkboxLabel}>{r.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manager: Reports to VPs (multi-select) */}
            {modalRole === 'manager' && (
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Reports to (VPs)</label>
                <div style={styles.checkboxList}>
                  {vpUsers.map(vp => {
                    const checked = modalParentIds.includes(vp.userId);
                    return (
                      <button
                        key={vp.userId}
                        onClick={() => {
                          if (checked) {
                            setModalParentIds(modalParentIds.filter(id => id !== vp.userId));
                          } else {
                            setModalParentIds([...modalParentIds, vp.userId]);
                          }
                        }}
                        style={styles.checkboxRow}
                      >
                        <div style={{
                          ...styles.checkbox,
                          ...(checked ? styles.checkboxChecked : {}),
                        }}>
                          {checked && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span style={styles.checkboxLabel}>{getUserName(vp.user)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rep: Reports to Manager */}
            {modalRole === 'rep' && (
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Reports to (Manager)</label>
                <select
                  value={modalParentId}
                  onChange={(e) => setModalParentId(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Select a Manager...</option>
                  {managerUsers.map(mgr => (
                    <option key={mgr.userId} value={mgr.userId}>
                      {getUserName(mgr.user)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Label */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Custom Label (optional)</label>
              <input
                type="text"
                value={modalLabel}
                onChange={(e) => setModalLabel(e.target.value)}
                placeholder="e.g. Regional VP - West"
                style={styles.input}
              />
            </div>

            <div style={styles.modalActions}>
              {editingUserId && (
                <button
                  onClick={handleRemove}
                  disabled={saving}
                  style={styles.removeBtn}
                >
                  Remove
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={!modalUserId || saving}
                style={{
                  ...styles.saveBtn,
                  opacity: !modalUserId || saving ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backBtn: {
    padding: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    flex: 1,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '48px 0',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  regionSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  regionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  regionName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b',
  },
  emptyRegion: {
    padding: '16px',
    textAlign: 'center',
  },
  emptyRegionText: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  treeList: {
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  treeNode: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    marginBottom: '4px',
  },
  roleDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  nodeInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  nodeName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  roleBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#ffffff',
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  unassignedSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  unassignedTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
  },
  unassignedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  unassignedCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  unassignedName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  unassignedEmail: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '420px',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  select: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    outline: 'none',
    cursor: 'pointer',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
  },
  roleToggle: {
    display: 'flex',
    gap: '6px',
  },
  roleBtn: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
  },
  checkboxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    borderRadius: '5px',
    border: '2px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#1e3a8a',
    border: '2px solid #1e3a8a',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '500',
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginTop: '4px',
  },
  removeBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 18px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default HierarchyManager;
