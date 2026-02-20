import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import DrillDownBreadcrumb from './DrillDownBreadcrumb';
import PersonCard from './PersonCard';
import UnassignedPool from './UnassignedPool';

const DrillDownView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState(null);
  const [role, setRole] = useState(null);
  const [trail, setTrail] = useState([]);
  const [subordinates, setSubordinates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [unassignedAccounts, setUnassignedAccounts] = useState([]);
  const [unassignedPeople, setUnassignedPeople] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);

  const getUserName = (user) => {
    if (!user) return 'Unknown';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown';
  };

  const buildBreadcrumbTrail = useCallback(async (currentUserId) => {
    const crumbs = [];
    let currentId = currentUserId;
    const visited = new Set();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const { data: assignment } = await supabase
        .from('hierarchy_assignments')
        .select('user_id, role_tier, parent_user_id, region_id')
        .eq('user_id', currentId)
        .limit(1)
        .single();

      const { data: user } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', currentId)
        .single();

      if (user) {
        crumbs.unshift({
          userId: currentId,
          name: getUserName(user),
          role: assignment?.role_tier || 'user',
        });
      }

      if (assignment?.parent_user_id) {
        currentId = assignment.parent_user_id;
      } else if (assignment?.region_id) {
        // VP level - add region name at top
        const { data: region } = await supabase
          .from('regions')
          .select('id, name')
          .eq('id', assignment.region_id)
          .single();

        if (region) {
          crumbs.unshift({
            userId: null,
            name: region.name,
            role: 'region',
          });
        }
        break;
      } else {
        break;
      }
    }

    return crumbs;
  }, []);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Get user info
      const { data: userInfo } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', userId)
        .single();

      setPerson(userInfo);

      // Get hierarchy assignment
      const { data: assignments } = await supabase
        .from('hierarchy_assignments')
        .select('*')
        .eq('user_id', userId);

      const assignment = assignments?.[0];
      const userRole = assignment?.role_tier || null;
      setRole(userRole);

      // Build breadcrumb trail
      const crumbs = await buildBreadcrumbTrail(userId);
      setTrail(crumbs);

      if (userRole === 'vp') {
        // VP view: show managers under them
        const { data: managerAssigns } = await supabase
          .from('hierarchy_assignments')
          .select('user_id, role_tier, custom_label')
          .eq('parent_user_id', userId)
          .eq('role_tier', 'manager');

        const mgrIds = (managerAssigns || []).map(m => m.user_id);
        let mgrUsers = [];
        if (mgrIds.length > 0) {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', mgrIds);
          mgrUsers = data || [];
        }

        // Get account counts and last activity per manager
        const subs = await Promise.all((managerAssigns || []).map(async (m) => {
          const user = mgrUsers.find(u => u.id === m.user_id);
          const { data: acctData } = await supabase
            .from('account_delegations')
            .select('id')
            .eq('delegated_to', m.user_id);

          const { data: lastCall } = await supabase
            .from('call_logs')
            .select('call_date')
            .eq('user_id', m.user_id)
            .order('call_date', { ascending: false })
            .limit(1);

          return {
            id: m.user_id,
            userId: m.user_id,
            name: getUserName(user),
            role: m.role_tier,
            custom_label: m.custom_label,
            accountCount: (acctData || []).length,
            lastActivity: lastCall?.[0]?.call_date || null,
          };
        }));

        setSubordinates(subs);

        // Find managers without a VP parent (unassigned)
        const { data: orphanManagers } = await supabase
          .from('hierarchy_assignments')
          .select('user_id, role_tier')
          .eq('role_tier', 'manager')
          .is('parent_user_id', null);

        if (orphanManagers?.length > 0) {
          const orphanIds = orphanManagers.map(o => o.user_id);
          const { data: orphanUsers } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', orphanIds);
          setUnassignedPeople((orphanUsers || []).map(u => ({ ...u, role_tier: 'manager' })));
        } else {
          setUnassignedPeople([]);
        }

        // Get region accounts for unassigned count
        const regionIds = (assignments || []).map(a => a.region_id).filter(Boolean);
        if (regionIds.length > 0) {
          const { data: srData } = await supabase
            .from('surgeon_regions')
            .select('surgeon_id')
            .in('region_id', regionIds);

          const surgeonIds = [...new Set((srData || []).map(r => r.surgeon_id))];
          if (surgeonIds.length > 0) {
            const { data: delegated } = await supabase
              .from('account_delegations')
              .select('surgeon_id')
              .in('surgeon_id', surgeonIds);

            const delegatedIds = new Set((delegated || []).map(d => d.surgeon_id));
            const unassigned = surgeonIds.filter(id => !delegatedIds.has(id));

            if (unassigned.length > 0) {
              const { data: unassignedSurgeons } = await supabase
                .from('surgeons')
                .select('id, full_name, first_name, last_name, specialty')
                .in('id', unassigned.slice(0, 50));
              setUnassignedAccounts(unassignedSurgeons || []);
            } else {
              setUnassignedAccounts([]);
            }
          }
        }

      } else if (userRole === 'manager') {
        // Manager view: show reps under them
        const { data: repAssigns } = await supabase
          .from('hierarchy_assignments')
          .select('user_id, role_tier, custom_label')
          .eq('parent_user_id', userId)
          .eq('role_tier', 'rep');

        const repIds = (repAssigns || []).map(r => r.user_id);
        let repUsers = [];
        if (repIds.length > 0) {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', repIds);
          repUsers = data || [];
        }

        const subs = await Promise.all((repAssigns || []).map(async (r) => {
          const user = repUsers.find(u => u.id === r.user_id);
          const { data: acctData } = await supabase
            .from('account_delegations')
            .select('id')
            .eq('delegated_to', r.user_id);

          const { data: lastCall } = await supabase
            .from('call_logs')
            .select('call_date')
            .eq('user_id', r.user_id)
            .order('call_date', { ascending: false })
            .limit(1);

          return {
            id: r.user_id,
            userId: r.user_id,
            name: getUserName(user),
            role: r.role_tier,
            custom_label: r.custom_label,
            accountCount: (acctData || []).length,
            lastActivity: lastCall?.[0]?.call_date || null,
          };
        }));

        setSubordinates(subs);

        // Unassigned reps
        const { data: orphanReps } = await supabase
          .from('hierarchy_assignments')
          .select('user_id, role_tier')
          .eq('role_tier', 'rep')
          .is('parent_user_id', null);

        if (orphanReps?.length > 0) {
          const orphanIds = orphanReps.map(o => o.user_id);
          const { data: orphanUsers } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', orphanIds);
          setUnassignedPeople((orphanUsers || []).map(u => ({ ...u, role_tier: 'rep' })));
        } else {
          setUnassignedPeople([]);
        }

        // Unassigned accounts under this manager
        const { data: myDelegations } = await supabase
          .from('account_delegations')
          .select('surgeon_id')
          .eq('delegated_to', userId);

        const mySurgeonIds = (myDelegations || []).map(d => d.surgeon_id);
        if (mySurgeonIds.length > 0) {
          const { data: subDelegations } = await supabase
            .from('account_delegations')
            .select('surgeon_id')
            .eq('delegated_by', userId);

          const subDelegatedIds = new Set((subDelegations || []).map(d => d.surgeon_id));
          const unassignedIds = mySurgeonIds.filter(id => !subDelegatedIds.has(id));

          if (unassignedIds.length > 0) {
            const { data: surgeons } = await supabase
              .from('surgeons')
              .select('id, full_name, first_name, last_name, specialty')
              .in('id', unassignedIds.slice(0, 50));
            setUnassignedAccounts(surgeons || []);
          } else {
            setUnassignedAccounts([]);
          }
        }

      } else if (userRole === 'rep') {
        // Rep view: show their delegated accounts
        const { data: repDelegations } = await supabase
          .from('account_delegations')
          .select('surgeon_id')
          .eq('delegated_to', userId);

        const surgeonIds = (repDelegations || []).map(d => d.surgeon_id);
        if (surgeonIds.length > 0) {
          const { data: surgeons } = await supabase
            .from('surgeons')
            .select('id, full_name, first_name, last_name, specialty, city, state')
            .in('id', surgeonIds)
            .order('full_name');
          setAccounts(surgeons || []);
        } else {
          setAccounts([]);
        }
        setSubordinates([]);
        setUnassignedPeople([]);
        setUnassignedAccounts([]);
      }

      // Fetch recent calls for this user (or their subordinates)
      const { data: calls } = await supabase
        .from('call_logs')
        .select('*, surgeon:surgeons(full_name, first_name, last_name), rep:users!call_logs_user_id_fkey(first_name, last_name)')
        .order('call_date', { ascending: false })
        .limit(10);

      setRecentCalls(calls || []);

    } catch (err) {
      console.error('[DrillDownView] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, buildBreadcrumbTrail]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <span style={styles.emptyText}>User not found</span>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <DrillDownBreadcrumb trail={trail} />

      <div style={styles.headerCard}>
        <h2 style={styles.personName}>{getUserName(person)}</h2>
        {role && (
          <span style={{
            ...styles.roleBadge,
            backgroundColor: role === 'vp' ? '#7c3aed' : role === 'manager' ? '#2563eb' : '#059669',
          }}>
            {role === 'vp' ? 'VP' : role === 'manager' ? 'Manager' : 'Rep'}
          </span>
        )}
      </div>

      {/* Summary stats */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>
            {role === 'rep' ? accounts.length : subordinates.length}
          </span>
          <span style={styles.statLabel}>
            {role === 'vp' ? 'Managers' : role === 'manager' ? 'Reps' : 'Accounts'}
          </span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={{ ...styles.statValue, color: unassignedAccounts.length > 0 ? '#d97706' : '#059669' }}>
            {unassignedAccounts.length}
          </span>
          <span style={styles.statLabel}>Unassigned Accts</span>
        </div>
      </div>

      {/* Subordinates (VP/Manager view) */}
      {(role === 'vp' || role === 'manager') && subordinates.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>
            {role === 'vp' ? 'Managers' : 'Reps'}
          </span>
          <div style={styles.cardList}>
            {subordinates.map(sub => (
              <PersonCard key={sub.id} person={sub} />
            ))}
          </div>
        </div>
      )}

      {/* Accounts (Rep view) */}
      {role === 'rep' && accounts.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Accounts ({accounts.length})</span>
          <div style={styles.cardList}>
            {accounts.map(account => {
              const name = account.full_name
                || `${account.first_name || ''} ${account.last_name || ''}`.trim()
                || 'Unknown';
              return (
                <button
                  key={account.id}
                  onClick={() => navigate(`/field-intel/dossier/${account.id}`)}
                  style={styles.accountRow}
                >
                  <div style={styles.accountInfo}>
                    <span style={styles.accountName}>{name}</span>
                    {account.specialty && <span style={styles.accountMeta}>{account.specialty}</span>}
                  </div>
                  {(account.city || account.state) && (
                    <span style={styles.accountLocation}>
                      {[account.city, account.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unassigned Pool */}
      <UnassignedPool accounts={unassignedAccounts} people={unassignedPeople} />

      {/* Recent Activity */}
      {recentCalls.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Recent Activity</span>
          <div style={styles.cardList}>
            {recentCalls.map(call => {
              const surgeonName = call.surgeon
                ? (call.surgeon.full_name || `${call.surgeon.first_name || ''} ${call.surgeon.last_name || ''}`.trim())
                : 'Unknown';
              const repName = call.rep
                ? `${call.rep.first_name || ''} ${call.rep.last_name || ''}`.trim()
                : '';

              return (
                <button
                  key={call.id}
                  onClick={() => navigate(`/field-intel/dossier/${call.surgeon_id}`)}
                  style={styles.activityRow}
                >
                  <div style={styles.activityHeader}>
                    <span style={styles.activitySurgeon}>{surgeonName}</span>
                    <span style={styles.activityDate}>
                      {new Date(call.call_date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                      })}
                    </span>
                  </div>
                  {repName && <span style={styles.activityRep}>{repName}</span>}
                  {call.summary && (
                    <span style={styles.activitySummary}>
                      {call.summary.length > 80 ? call.summary.slice(0, 80) + '...' : call.summary}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ height: '24px' }} />
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
    gap: '12px',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '60px 0',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#64748b',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '60px 0',
  },
  emptyText: {
    fontSize: '15px',
    color: '#94a3b8',
  },
  backBtn: {
    padding: '8px 16px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  headerCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  personName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  roleBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#ffffff',
    padding: '3px 8px',
    borderRadius: '5px',
    letterSpacing: '0.5px',
  },
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  statDivider: {
    width: '1px',
    height: '32px',
    backgroundColor: '#e2e8f0',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  accountRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '12px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  accountMeta: {
    fontSize: '12px',
    color: '#1e3a8a',
  },
  accountLocation: {
    fontSize: '12px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  activityRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  activityHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activitySurgeon: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
  },
  activityDate: {
    fontSize: '12px',
    color: '#64748b',
  },
  activityRep: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  activitySummary: {
    fontSize: '12px',
    color: '#334155',
    lineHeight: '1.4',
  },
};

export default DrillDownView;
