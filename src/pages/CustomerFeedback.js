import { useState } from 'react';

const COGNITO_ACCOUNT_KEY = 'JOkoMoH77U6wAKhlS4IBiQ';
const COGNITO_FORM_ID = '12';

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
        <iframe
          src={`https://www.cognitoforms.com/f/${COGNITO_ACCOUNT_KEY}?id=${COGNITO_FORM_ID}`}
          style={{
            ...styles.iframe,
            ...(loading ? { opacity: 0 } : {}),
          }}
          title="Customer Feedback Form"
          onLoad={() => setLoading(false)}
          allow="payment"
        />
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
    borderBottom: '2px solid rgba(30, 64, 175, 0.15)',
    padding: '12px 16px',
    textAlign: 'center',
  },
  headerTitle: {
    color: '#004B87',
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  iframe: {
    flex: 1,
    width: '100%',
    border: 'none',
    minHeight: 'calc(100vh - 120px)',
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
