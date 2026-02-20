import { useNavigate } from 'react-router-dom';

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const FieldIntelHeader = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.header}>
      <button style={styles.exitBtn} onClick={() => navigate('/home')}>
        <ArrowLeftIcon />
        <span style={styles.exitLabel}>Exit</span>
      </button>
      <h1 style={styles.title}>Customer / Field Intelligence</h1>
      <div style={styles.spacer} />
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  exitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
    minWidth: '70px',
  },
  exitLabel: {
    fontSize: '14px',
    fontWeight: '500',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    textAlign: 'center',
    flex: 1,
  },
  spacer: {
    minWidth: '70px',
  },
};

export default FieldIntelHeader;
