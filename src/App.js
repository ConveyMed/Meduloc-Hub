import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PostsProvider } from './context/PostsContext';
import { ContentProvider } from './context/ContentContext';
import { DownloadsProvider } from './context/DownloadsContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { OfflineProvider, useOffline } from './context/OfflineContext';
import { ActivityNotificationsProvider } from './context/ActivityNotificationsContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import {
  initializeOneSignalSDK,
  registerDeviceForUser,
  checkAndRequestPermission
} from './services/onesignal';
import { supabase } from './config/supabase';
import Login from './onboarding/Login';
import SignUp from './onboarding/SignUp';
import EmailConfirmation from './onboarding/EmailConfirmation';
import EmailConfirmed from './pages/EmailConfirmed';
import ForgotPassword from './onboarding/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProfileComplete from './onboarding/ProfileComplete';
import Home from './pages/Home';
import Profile from './pages/Profile';
import NotificationSettings from './pages/NotificationSettings';
import EditProfile from './pages/EditProfile';
import ManageUsers from './pages/ManageUsers';
import Directory from './pages/Directory';
import DirectoryPermissions from './pages/DirectoryPermissions';
import Library from './pages/Library';
import Training from './pages/Training';
import ManageLibrary from './pages/ManageLibrary';
import ManageTraining from './pages/ManageTraining';
import Forms from './pages/Forms';
import ManageForms from './pages/ManageForms';
import Resources from './pages/Resources';
import Updates from './pages/Updates';
import ManageUpdates from './pages/ManageUpdates';
import ManageAI from './pages/ManageAI';
import Downloads from './pages/Downloads';
import FileViewer from './pages/FileViewer';
import Chat from './pages/Chat';
import ChatConversation from './pages/ChatConversation';
import ManageChat from './pages/ManageChat';
import ManageAnalytics from './pages/ManageAnalytics';
import { TermsAndConditions, PrivacyPolicy, DeleteAccount } from './pages/LegalSupport';
import BottomNav from './components/BottomNav';
import AIChatPanel from './components/AIChatPanel';
import { FieldIntelProvider } from './field-intel/FieldIntelContext';
import FieldIntelZone from './field-intel/FieldIntelZone';
import FieldIntelPlaceholder from './field-intel/FieldIntelPlaceholder';
import CSVImport from './field-intel/admin/CSVImport';
import SettingsHub from './field-intel/admin/SettingsHub';
import RegionManager from './field-intel/admin/RegionManager';
import RegionAccountAssigner from './field-intel/admin/RegionAccountAssigner';
import HierarchyManager from './field-intel/admin/HierarchyManager';
import CustomFieldManager from './field-intel/admin/CustomFieldManager';
import DelegationScreen from './field-intel/DelegationScreen';
import SurgeonList from './field-intel/SurgeonList';
import SurgeonDossier from './field-intel/SurgeonDossier';
import CallLogHistory from './field-intel/CallLogHistory';
import CallLogEntry from './field-intel/CallLogEntry';
import LeadQueue from './field-intel/LeadQueue';
import LeadSubmit from './field-intel/LeadSubmit';
import DrillDownView from './field-intel/DrillDownView';
import RepDashboard from './field-intel/dashboards/RepDashboard';
import ManagerDashboard from './field-intel/dashboards/ManagerDashboard';
import VPDashboard from './field-intel/dashboards/VPDashboard';
import AdminDashboard from './field-intel/dashboards/AdminDashboard';
import ActivityFeed from './field-intel/dashboards/ActivityFeed';
import { useFieldIntel } from './field-intel/FieldIntelContext';
import OfflineLoginScreen from './components/OfflineLoginScreen';
import OfflineScreen from './components/OfflineScreen';
import { AIChatProvider } from './context/AIChatContext';
import { ChatProvider } from './context/ChatContext';
import { AnalyticsProvider } from './context/AnalyticsContext';
import CreatePostModal from './components/CreatePostModal';
import OrganizationGate from './pages/OrganizationGate';
import './App.css';

// Routes that should NOT show bottom nav
const noNavRoutes = ['/', '/signup', '/confirm-email', '/email-confirmed', '/forgot-password', '/reset-password', '/profile-complete', '/field-intel'];

// ============================================
// OneSignal Components
// ============================================

/**
 * OneSignalInitializer - Initialize SDK once on app start
 * Runs before auth, just sets up the SDK
 */
