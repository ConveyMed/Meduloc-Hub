import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationsContext';

// Icons
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

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

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Notification Card
const NotificationCard = ({ notification, onEdit, onDelete, onViewRsvp }) => {
  const isEvent = notification.type === 'event';
  const formattedDate = new Date(notification.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{
          ...styles.typeBadge,
          backgroundColor: isEvent ? '#fef3c7' : '#dbeafe',
          color: isEvent ? '#92400e' : '#004B87',
        }}>
          {isEvent ? <CalendarIcon /> : <BellIcon />}
          <span>{isEvent ? 'Event' : 'Update'}</span>
        </div>
        <span style={styles.cardDate}>{formattedDate}</span>
      </div>

      <h3 style={styles.cardTitle}>{notification.title}</h3>

      {notification.body && (
        <p style={styles.cardBody}>{notification.body}</p>
      )}

      {notification.link_url && (
        <div style={styles.linkPreview}>
          Link: {notification.link_label || notification.link_url}
        </div>
      )}

      {notification.enable_rsvp && (
        <div style={styles.rsvpInfo}>
          <span style={styles.rsvpLabel}>Yes/No Response</span>
          {notification.rsvp_question && (
            <span style={styles.rsvpQuestion}>"{notification.rsvp_question}"</span>
          )}
        </div>
      )}

      <div style={styles.cardActions}>
        {notification.enable_rsvp && (
          <button style={styles.rsvpBtn} onClick={onViewRsvp}>
            <UsersIcon />
            <span>View Responses</span>
          </button>
        )}
        <button style={styles.iconBtn} onClick={onEdit}>
          <EditIcon />
        </button>
        <button style={styles.iconBtn} onClick={onDelete}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

// Create/Edit Modal
const NotificationModal = ({ isOpen, onClose, onSave, notification, type }) => {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    link_url: '',
    link_label: '',
    enable_rsvp: false,
    rsvp_question: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (notification) {
        setFormData({
          title: notification.title || '',
          body: notification.body || '',
          link_url: notification.link_url || '',
          link_label: notification.link_label || '',
          enable_rsvp: notification.enable_rsvp || false,
          rsvp_question: notification.rsvp_question || '',
        });
      } else {
        setFormData({
          title: '',
          body: '',
          link_url: '',
          link_label: '',
          enable_rsvp: false,
          rsvp_question: '',
        });
      }
    }
  }, [isOpen, notification]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...formData,
        type: notification?.type || type,
      });
      onClose();
    } catch (err) {
      console.error('Error saving:', err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isEvent = (notification?.type || type) === 'event';

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          <CloseIcon />
        </button>

        <h2 style={styles.modalTitle}>
          {notification ? 'Edit' : 'Create'} {isEvent ? 'Event' : 'Update'}
        </h2>

        <p style={styles.pushWarning}>This will send a push notification to all users</p>

        <div style={styles.formGroup}>
          <label style={styles.label}>Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => handleChange('title', e.target.value)}
            style={styles.input}
            placeholder={isEvent ? 'Event title' : 'Update title'}
            autoFocus
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Body</label>
          <textarea
            value={formData.body}
            onChange={e => handleChange('body', e.target.value)}
            style={styles.textarea}
            placeholder="Enter the notification content..."
            rows={4}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Link URL</label>
          <input
            type="url"
            value={formData.link_url}
            onChange={e => handleChange('link_url', e.target.value)}
            style={styles.input}
            placeholder="https://..."
          />
          {formData.link_url && (
            <input
              type="text"
              value={formData.link_label}
              onChange={e => handleChange('link_label', e.target.value)}
              style={{ ...styles.input, marginTop: '8px' }}
              placeholder="Link label (e.g., 'Learn More')"
            />
          )}
        </div>

        <div style={styles.toggleGroup}>
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>Request a Yes or No Response</span>
            <button
              style={{
                ...styles.toggle,
                backgroundColor: formData.enable_rsvp ? '#004B87' : '#e2e8f0',
              }}
              onClick={() => handleChange('enable_rsvp', !formData.enable_rsvp)}
            >
              <div style={{
                ...styles.toggleKnob,
                transform: formData.enable_rsvp ? 'translateX(20px)' : 'translateX(0)',
              }} />
            </button>
          </div>

          {formData.enable_rsvp && (
            <div style={{ ...styles.formGroup, marginTop: '12px' }}>
              <label style={styles.label}>Add a question they are answering with a yes or no</label>
              <input
                type="text"
                value={formData.rsvp_question}
                onChange={e => handleChange('rsvp_question', e.target.value)}
                style={styles.input}
                placeholder="e.g., Will you be attending?"
              />
            </div>
          )}
        </div>

        <button
          style={{
            ...styles.saveBtn,
            opacity: !formData.title.trim() || saving ? 0.5 : 1,
          }}
          onClick={handleSave}
          disabled={!formData.title.trim() || saving}
        >
          {saving ? 'Saving...' : (notification ? 'Update' : 'Create')}
        </button>
      </div>
    </div>
  );
};

