import { useState, useCallback } from 'react';

const COGNITO_ACCOUNT_KEY = 'aRKJwjhq_02CFQKr1wAgnw';
const COGNITO_FORM_ID = '7';

const CustomerFeedback = () => {
  const [ready, setReady] = useState(false);

  // Delay after iframe onLoad to let Cognito fully render its styles
  const handleIframeLoad = useCallback(() => {
    setTimeout(() => setReady(true), 1500);
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.headerTitle}>Customer Feedback</h1>
        </div>
        <div style={styles.headerBorder} />
      </header>

      <div style={styles.content}>
        {!ready && (
          <div style={styles.loader}>
            <div style={styles.spinner} />
            <p style={styles.loaderText}>Loading form...</p>
          </div>
        )}
        <div style={{
          ...styles.iframeWrapper,
          ...(!ready ? { height: 0, overflow: 'hidden' } : {}),
        }}>
          <iframe
            src={`https://www.cognitoforms.com/f/${COGNITO_ACCOUNT_KEY}?id=${COGNITO_FORM_ID}`}
            style={{
              ...styles.iframe,
              opacity: ready ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
            title="Customer Feedback Form"
            onLoad={handleIframeLoad}
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
