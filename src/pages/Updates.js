import React, { useState, useRef } from 'react';
import { useNotifications } from '../context/NotificationsContext';
import { openInAppBrowser } from '../utils/browser';

// Icons
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ArchiveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

// Swipeable Notification Card
const NotificationCard = ({
  notification,
  userStatus,
  onArchive,
  onUnarchive,
  onRsvp,
  onRead,
  isArchived,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef(null);

  const isRead = userStatus?.is_read === true;
  const rsvpResponse = userStatus?.rsvp_response;
  const isEvent = notification.type === 'event';

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    // Only allow left swipe for archive, right for unarchive
    if (isArchived) {
      setSwipeX(Math.max(0, Math.min(diff, 100)));
    } else {
      setSwipeX(Math.min(0, Math.max(diff, -100)));
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (isArchived && swipeX > 60) {
      onUnarchive();
    } else if (!isArchived && swipeX < -60) {
      onArchive();
    }
    setSwipeX(0);
  };

  const handleExpand = () => {
    setExpanded(!expanded);
    if (!isRead && !expanded) {
      onRead();
    }
  };

  const formattedDate = new Date(notification.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const handleLinkClick = (e) => {
    e.stopPropagation();
    openInAppBrowser(notification.link_url);
  };

  return (
    <div style={styles.cardWrapper}>
      {/* Swipe background */}
      <div style={{
        ...styles.swipeBackground,
        backgroundColor: isArchived ? '#dcfce7' : '#fee2e2',
        justifyContent: isArchived ? 'flex-start' : 'flex-end',
      }}>
        {isArchived ? (
          <div style={styles.swipeAction}>
            <UndoIcon />
            <span>Restore</span>
          </div>
        ) : (
          <div style={styles.swipeAction}>
            <ArchiveIcon />
            <span>Archive</span>
          </div>
        )}
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        style={{
          ...styles.card,
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease',
          borderLeft: isRead ? 'none' : '4px solid #004B87',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleExpand}
      >
        <div style={styles.cardHeader}>
          <div style={{
            ...styles.typeBadge,
            backgroundColor: isEvent ? '#fef3c7' : '#dbeafe',
            color: isEvent ? '#92400e' : '#004B87',
          }}>
            {isEvent ? <CalendarIcon /> : <BellIcon />}
          </div>
          <span style={styles.cardDate}>{formattedDate}</span>
          {!isRead && <div style={styles.unreadDot} />}
        </div>

        <h3 style={{
          ...styles.cardTitle,
          fontWeight: isRead ? '500' : '600',
        }}>
          {notification.title}
        </h3>

        {notification.body && (
          <p style={{
            ...styles.cardBody,
            ...(expanded ? {} : styles.cardBodyCollapsed),
          }}>
            {notification.body}
          </p>
        )}

        {expanded && (
          <>
            {notification.link_url && (
              <button style={styles.linkBtn} onClick={handleLinkClick}>
                <ExternalLinkIcon />
                <span>{notification.link_label || 'View Link'}</span>
              </button>
            )}

            {notification.enable_rsvp && (
              <div style={styles.rsvpSection}>
                <p style={styles.rsvpQuestion}>
                  {notification.rsvp_question || 'Please respond:'}
                </p>
                <div style={styles.rsvpButtons}>
                  <button
                    style={{
                      ...styles.rsvpBtn,
                      ...(rsvpResponse === 'yes' ? styles.rsvpBtnYesActive : styles.rsvpBtnYes),
                    }}
                    onClick={(e) => { e.stopPropagation(); onRsvp('yes'); }}
                  >
                    Yes
                  </button>
                  <button
                    style={{
                      ...styles.rsvpBtn,
                      ...(rsvpResponse === 'no' ? styles.rsvpBtnNoActive : styles.rsvpBtnNo),
                    }}
                    onClick={(e) => { e.stopPropagation(); onRsvp('no'); }}
                  >
                    No
                  </button>
                </div>
                {rsvpResponse && (
                  <p style={styles.rsvpConfirm}>
                    You responded: <strong>{rsvpResponse === 'yes' ? 'Yes' : 'No'}</strong>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div style={{
          ...styles.expandIndicator,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          <ChevronDownIcon />
        </div>
      </div>
    </div>
  );
};

// Main Component
const Updates = () => {
  const {
    loading,
    unreadCounts,
    getFilteredNotifications,
    getNotificationStatus,
    markAsRead,
    archiveNotification,
    unarchiveNotification,
    submitRsvp,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('update');
  const [showArchived, setShowArchived] = useState(false);

  const notifications = getFilteredNotifications(activeTab, showArchived);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.headerTitle}>Notifications</h1>
        </div>
        <div style={styles.headerBorder} />
      </header>

      <div style={styles.contentContainer}>
        <div style={styles.content}>
          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'update' && !showArchived ? styles.tabActive : {}),
              }}
              onClick={() => { setActiveTab('update'); setShowArchived(false); }}
            >
              <BellIcon />
              <span>Updates</span>
              {unreadCounts.updates > 0 && (
                <span style={styles.tabBadge}>{unreadCounts.updates}</span>
              )}
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'event' && !showArchived ? styles.tabActive : {}),
              }}
              onClick={() => { setActiveTab('event'); setShowArchived(false); }}
            >
              <CalendarIcon />
              <span>Events</span>
              {unreadCounts.events > 0 && (
                <span style={styles.tabBadge}>{unreadCounts.events}</span>
              )}
            </button>
          </div>

          {/* Archived Toggle */}
          <button
            style={{
              ...styles.archivedToggle,
              backgroundColor: showArchived ? '#f1f5f9' : 'transparent',
            }}
            onClick={() => setShowArchived(!showArchived)}
          >
            <ArchiveIcon />
            <span>{showArchived ? 'Viewing Archived' : 'View Archived'}</span>
          </button>

          {/* Notifications List */}
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : notifications.length > 0 ? (
            <div style={styles.list}>
              {notifications.map(notification => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  userStatus={getNotificationStatus(notification.id)}
                  onArchive={() => archiveNotification(notification.id)}
                  onUnarchive={() => unarchiveNotification(notification.id)}
                  onRsvp={(response) => submitRsvp(notification.id, response)}
                  onRead={() => markAsRead(notification.id)}
                  isArchived={showArchived}
                />
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                {activeTab === 'update' ? <BellIcon /> : <CalendarIcon />}
              </div>
              <p style={styles.emptyText}>
                {showArchived
                  ? `No archived ${activeTab === 'update' ? 'updates' : 'events'}`
                  : `No ${activeTab === 'update' ? 'updates' : 'events'} yet`}
              </p>
              {showArchived && (
                <p style={styles.emptySubtext}>
                  Swipe left on items to archive them
                </p>
              )}
            </div>
          )}

          {/* Bottom padding for nav */}
          <div style={{ height: '120px' }} />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100%',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    width: '100%',
    backgroundColor: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  headerTitle: {
    color: '#004B87',
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
  },
  headerBorder: {
    maxWidth: '600px',
    margin: '0 auto',
    height: '2px',
    backgroundColor: 'rgba(30, 64, 175, 0.15)',
    borderRadius: '1px',
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    overflow: 'auto',
  },
  content: {
    width: '100%',
    maxWidth: '600px',
    padding: '16px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#004B87',
    borderColor: '#004B87',
    color: '#ffffff',
  },
  tabBadge: {
    minWidth: '20px',
    height: '20px',
    padding: '0 6px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archivedToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardWrapper: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  swipeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
  },
  swipeAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    position: 'relative',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  typeBadge: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDate: {
    fontSize: '12px',
    color: '#94a3b8',
    flex: 1,
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#004B87',
  },
  cardTitle: {
    fontSize: '16px',
    color: '#1e293b',
    margin: '0 0 8px 0',
    paddingRight: '24px',
  },
  cardBody: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  cardBodyCollapsed: {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  expandIndicator: {
    position: 'absolute',
    top: '16px',
    right: '12px',
    color: '#94a3b8',
    transition: 'transform 0.2s ease',
  },
  linkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#004B87',
    cursor: 'pointer',
    marginTop: '12px',
    width: '100%',
    justifyContent: 'center',
  },
  rsvpSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f1f5f9',
  },
  rsvpQuestion: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  rsvpButtons: {
    display: 'flex',
    gap: '12px',
  },
  rsvpBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  rsvpBtnYes: {
    backgroundColor: '#f0fdf4',
    border: '2px solid #bbf7d0',
    color: '#16a34a',
  },
  rsvpBtnYesActive: {
    backgroundColor: '#16a34a',
    border: '2px solid #16a34a',
    color: '#ffffff',
  },
  rsvpBtnNo: {
    backgroundColor: '#fef2f2',
    border: '2px solid #fecaca',
    color: '#dc2626',
  },
  rsvpBtnNoActive: {
    backgroundColor: '#dc2626',
    border: '2px solid #dc2626',
    color: '#ffffff',
  },
  rsvpConfirm: {
    fontSize: '13px',
    color: '#64748b',
    margin: '12px 0 0 0',
    textAlign: 'center',
  },
  loading: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#64748b',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    color: '#94a3b8',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '16px',
    fontWeight: '500',
    margin: 0,
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: '13px',
    margin: '8px 0 0 0',
  },
};

export default Updates;