const OneSignalInitializer = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initializeOneSignalSDK();
    }
  }, []);

  return null;
};

/**
 * DeviceRegistration - Register device after user authenticates
 * Re-runs whenever user changes
 */
const DeviceRegistration = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    // Register device for push notifications
    registerDeviceForUser(user.id);
  }, [user]);

  return null;
};

/**
 * ReturningUserPermissions - Check permissions for returning users
 * Handles: new device, reinstall, skipped onboarding on different device
 */
const ReturningUserPermissions = () => {
  const { user, isProfileComplete } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user || !isProfileComplete || hasChecked) return;

    const checkPermissions = async () => {
      try {
        // Check if user has completed profile (meaning they went through onboarding)
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!userData) {
          console.log('[Permissions] User not found in users table yet');
          setHasChecked(true);
          return;
        }

        // User exists and profile is complete - they're a returning user
        // Check and request permission if needed
        console.log('[Permissions] Checking permissions for returning user...');
        await checkAndRequestPermission(user.id);
        setHasChecked(true);

      } catch (err) {
        console.error('[Permissions] Error:', err);
        setHasChecked(true);
      }
    };

    // Delay to let app stabilize
    const timer = setTimeout(checkPermissions, 2000);
    return () => clearTimeout(timer);
  }, [user, isProfileComplete, hasChecked]);

  return null;
};

// App shell wrapper - fixed shell with scrollable content area
const AppShell = ({ children, showNav = false }) => {
  return (
    <div className="app-shell">
      <div className="app-content">
        {children}
      </div>
      {showNav && <BottomNav />}
      {showNav && <CreatePostModal />}
    </div>
  );
};

// Role-based dashboard wrapper: picks VP or Admin dashboard based on role
const RoleDashboard = () => {
  const { role } = useFieldIntel();
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'vp') return <VPDashboard />;
  if (role === 'manager') return <ManagerDashboard />;
  if (role === 'rep') return <RepDashboard />;
  return <FieldIntelPlaceholder label="Dashboard" />;
};

// Routes allowed when offline (after auth)
const offlineAllowedRoutes = ['/downloads', '/view-file'];

