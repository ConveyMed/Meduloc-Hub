import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePosts } from '../context/PostsContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useAIChat } from '../context/AIChatContext';
import { useChat } from '../context/ChatContext';
import { supabase } from '../config/supabase';

// Icons
const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const LibraryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const AIIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
    <circle cx="8" cy="14" r="1" />
    <circle cx="16" cy="14" r="1" />
  </svg>
);

const TrainingIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const ResourcesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const FormsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="12" y2="16" />
  </svg>
);

const CreateIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const UpdatesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const DownloadsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const DirectoryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const FieldIntelIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);


const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const BottomNav = () => {
  const [expanded, setExpanded] = useState(false);
  const [showNotAllowed, setShowNotAllowed] = useState(false);
  const [chatEnabledByAdmin, setChatEnabledByAdmin] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { openCreateModal } = usePosts();
  const { userProfile } = useAuth();
  const { totalUnread } = useNotifications();
  const { openChat } = useAIChat();
  const { totalUnread: chatUnread } = useChat();

  // Check if user can create posts (admin or editor)
  const canCreatePosts = userProfile?.role === 'admin' || userProfile?.role === 'editor' || userProfile?.is_admin === true;

  // Check admin chat_mode setting
  useEffect(() => {
    const checkChatSetting = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'chat_mode')
          .single();
        // chat_mode can be "off" or "all_members"
        setChatEnabledByAdmin(data?.value !== '"off"' && data?.value !== 'off');
      } catch {
        // If setting doesn't exist, default to enabled
        setChatEnabledByAdmin(true);
      }
    };
    checkChatSetting();
  }, []);

  const handleCreateClick = () => {
    setExpanded(false); // Close expanded nav
    if (canCreatePosts) {
      openCreateModal();
    } else {
      setShowNotAllowed(true);
    }
  };

  // Get visibility settings from localStorage
  const getChatVisible = () => localStorage.getItem('showChat') !== 'false';
  const getDirectoryVisible = () => localStorage.getItem('showDirectory') !== 'false';
  const getAIShortcutVisible = () => localStorage.getItem('showAIShortcut') !== 'false';
  const getFieldIntelVisible = () => localStorage.getItem('showFieldIntel') !== 'false';
  const getUpdatesVisible = () => localStorage.getItem('showUpdates') !== 'false';
  const [showChat, setShowChat] = useState(getChatVisible);
  const [showDirectory, setShowDirectory] = useState(getDirectoryVisible);
  const [showAIShortcut, setShowAIShortcut] = useState(getAIShortcutVisible);
  const [showFieldIntel, setShowFieldIntel] = useState(getFieldIntelVisible);
  const [showUpdates, setShowUpdates] = useState(getUpdatesVisible);

  // Listen for storage changes (from Profile page)
  useEffect(() => {
    const handleStorage = () => {
      setShowChat(getChatVisible());
      setShowDirectory(getDirectoryVisible());
      setShowAIShortcut(getAIShortcutVisible());
      setShowFieldIntel(getFieldIntelVisible());
      setShowUpdates(getUpdatesVisible());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('navVisibilityChange', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('navVisibilityChange', handleStorage);
    };
  }, []);

  // Main row items (shown in collapsed, becomes top when expanded)
  const mainItems = [
    { id: 'home', icon: HomeIcon, label: 'Home', path: '/home' },
    { id: 'library', icon: LibraryIcon, label: 'Library', path: '/library' },
    { id: 'create', icon: CreateIcon, label: 'Create', path: '/create', isCreate: true },
    { id: 'training', icon: TrainingIcon, label: 'Training', path: '/training' },
  ];

  // Secondary row items (only shown when expanded) - Profile always last
  const buildSecondaryItems = () => {
    const items = [];

    items.push({ id: 'forms', icon: FormsIcon, label: 'Forms', path: '/forms' });
    if (showAIShortcut) {
      items.push({ id: 'ai', icon: AIIcon, label: 'AI Agent', path: '/ai-agent' });
    }
    items.push({ id: 'downloads', icon: DownloadsIcon, label: 'Downloads', path: '/downloads' });

    if (showDirectory) {
      items.push({ id: 'directory', icon: DirectoryIcon, label: 'Directory', path: '/directory' });
    }
    // Show chat only if enabled by admin AND user preference
    if (showChat && chatEnabledByAdmin) {
      items.push({ id: 'chat', icon: ChatIcon, label: 'Chat', path: '/chat', hasBadge: chatUnread > 0 });
    }
    // Profile always last
    items.push({ id: 'profile', icon: ProfileIcon, label: 'Profile', path: '/profile' });

    return items;
  };

  const secondaryItems = buildSecondaryItems();

  const getActiveTab = () => {
    const path = location.pathname;
    const allTabs = [...mainItems, ...secondaryItems, { id: 'updates', path: '/updates' }];
    const tab = allTabs.find(t => t.path === path);
    return tab ? tab.id : 'home';
  };

  const activeTab = getActiveTab();

  const handleTabPress = (tab) => {
    setExpanded(false); // Close expanded nav
    if (tab.id === 'ai') {
      openChat();
    } else {
      navigate(tab.path);
    }
  };

  const renderTab = (tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;

    if (tab.isCreate) {
      return (
        <div key={tab.id} style={styles.createBtnWrapper}>
          <button
            style={styles.createBtn}
            onClick={handleCreateClick}
          >
            <Icon />
          </button>
        </div>
      );
    }

    return (
      <button
        key={tab.id}
        style={{
          ...styles.navBtn,
          ...(isActive ? styles.navBtnActive : {}),
        }}
        onClick={() => handleTabPress(tab)}
      >
        <div style={{
          ...styles.iconContainer,
          ...(isActive ? styles.iconContainerActive : {}),
          position: 'relative',
        }}>
          <Icon />
          {tab.hasBadge && (
            <div style={styles.badge} />
          )}
        </div>
        <span style={{
          ...styles.navLabel,
          ...(isActive ? styles.navLabelActive : {}),
        }}>{tab.label}</span>
      </button>
    );
  };

  // More/Updates button for collapsed state
  const renderMoreButton = () => {
    // Show badge on More if there are unread chats (and chat is enabled)
    const hasUnreadChats = chatUnread > 0 && showChat && chatEnabledByAdmin;

    return (
      <button
        style={styles.navBtn}
        onClick={() => setExpanded(true)}
      >
        <div style={{ ...styles.iconContainer, position: 'relative' }}>
          <ChevronUpIcon />
          {hasUnreadChats && <div style={styles.badge} />}
        </div>
        <span style={styles.navLabel}>More</span>
      </button>
    );
  };

  // Updates button for expanded state (replaces More in top row)
  const renderUpdatesButton = () => {
    const isActive = activeTab === 'updates';

    return (
      <button
        style={{
          ...styles.navBtn,
          ...(isActive ? styles.navBtnActive : {}),
        }}
        onClick={() => { setExpanded(false); navigate('/updates'); }}
      >
        <div style={{
          ...styles.iconContainer,
          ...(isActive ? styles.iconContainerActive : {}),
          position: 'relative',
        }}>
          <UpdatesIcon />
          {totalUnread > 0 && <div style={styles.badge} />}
        </div>
        <span style={{
          ...styles.navLabel,
          ...(isActive ? styles.navLabelActive : {}),
        }}>Updates</span>
      </button>
    );
  };

  return (
    <>
      <nav style={styles.bottomNav}>
        {expanded ? (
          <>
            {/* Close button - thin full-width bar at top */}
            <button
              style={styles.closeBar}
              onClick={() => setExpanded(false)}
            >
              <ChevronDownIcon />
              <span style={styles.closeLabel}>Close</span>
            </button>

            {/* Top row (main items + Updates if enabled) */}
            <div style={styles.navRow}>
              {mainItems.map(renderTab)}
              {showUpdates && renderUpdatesButton()}
            </div>

            {/* Bottom row (secondary items) */}
            <div style={styles.navRow}>
              {secondaryItems.map(renderTab)}
            </div>
          </>
        ) : (
          /* Collapsed: single row with More button */
          <div style={styles.navRow}>
            {mainItems.map(renderTab)}
            {renderMoreButton()}
          </div>
        )}
      </nav>

      {/* Not Allowed Modal */}
      {showNotAllowed && (
        <div style={styles.modalOverlay} onClick={() => setShowNotAllowed(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 style={styles.modalTitle}>Cannot Create Posts</h3>
            <p style={styles.modalText}>Only Editors and Administrators are able to post content.</p>
            <button style={styles.modalBtn} onClick={() => setShowNotAllowed(false)}>
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  bottomNav: {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    width: '100%',
    maxWidth: '100%',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    borderRadius: '0',
    padding: '8px 4px',
    paddingBottom: 'calc(var(--safe-area-bottom, 0px) - 12px)',
    zIndex: 1000,
    boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  closeBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '6px 0',
    backgroundColor: '#f8fafc',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    color: '#64748b',
    marginBottom: '4px',
    transition: 'all 0.2s ease',
  },
  closeLabel: {
    fontSize: '12px',
    fontWeight: '500',
    letterSpacing: '0.3px',
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
  },
  navBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    padding: '6px 0',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    transition: 'all 0.2s ease',
    flex: '1 1 0',
    minWidth: 0,
  },
  navBtnActive: {
    color: '#004B87',
  },
  iconContainer: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    transition: 'all 0.2s ease',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(30, 64, 175, 0.1)',
  },
  createBtnWrapper: {
    flex: '1 1 0',
    minWidth: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtn: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    backgroundColor: '#004B87',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)',
    transition: 'all 0.2s ease',
  },
  navLabel: {
    fontSize: '10px',
    fontWeight: '500',
    color: 'inherit',
  },
  navLabelActive: {
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: '0px',
    right: '0px',
    width: '10px',
    height: '10px',
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    border: '2px solid #ffffff',
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
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '320px',
    width: '100%',
    textAlign: 'center',
  },
  modalIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  modalText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 20px 0',
    lineHeight: '1.5',
  },
  modalBtn: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#004B87',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default BottomNav;
