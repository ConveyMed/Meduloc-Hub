import { useState } from 'react';

const COGNITO_ACCOUNT_KEY = 'JOkoMoH77U6wAKhlS4IBiQ';
const COGNITO_FORM_ID = '7';

const CustomerFeedback = () => {
  const [loading, setLoading] = useState(true);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Customer Feedback</h1>
      </header>

      <div style={styles.content}>
        {loading && (
          <div style={styles.loader}>
            <div style={styles.spinner} />
            <p style={styles.loaderText}>Loading form...</p>
          </div>
        )}
        <div style={styles.iframeWrapper}>
          <iframe
            src={`https://www.cognitoforms.com/f/${COGNITO_ACCOUNT_KEY}?id=${COGNITO_FORM_ID}`}
            style={{
              ...styles.iframe,
              ...(loading ? { opacity: 0, position: 'absolute' } : {}),
            }}
            title="Customer Feedback Form"
            onLoad={() => setLoading(false)}
            allow="payment"
            scrolling="yes"
          />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100%',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    width: '100%',
    backgroundColor: '#ffffff',
    flexShrink: 0,
    borderBottom: '2px solid rgba(30, 64, 175, 0.15)',
    padding: 'calc(12px + var(--safe-area-top, 0px)) 16px 12px 16px',
    textAlign: 'center',
  },
  headerTitle: {
    color: '#004B87',
    fontSize: '22px',
    fontWeight: '700',
    margin: 0,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  iframeWrapper: {
    flex: 1,
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: 'calc(140px + var(--safe-area-bottom, 0px))',
  },
  iframe: {
    width: '100%',
    height: '100%',
    minHeight: '800px',
    border: 'none',
    display: 'block',
  },
  loader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #004B87',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loaderText: {
    marginTop: '12px',
    fontSize: '14px',
    color: '#64748b',
  },
};

export default CustomerFeedback;
