import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import useHierarchyData from './useHierarchyData';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ORDER, getUserName } from './hierarchyConstants';
import PersonDetailPopup from './PersonDetailPopup';
import DragConfirmModal from './DragConfirmModal';
import HierarchyToast from './HierarchyToast';
import HierarchyTree from './HierarchyTree';

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const MeBadge = () => (
  <span style={{ fontSize: '10px', fontWeight: '700', color: '#0d9488', backgroundColor: '#ccfbf1', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>Me</span>
);

const GlobeSmallIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

// Draggable region pill for the left panel
const DraggableRegionRow = ({ region }) => {
  const dragId = `panel-unassigned-region-${region.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: {
      regionId: region.id,
      region,
      isUnassignedRegion: true,
      dragId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        ...styles.regionDragRow,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <GlobeSmallIcon />
      <span style={styles.regionDragName}>{region.name}</span>
      <span style={styles.regionDragHint}>Drag to VP</span>
    </div>
  );
};

// Draggable user row for the left panel
const DraggableUserRow = ({ user, role, assignmentId, parentName, onTap, isMe }) => {
  const isUnassigned = !role;
  const dragId = isUnassigned ? `panel-unassigned-${user.id}` : `panel-${role}-${assignmentId || user.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: {
      userId: user.id,
      user,
      role,
      assignmentId,
      dragId,
      isUnassigned,
    },
  });

  const color = ROLE_COLORS[role] || '#94a3b8';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onTap(user.id);
        }
      }}
      style={{
        ...styles.userRow,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <div style={{ ...styles.rowDot, backgroundColor: color }} />
      <div style={styles.rowContent}>
        <div style={styles.rowTopLine}>
          <span style={styles.rowName}>{getUserName(user)}</span>
          {isMe && <MeBadge />}
          <span style={{ ...styles.rowBadge, backgroundColor: color }}>
            {role ? ROLE_LABELS[role] : 'Unassigned'}
          </span>
        </div>
        {user.email && (
          <span style={styles.rowEmail}>{user.email}</span>
        )}
        {parentName && (
          <span style={styles.rowParent}>Reports to: {parentName}</span>
        )}
      </div>
    </div>
  );
};

// Droppable wrapper for the left panel
const DroppableLeftPanel = ({ children, isActive }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'left-panel-drop',
    data: { type: 'unassigned-zone' },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.leftPanel,
        ...(isOver && isActive
          ? { border: '2px solid #f59e0b', backgroundColor: '#fffbeb' }
          : {}),
      }}
    >
      {children}
    </div>
  );
};

// Droppable VP zone (drop unassigned user on blank tree area to assign as VP)
const DroppableVpZone = ({ children, isActive }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'twopanel-vp-zone',
    data: { type: 'vp-zone' },
  });
  return (
    <div ref={setNodeRef} style={{
      flex: 1,
      overflowY: 'auto',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      ...(isOver && isActive ? { outline: '2px dashed #7c3aed', outlineOffset: '-2px', backgroundColor: '#faf5ff' } : {}),
    }}>
      {children}
    </div>
  );
};