function AppContent() {
  const { loading, isAuthenticated, isProfileComplete, refreshProfile } = useAuth();
  const { isOffline } = useOffline();
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [orgCodeVerified, setOrgCodeVerified] = useState(() =>
    localStorage.getItem('org_code_verified') !== 'false'
  );

  // Check for signup confirmation in URL hash and redirect to email-confirmed page
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=signup') && location.pathname !== '/email-confirmed') {
      // Clear the hash and redirect to email-confirmed
      window.history.replaceState(null, '', window.location.pathname);
      navigate('/email-confirmed', { replace: true });
    }
    // Check for password recovery token and redirect to reset-password page
    if (hash && hash.includes('type=recovery') && location.pathname !== '/reset-password') {
      // Clear the hash and redirect to reset-password
      window.history.replaceState(null, '', window.location.pathname);
      navigate('/reset-password', { replace: true });
    }
    // Check for email change confirmation
    if (hash && hash.includes('type=email_change')) {
      // Clear the hash
      window.history.replaceState(null, '', window.location.pathname);
      // Show success toast
      setToast({ type: 'success', message: 'Email address updated successfully!' });
      // Auto-hide after 4 seconds
      setTimeout(() => setToast(null), 4000);
      // Sync email to users table and refresh profile
      const syncEmail = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('users').update({ email: user.email }).eq('id', user.id);
        }
        refreshProfile();
      };
      syncEmail();
    }
  }, [location.pathname, navigate, refreshProfile]);

  // Handle deep links - when app opens from "Open in App" button, go to login
  useEffect(() => {
    const handleAppUrlOpen = (event) => {
      // App was opened via deep link (medulochub://)
      // Navigate to login so user can sign in
      if (location.pathname === '/confirm-email') {
        navigate('/', { replace: true });
      }
    };

    CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen);

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [location.pathname, navigate]);

  // Handle push notification deep links - navigate to relevant screen when notification tapped
  useEffect(() => {
    if (!isAuthenticated || !isProfileComplete) return;

    const handlePendingDeepLink = () => {
      const pendingData = localStorage.getItem('pendingDeepLink');
      if (!pendingData) return;

      try {
        const data = JSON.parse(pendingData);
        localStorage.removeItem('pendingDeepLink');

        // Navigate based on notification type
        switch (data.type) {
          case 'new_post':
          case 'post_liked':
          case 'post_commented':
          case 'comment_replied':
            // Navigate to home and scroll to post
            navigate('/home');
            if (data.post_id) {
              setTimeout(() => {
                const postElement = document.getElementById(`post-${data.post_id}`);
                if (postElement) {
                  postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  postElement.style.boxShadow = '0 0 0 3px #004B87';
                  setTimeout(() => { postElement.style.boxShadow = 'none'; }, 2000);
                }
              }, 500);
            }
            break;

          case 'direct_message':
          case 'group_message':
            if (data.chat_id) {
              navigate(`/chat/${data.chat_id}`);
            } else {
              navigate('/chat');
            }
            break;

          case 'chat_member_added':
          case 'chat_member_removed':
            navigate('/chat');
            break;

          case 'new_update':
          case 'new_event':
          case 'event_rsvp':
            navigate('/updates');
            break;

          case 'new_user_joined':
            navigate('/manage-users');
            break;

          default:
            console.log('[DeepLink] Unknown notification type:', data.type);
        }
      } catch (err) {
        console.error('[DeepLink] Error processing pending deep link:', err);
        localStorage.removeItem('pendingDeepLink');
      }
    };

    // Check on mount and when app returns to foreground
    handlePendingDeepLink();

    const handleAppStateChange = (state) => {
      if (state.isActive) {
        handlePendingDeepLink();
      }
    };

    CapacitorApp.addListener('appStateChange', handleAppStateChange);

    return () => {
      // Listener cleanup handled by removeAllListeners above
    };
  }, [isAuthenticated, isProfileComplete, navigate]);

  // Determine if bottom nav should show
  const isFieldIntelRoute = location.pathname.startsWith('/field-intel');
  const showBottomNav = isAuthenticated && isProfileComplete && !noNavRoutes.includes(location.pathname) && !isFieldIntelRoute;

  // Check if current route is allowed offline
  const isOfflineAllowed = offlineAllowedRoutes.some(route =>
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #004B87',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  // Show offline login screen when offline and not authenticated
  if (isOffline && !isAuthenticated) {
    return <OfflineLoginScreen />;
  }

  // Show offline screen when offline and on a non-allowed route
  if (isOffline && isAuthenticated && isProfileComplete && !isOfflineAllowed) {
    return <OfflineScreen />;
  }

  // Show organization code gate for authenticated users who haven't verified
  if (isAuthenticated && isProfileComplete && !orgCodeVerified) {
    return (
      <OrganizationGate onVerified={() => {
        localStorage.setItem('org_code_verified', 'true');
        setOrgCodeVerified(true);
      }} />
    );
  }

  return (
    <div style={{ overflow: 'hidden', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 'calc(20px + env(safe-area-inset-top, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          backgroundColor: toast.type === 'success' ? '#059669' : '#dc2626',
          color: '#ffffff',
          padding: '14px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '15px',
          fontWeight: '500',
          maxWidth: '90%',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {toast.message}
        </div>
      )}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Routes>
          {/* Public Routes - Only accessible when NOT logged in */}
          <Route path="/" element={
            isAuthenticated
              ? (isProfileComplete ? <Navigate to="/home" replace /> : <Navigate to="/profile-complete" replace />)
              : <AppShell><Login /></AppShell>
          } />
          <Route path="/signup" element={
            isAuthenticated
              ? (isProfileComplete ? <Navigate to="/home" replace /> : <Navigate to="/profile-complete" replace />)
              : <AppShell><SignUp /></AppShell>
          } />
          <Route path="/confirm-email" element={
            isAuthenticated
              ? (isProfileComplete ? <Navigate to="/home" replace /> : <Navigate to="/profile-complete" replace />)
              : <AppShell><EmailConfirmation /></AppShell>
          } />
          <Route path="/email-confirmed" element={<EmailConfirmed />} />
          <Route path="/forgot-password" element={<AppShell><ForgotPassword /></AppShell>} />
          <Route path="/reset-password" element={<AppShell><ResetPassword /></AppShell>} />

          {/* Profile Complete - Only when authenticated but profile incomplete */}
          <Route path="/profile-complete" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : isProfileComplete
                ? <Navigate to="/home" replace />
                : <AppShell><ProfileComplete onComplete={refreshProfile} /></AppShell>
          } />

          {/* Protected Routes - Only accessible when logged in AND profile complete */}
          <Route path="/home" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Home /></AppShell>
          } />
          <Route path="/profile" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Profile /></AppShell>
          } />
          <Route path="/notifications" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><NotificationSettings /></AppShell>
          } />
          <Route path="/edit-profile" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><EditProfile /></AppShell>
          } />
          <Route path="/manage-users" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageUsers /></AppShell>
          } />
          <Route path="/directory" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Directory /></AppShell>
          } />
          <Route path="/directory-permissions" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><DirectoryPermissions /></AppShell>
          } />
          <Route path="/library" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Library /></AppShell>
          } />
          <Route path="/training" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Training /></AppShell>
          } />
          <Route path="/manage-library" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageLibrary /></AppShell>
          } />
          <Route path="/manage-training" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageTraining /></AppShell>
          } />
          <Route path="/forms" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Forms /></AppShell>
          } />
          <Route path="/manage-forms" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageForms /></AppShell>
          } />
          <Route path="/resources" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Resources /></AppShell>
          } />
          <Route path="/updates" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Updates /></AppShell>
          } />
          <Route path="/manage-updates" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageUpdates /></AppShell>
          } />
          <Route path="/manage-ai" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageAI /></AppShell>
          } />
          <Route path="/downloads" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Downloads /></AppShell>
          } />
          <Route path="/view-file/:id" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <FileViewer />
          } />
          <Route path="/chat" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Chat /></AppShell>
          } />
          <Route path="/chat/:chatId" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <ChatConversation />
          } />
          <Route path="/manage-chat" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageChat /></AppShell>
          } />
          <Route path="/manage-analytics/*" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <ManageAnalytics />
          } />
          <Route path="/terms" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><TermsAndConditions /></AppShell>
          } />
          <Route path="/privacy" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><PrivacyPolicy /></AppShell>
          } />
          <Route path="/delete-account" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><DeleteAccount /></AppShell>
          } />
          {/* Field Intel Zone */}
          <Route path="/field-intel" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <FieldIntelZone />
          }>
            <Route index element={<RoleDashboard />} />
            <Route path="territory" element={<RepDashboard />} />
            <Route path="dossier" element={<SurgeonList />} />
            <Route path="dossier/:surgeonId" element={<SurgeonDossier />} />
            <Route path="call-log" element={<CallLogHistory />} />
            <Route path="call-log/new" element={<CallLogEntry />} />
            <Route path="leads" element={<LeadQueue />} />
            <Route path="leads/new" element={<LeadSubmit />} />
            <Route path="team" element={<ManagerDashboard />} />
            <Route path="accounts" element={<DelegationScreen />} />
            <Route path="activity" element={<ActivityFeed />} />
            <Route path="dashboard" element={<RoleDashboard />} />
            <Route path="regions" element={<DelegationScreen />} />
            <Route path="drill/:userId" element={<DrillDownView />} />
            <Route path="database" element={<CSVImport />} />
            <Route path="settings" element={<SettingsHub />} />
            <Route path="settings/regions" element={<RegionManager />} />
            <Route path="settings/assign-accounts" element={<RegionAccountAssigner />} />
            <Route path="settings/hierarchy" element={<HierarchyManager />} />
            <Route path="settings/custom-fields" element={<CustomFieldManager />} />
          </Route>
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppSettingsProvider>
          <FieldIntelProvider>
          <OfflineProvider>
            <PostsProvider>
            <ContentProvider>
              <DownloadsProvider>
                <NotificationsProvider>
                  <ActivityNotificationsProvider>
                    <ChatProvider>
                      <AIChatProvider>
                        <AnalyticsProvider>
                          {/* OneSignal Components */}
                          <OneSignalInitializer />
                          <DeviceRegistration />
                          <ReturningUserPermissions />
                          {/* Main App */}
                          <AppContent />
                          <AIChatPanel />
                        </AnalyticsProvider>
                      </AIChatProvider>
                    </ChatProvider>
                  </ActivityNotificationsProvider>
                </NotificationsProvider>
              </DownloadsProvider>
            </ContentProvider>
            </PostsProvider>
          </OfflineProvider>
          </FieldIntelProvider>
        </AppSettingsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
