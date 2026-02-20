import { useNavigate, useLocation } from 'react-router-dom';
import { useFieldIntel } from './FieldIntelContext';

const tabsByRole = {
  rep: [
    { label: 'My Territory', path: '/field-intel/territory' },
    { label: 'Dossier', path: '/field-intel/dossier' },
    { label: 'Call Log', path: '/field-intel/call-log' },
  ],
  manager: [
    { label: 'Team', path: '/field-intel/team' },
    { label: 'Dossier', path: '/field-intel/dossier' },
    { label: 'Accounts', path: '/field-intel/accounts' },
    { label: 'Activity', path: '/field-intel/activity' },
  ],
  vp: [
    { label: 'Dashboard', path: '/field-intel/dashboard' },
    { label: 'Dossier', path: '/field-intel/dossier' },
    { label: 'Regions', path: '/field-intel/regions' },
    { label: 'Activity', path: '/field-intel/activity' },
  ],
  admin: [
    { label: 'Dashboard', path: '/field-intel/dashboard' },
    { label: 'Database', path: '/field-intel/database' },
    { label: 'Settings', path: '/field-intel/settings' },
  ],
};

const FieldIntelNav = () => {
  const { role } = useFieldIntel();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = tabsByRole[role] || [];

  if (tabs.length === 0) return null;

  const isActive = (path) => {
    if (path === '/field-intel/territory' && location.pathname === '/field-intel') return true;
    if (path === '/field-intel/dashboard' && location.pathname === '/field-intel') return true;
    if (path === '/field-intel/team' && location.pathname === '/field-intel') return true;
    if (path === '/field-intel/settings' && location.pathname.startsWith('/field-intel/settings')) return true;
    if (path === '/field-intel/dossier' && location.pathname.startsWith('/field-intel/dossier')) return true;
    if (path === '/field-intel/call-log' && location.pathname.startsWith('/field-intel/call-log')) return true;
    if (path === '/field-intel/leads' && location.pathname.startsWith('/field-intel/leads')) return true;
    if (path === '/field-intel/team' && location.pathname.startsWith('/field-intel/drill')) return true;
    if (path === '/field-intel/dashboard' && location.pathname.startsWith('/field-intel/drill')) return true;
    if (path === '/field-intel/activity' && location.pathname.startsWith('/field-intel/activity')) return true;
    return location.pathname === path;
  };

  return (
    <div style={styles.navContainer}>
      <div style={styles.navRow}>
        {tabs.map((tab) => (
          <button
            key={tab.path}
            style={{
              ...styles.tab,
              ...(isActive(tab.path) ? styles.tabActive : {}),
            }}
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const styles = {
  navContainer: {
    backgroundColor: '#1e3a8a',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 99,
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '0 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  tab: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    color: '#ffffff',
    fontWeight: '600',
  },
};

export default FieldIntelNav;