const HierarchyTwoPanel = () => {
  const navigate = useNavigate();
  const data = useHierarchyData();
  const {
    users, assignments, regions, loading,
    vpMap, managerMap, repMap, userMap, assignmentsByUser,
    unassignedUsers, unassignedRegions,
    executeParentChange, executeAssignUnassigned, executeUnassign, executeAssignRegion,
    requestRoleChange, handleDetailSave, handleDetailRemove,
    detailStack, currentDetailUserId, openDetail, pushDetail, popDetail, closeDetail,
    dragConfirm, setDragConfirm,
    toast,
    currentUserId,
  } = data;

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeDragData, setActiveDragData] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Build the user list with role info
  const userList = useMemo(() => {
    return users.map((user) => {
      const userAssigns = assignmentsByUser[user.id];
      if (!userAssigns || userAssigns.length === 0) {
        return { user, role: null, assignmentId: null, parentName: null };
      }
      const role = userAssigns[0].role_tier;
      const assignmentId = userAssigns[0].id;
      const parentUserId = userAssigns[0].parent_user_id;
      const parentUser = parentUserId ? userMap[parentUserId] : null;
      const parentName = parentUser ? getUserName(parentUser) : null;
      return { user, role, assignmentId, parentName };
    });
  }, [users, assignmentsByUser, userMap]);

  // Filter users
  const filteredUsers = useMemo(() => {
    let list = userList;

    // Role filter
    if (roleFilter === 'vp') {
      list = list.filter((item) => item.role === 'vp');
    } else if (roleFilter === 'manager') {
      list = list.filter((item) => item.role === 'manager');
    } else if (roleFilter === 'rep') {
      list = list.filter((item) => item.role === 'rep');
    } else if (roleFilter === 'unassigned') {
      list = list.filter((item) => !item.role);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const name = getUserName(item.user).toLowerCase();
        const email = (item.user.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    return list;
  }, [userList, roleFilter, searchQuery]);

  const handleDragStart = (event) => {
    setActiveDragData(event.active.data.current);
  };

  const handleDragEnd = async (event) => {
    const { over } = event;
    const dragData = activeDragData;
    setActiveDragData(null);

    if (!dragData || !over) return;
    const dropData = over.data.current;
    if (!dropData) return;

    // Drop onto left panel (unassign zone): unassign the user
    if (dropData.type === 'unassigned-zone' && !dragData.isUnassigned && !dragData.isUnassignedRegion) {
      await executeUnassign(dragData.userId);
      return;
    }

    // Unassigned region onto a VP node
    if (dragData.isUnassignedRegion && dropData.role === 'vp') {
      await executeAssignRegion(dragData.regionId, dropData.userId);
      return;
    }

    // Unassigned user onto a specific hierarchy node (VP -> manager, Manager -> rep)
    if (dragData.isUnassigned && dropData.isDropTarget) {
      const newRole = dropData.role === 'vp' ? 'manager' : 'rep';
      await executeAssignUnassigned(dragData.userId, newRole, dropData.userId);
      return;
    }

    // Unassigned user onto VP zone (blank tree area, not on a node)
    if (dragData.isUnassigned && dropData.type === 'vp-zone') {
      await executeAssignUnassigned(dragData.userId, 'vp', null);
      return;
    }

    // Assigned user onto a valid parent (reassign)
    if (dragData.role && dropData.role && dropData.isDropTarget) {
      const dragRole = dragData.role;
      const dropRole = dropData.role;
      if (
        (dragRole === 'rep' && (dropRole === 'manager' || dropRole === 'vp')) ||
        (dragRole === 'manager' && dropRole === 'vp')
      ) {
        await executeParentChange(dragData, dropData);
      }
    }
  };

  // Promote/demote handlers for PersonDetailPopup
  const getPromoteDemoteHandlers = (userId) => {
    const userAssigns = assignmentsByUser[userId];
    if (!userAssigns || userAssigns.length === 0) return {};
    const role = userAssigns[0]?.role_tier;
    const idx = ROLE_ORDER.indexOf(role);
    return {
      onPromote: idx >= 0 && idx < ROLE_ORDER.length - 1
        ? () => requestRoleChange(userId, ROLE_ORDER[idx + 1])
        : undefined,
      onDemote: idx > 0
        ? () => requestRoleChange(userId, ROLE_ORDER[idx - 1])
        : undefined,
    };
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <button onClick={() => navigate('/field-intel/settings/hierarchy')} style={styles.backBtn}>
            <ArrowLeftIcon />
          </button>
          <h2 style={styles.title}>Two-Panel View</h2>
        </div>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.headerRow}>
          <button onClick={() => navigate('/field-intel/settings/hierarchy')} style={styles.backBtn}>
            <ArrowLeftIcon />
          </button>
          <h2 style={styles.title}>Two-Panel View</h2>
        </div>

        {/* Two-panel layout */}
        <div style={{
          ...styles.panelContainer,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          {/* Left Panel */}
          <DroppableLeftPanel isActive={!!activeDragData && !activeDragData.isUnassigned && !activeDragData.isUnassignedRegion}>
            {/* Search */}
            <div style={styles.searchWrap}>
              <SearchIcon />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                style={styles.searchInput}
              />
            </div>

            {/* Role filter */}
            <div style={styles.filterWrap}>
              <div style={styles.selectWrap}>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All</option>
                  <option value="vp">VPs</option>
                  <option value="manager">Managers</option>
                  <option value="rep">Reps</option>
                  <option value="unassigned">Unassigned</option>
                </select>
                <div style={styles.selectChevron}>
                  <ChevronDownIcon />
                </div>
              </div>
              <span style={styles.countLabel}>{filteredUsers.length} users</span>
            </div>

            {/* User list */}
            <div style={styles.userListScroll}>
              {filteredUsers.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyText}>No users found</span>
                </div>
              ) : (
                filteredUsers.map((item) => (
                  <DraggableUserRow
                    key={item.user.id}
                    user={item.user}
                    role={item.role}
                    assignmentId={item.assignmentId}
                    parentName={item.parentName}
                    onTap={openDetail}
                    isMe={item.user.id === currentUserId}
                  />
                ))
              )}

              {/* Unassigned Regions */}
              {unassignedRegions.length > 0 && (
                <div style={styles.regionSection}>
                  <span style={styles.regionSectionLabel}>
                    Unassigned Regions ({unassignedRegions.length})
                  </span>
                  {unassignedRegions.map(region => (
                    <DraggableRegionRow key={region.id} region={region} />
                  ))}
                </div>
              )}
            </div>
          </DroppableLeftPanel>

          {/* Right Panel */}
          <div style={{
            ...styles.rightPanel,
            minWidth: isMobile ? 'auto' : 0,
          }}>
            <div style={styles.rightPanelHeader}>
              <span style={styles.rightPanelTitle}>Hierarchy</span>
            </div>
            <DroppableVpZone isActive={!!activeDragData && activeDragData.isUnassigned}>
              <HierarchyTree
                viewMode="vp"
                users={users}
                assignments={assignments}
                regions={regions}
                onNodeTap={openDetail}
                activeId={activeDragData?.dragId || null}
                currentUserId={currentUserId}
              />
              {[...vpMap.keys()].length === 0 && (
                <div style={styles.emptyState}>
                  <span style={styles.emptyText}>No hierarchy data. Drag users from the left panel onto roles to get started.</span>
                </div>
              )}
            </DroppableVpZone>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragData && activeDragData.isUnassignedRegion ? (
          <div style={styles.dragOverlay}>
            <GlobeSmallIcon />
            <span style={styles.dragOverlayName}>
              {activeDragData.region?.name || 'Region'}
            </span>
            <span style={{ ...styles.dragOverlayBadge, backgroundColor: '#1e3a8a' }}>
              Region
            </span>
          </div>
        ) : activeDragData ? (
          <div style={styles.dragOverlay}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: ROLE_COLORS[activeDragData.role] || '#94a3b8',
              flexShrink: 0,
            }} />
            <span style={styles.dragOverlayName}>
              {getUserName(activeDragData.user)}
            </span>
            <span style={{
              ...styles.dragOverlayBadge,
              backgroundColor: ROLE_COLORS[activeDragData.role] || '#94a3b8',
            }}>
              {activeDragData.role ? ROLE_LABELS[activeDragData.role] : 'Unassigned'}
            </span>
          </div>
        ) : null}
      </DragOverlay>

      {/* Person Detail Popup */}
      {currentDetailUserId && (() => {
        const handlers = getPromoteDemoteHandlers(currentDetailUserId);
        return (
          <PersonDetailPopup
            userId={currentDetailUserId}
            users={users}
            assignments={assignments}
            regions={regions}
            canGoBack={detailStack.length > 1}
            onBack={popDetail}
            onClose={closeDetail}
            onSave={handleDetailSave}
            onRemove={handleDetailRemove}
            onPromote={handlers.onPromote}
            onDemote={handlers.onDemote}
            onNavigate={pushDetail}
            onAssign={executeAssignUnassigned}
          />
        );
      })()}

      {/* Drag Confirm Modal */}
      {dragConfirm && (
        <DragConfirmModal
          personName={dragConfirm.personName}
          fromRole={dragConfirm.fromRole}
          toRole={dragConfirm.toRole}
          subordinateCount={dragConfirm.subordinateCount}
          onKeep={() => { dragConfirm.onKeep(); }}
          onRemove={() => { dragConfirm.onRemove(); }}
          onCancel={() => setDragConfirm(null)}
        />
      )}

      {/* Toast */}
      <HierarchyToast toast={toast} />
    </DndContext>
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
  panelContainer: {
    display: 'flex',
    gap: '16px',
    flex: 1,
    minHeight: 0,
  },
  leftPanel: {
    width: '320px',
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px',
    borderBottom: '1px solid #e2e8f0',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: '#1e293b',
    backgroundColor: 'transparent',
  },
  filterWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderBottom: '1px solid #f1f5f9',
  },
  selectWrap: {
    position: 'relative',
    flex: 1,
  },
  filterSelect: {
    width: '100%',
    padding: '6px 28px 6px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    fontSize: '13px',
    fontWeight: '500',
    color: '#475569',
    cursor: 'pointer',
    appearance: 'none',
    outline: 'none',
  },
  selectChevron: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: '#94a3b8',
  },
  countLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  userListScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  },
  userRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    touchAction: 'none',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.1s ease',
  },
  rowDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: '5px',
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  rowTopLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rowName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  rowBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#ffffff',
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  rowEmail: {
    fontSize: '12px',
    color: '#94a3b8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowParent: {
    fontSize: '11px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  rightPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  rightPanelTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b',
  },
  treeScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    padding: '24px 16px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  dragOverlay: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    width: '260px',
    pointerEvents: 'none',
  },
  dragOverlayName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dragOverlayBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#ffffff',
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  regionSection: {
    padding: '12px 14px 8px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  regionSectionLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#1e3a8a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  regionDragRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: '8px',
    cursor: 'grab',
    touchAction: 'none',
  },
  regionDragName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  regionDragHint: {
    fontSize: '10px',
    color: '#94a3b8',
    fontWeight: '500',
  },
};

export default HierarchyTwoPanel;
