import React from 'react';
import { useNavigate } from 'react-router-dom';

const GlobeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const OrgChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="5" rx="1" />
    <rect x="2" y="17" width="6" height="5" rx="1" />
    <rect x="16" y="17" width="6" height="5" rx="1" />
    <line x1="12" y1="7" x2="12" y2="12" />
    <line x1="5" y1="17" x2="5" y2="12" />
    <line x1="19" y1="17" x2="19" y2="12" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const FieldsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const LeadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const DatabaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const sections = [
  {
    title: 'Database Import',
    description: 'Upload procedure CSVs -- start here to see your data before building regions',
    path: '/field-intel/database',
    Icon: DatabaseIcon,
  },
  {
    title: 'Regions',
    description: 'Create and manage geographic regions for territory organization',
    path: '/field-intel/settings/regions',
    Icon: GlobeIcon,
  },
  {
    title: 'Assign Accounts to Regions',
    description: 'Bulk-assign surgeon accounts to specific regions',
    path: '/field-intel/settings/assign-accounts',
    Icon: UsersIcon,
  },
  {
    title: 'Org Hierarchy',
    description: 'Set up VP, Manager, and Rep roles with reporting structure',
    path: '/field-intel/settings/hierarchy',
    Icon: OrgChartIcon,
  },
  {
    title: 'Lead Queue',
    description: 'Review, approve, or reject submitted physician leads',
    path: '/field-intel/leads',
    Icon: LeadIcon,
  },
  {
    title: 'Custom Fields',
    description: 'Define custom data fields for surgeon dossiers and call logs',
    path: '/field-intel/settings/custom-fields',
    Icon: FieldsIcon,
  },
];

const SettingsHub = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Settings</h2>
      <div style={styles.list}>
        {sections.map((section) => (
          <button
            key={section.path}
            onClick={() => navigate(section.path)}
            style={styles.card}
          >
            <div style={styles.iconWrap}>
              <section.Icon />
            </div>
            <div style={styles.cardContent}>
              <span style={styles.cardTitle}>{section.title}</span>
              <span style={styles.cardDesc}>{section.description}</span>
            </div>
            <ChevronIcon />
          </button>
        ))}
      </div>
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
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'box-shadow 0.2s ease',
  },
  iconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.4',
  },
};

export default SettingsHub;