// RSVP Viewer Modal
const RsvpModal = ({ isOpen, onClose, notification, responses }) => {
  if (!isOpen || !notification) return null;

  const yesResponses = responses.filter(r => r.rsvp_response === 'yes');
  const noResponses = responses.filter(r => r.rsvp_response === 'no');

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          <CloseIcon />
        </button>

        <h2 style={styles.modalTitle}>RSVP Responses</h2>
        <p style={styles.rsvpEventTitle}>{notification.title}</p>

        <div style={styles.rsvpSummary}>
          <div style={styles.rsvpStat}>
            <span style={{ ...styles.rsvpStatCount, color: '#16a34a' }}>{yesResponses.length}</span>
            <span style={styles.rsvpStatLabel}>Yes</span>
          </div>
          <div style={styles.rsvpStat}>
            <span style={{ ...styles.rsvpStatCount, color: '#dc2626' }}>{noResponses.length}</span>
            <span style={styles.rsvpStatLabel}>No</span>
          </div>
        </div>

        {responses.length > 0 ? (
          <div style={styles.responsesList}>
            {responses.map(response => (
              <div key={response.id} style={styles.responseItem}>
                <div style={styles.responseUser}>
                  {response.users?.profile_image_url ? (
                    <img
                      src={response.users.profile_image_url}
                      alt=""
                      style={styles.responseAvatar}
                    />
                  ) : (
                    <div style={styles.responseAvatarPlaceholder}>
                      {response.users?.first_name?.[0] || '?'}
                    </div>
                  )}
                  <div>
                    <p style={styles.responseName}>
                      {response.users?.first_name} {response.users?.last_name}
                    </p>
                    <p style={styles.responseEmail}>{response.users?.email}</p>
                  </div>
                </div>
                <div style={{
                  ...styles.responseStatus,
                  backgroundColor: response.rsvp_response === 'yes' ? '#dcfce7' : '#fee2e2',
                  color: response.rsvp_response === 'yes' ? '#16a34a' : '#dc2626',
                }}>
                  {response.rsvp_response === 'yes' ? <CheckIcon /> : <XIcon />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noResponses}>No responses yet</p>
        )}
      </div>
    </div>
  );
};

// Main Component
const ManageUpdates = () => {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    createNotification,
    updateNotification,
    deleteNotification,
    getRsvpResponses,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('update');
  const [modal, setModal] = useState({ open: false, notification: null, type: null });
  const [rsvpModal, setRsvpModal] = useState({ open: false, notification: null, responses: [] });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, notification: null });

  const filteredNotifications = notifications.filter(n => n.type === activeTab);

  const handleSave = async (data) => {
    if (modal.notification) {
      await updateNotification(modal.notification.id, data);
    } else {
      await createNotification(data);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.notification) {
      try {
        await deleteNotification(deleteConfirm.notification.id);
        setDeleteConfirm({ open: false, notification: null });
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const handleViewRsvp = async (notification) => {
    const responses = await getRsvpResponses(notification.id);
    setRsvpModal({ open: true, notification, responses });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button style={styles.backBtn} onClick={() => navigate('/profile')}>
            <BackIcon />
          </button>
          <h1 style={styles.headerTitle}>Manage Updates</h1>
          <div style={{ width: 40 }} />
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
                ...(activeTab === 'update' ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab('update')}
            >
              <BellIcon />
              <span>Updates</span>
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'event' ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab('event')}
            >
              <CalendarIcon />
              <span>Events</span>
            </button>
          </div>

          {/* Create Button */}
          <button
            style={styles.createBtn}
            onClick={() => setModal({ open: true, notification: null, type: activeTab })}
          >
            <PlusIcon />
            <span>Create {activeTab === 'update' ? 'Update' : 'Event'}</span>
          </button>

          {/* Notifications List */}
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : filteredNotifications.length > 0 ? (
            <div style={styles.list}>
              {filteredNotifications.map(notification => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onEdit={() => setModal({ open: true, notification, type: notification.type })}
                  onDelete={() => setDeleteConfirm({ open: true, notification })}
                  onViewRsvp={() => handleViewRsvp(notification)}
                />
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>
                No {activeTab === 'update' ? 'updates' : 'events'} yet.
              </p>
            </div>
          )}

          <div style={{ height: '100px' }} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <NotificationModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, notification: null, type: null })}
        onSave={handleSave}
        notification={modal.notification}
        type={modal.type}
      />

      {/* RSVP Modal */}
      <RsvpModal
        isOpen={rsvpModal.open}
        onClose={() => setRsvpModal({ open: false, notification: null, responses: [] })}
        notification={rsvpModal.notification}
        responses={rsvpModal.responses}
      />

      {/* Delete Confirmation */}
      {deleteConfirm.open && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm({ open: false, notification: null })}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Delete {deleteConfirm.notification?.type === 'event' ? 'Event' : 'Update'}?</h2>
            <p style={styles.deleteText}>
              Are you sure you want to delete "{deleteConfirm.notification?.title}"?
              This action cannot be undone.
            </p>
            <div style={styles.deleteActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setDeleteConfirm({ open: false, notification: null })}
              >
                Cancel
              </button>
              <button style={styles.deleteBtn} onClick={handleDelete}>
                Delete
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
    justifyContent: 'space-between',
    padding: '12px 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  headerTitle: {
    color: '#004B87',
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    textAlign: 'center',
  },
  headerBorder: {
    maxWidth: '600px',
    margin: '0 auto',
    height: '2px',
    backgroundColor: 'rgba(30, 64, 175, 0.15)',
    borderRadius: '1px',
  },
  backBtn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#004B87',
    borderRadius: '10px',
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
    marginBottom: '16px',
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
  },
  tabActive: {
    backgroundColor: '#004B87',
    borderColor: '#004B87',
    color: '#ffffff',
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    backgroundColor: '#004B87',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  typeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  cardDate: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  cardBody: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 12px 0',
    lineHeight: '1.5',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
  },
  linkPreview: {
    fontSize: '13px',
    color: '#004B87',
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  rsvpInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  rsvpLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#16a34a',
    padding: '4px 8px',
    backgroundColor: '#dcfce7',
    borderRadius: '6px',
  },
  rsvpQuestion: {
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
  },
  rsvpBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#004B87',
    cursor: 'pointer',
    marginRight: 'auto',
  },
  iconBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#64748b',
  },
  loading: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#64748b',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '15px',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 12px 0',
    paddingRight: '40px',
  },
  pushWarning: {
    fontSize: '12px',
    color: '#dc2626',
    margin: '0 0 16px 0',
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  toggleGroup: {
    marginBottom: '16px',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
  },
  toggleLabel: {
    fontSize: '14px',
    color: '#1e293b',
  },
  toggle: {
    width: '48px',
    height: '28px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s ease',
    padding: 0,
  },
  toggleKnob: {
    width: '24px',
    height: '24px',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: '2px',
    left: '2px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.2s ease',
  },
  saveBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#004B87',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  deleteText: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: '0 0 20px 0',
  },
  deleteActions: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  // RSVP Modal styles
  rsvpEventTitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px 0',
  },
  rsvpSummary: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
  },
  rsvpStat: {
    flex: 1,
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  rsvpStatCount: {
    display: 'block',
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  rsvpStatLabel: {
    fontSize: '13px',
    color: '#64748b',
  },
  responsesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  responseItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
  },
  responseUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  responseAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  responseAvatarPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
  },
  responseName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    margin: 0,
  },
  responseEmail: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  responseStatus: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResponses: {
    textAlign: 'center',
    padding: '20px',
    color: '#94a3b8',
    fontSize: '14px',
  },
};

export default ManageUpdates;
