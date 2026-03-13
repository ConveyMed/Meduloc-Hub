import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

const APP_NAME = 'Meduloc Hub';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const pageStyles = {
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
    padding: '12px 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
    position: 'relative',
  },
  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#004B87',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#004B87',
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    marginLeft: '8px',
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
    padding: '24px 16px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  paragraph: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#64748b',
    margin: '0 0 12px 0',
  },
  lastUpdated: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '0 0 24px 0',
    fontStyle: 'italic',
  },
};

export const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div style={pageStyles.container}>
      <header style={pageStyles.header}>
        <div style={pageStyles.headerInner}>
          <button style={pageStyles.backButton} onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <h1 style={pageStyles.headerTitle}>Terms & Conditions</h1>
        </div>
        <div style={pageStyles.headerBorder} />
      </header>
      <div style={pageStyles.contentContainer}>
        <div style={pageStyles.content}>
          <p style={pageStyles.lastUpdated}>Last updated: February 24, 2026</p>

          <p style={pageStyles.paragraph}>
            Welcome to the {APP_NAME} mobile application. This app is provided by Meduloc ("Company", "we", "us", or "our"). We partner with Convey Pro Inc. ("Technology Platform Provider") to host and operate this application.
          </p>
          <p style={pageStyles.paragraph}>
            These Terms of Service ("Terms") govern your access to and use of the App. By downloading, accessing, or using the App, you agree to be bound by these Terms. If you are using the App on behalf of an organization (such as your employer), you agree to these Terms on behalf of that organization.
          </p>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>1. The Service</h2>
            <p style={pageStyles.paragraph}>
              The App is a platform designed to make available content for consumption for business purposes to employees, agents, distributors, and other authorized personnel. Your access is granted pursuant to your relationship with the Company.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>2. License Grant & Restrictions</h2>
            <p style={pageStyles.paragraph}>
              We grant you a limited, non-exclusive, non-transferable, and revocable license to use the App for your internal business purposes. You agree NOT to:
            </p>
            <p style={pageStyles.paragraph}>
              Copy, modify, or create derivative works of the App. Reverse engineer, decompile, or attempt to extract the source code of the App. Sublicense, sell, or transfer your access to the App to any unauthorized third party. Use the App for any illegal, unauthorized, or abusive purpose.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>3. Artificial Intelligence (AI) Features & Disclaimers</h2>
            <p style={pageStyles.paragraph}>
              The App may include an AI Agent designed to serve as a product expert. By using the AI features, you acknowledge and agree to the following:
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Probabilistic Outputs:</strong> The AI Agent utilizes probabilistic machine learning models which may occasionally produce inaccurate or "hallucinated" outputs.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>No Warranty on Accuracy:</strong> We make no warranty regarding the absolute accuracy of the AI Agent's responses.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>User Verification:</strong> You are strictly responsible for verifying critical product information provided by the AI Agent before relying on it for business or medical decisions.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Data Privacy & No Training:</strong> We utilize Google AI Studio as our paid AI service provider. Your inputs, prompts, and queries are strictly processed to provide your immediate response and are not used to train Google's foundation models.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>4. User-Generated Content (UGC) and Acceptable Use</h2>
            <p style={pageStyles.paragraph}>
              To ensure a safe environment, you may not submit, upload, or share content that is offensive, discriminatory, threatening, or violates any third-party intellectual property rights.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Objectionable Content:</strong> We reserve the right to filter, remove, or block any content that we determine to be objectionable or in violation of these Terms.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Reporting & Blocking:</strong> You may report abusive behavior or objectionable content using the in-app reporting tools or by contacting support. We will act on reports within 24 hours and reserve the right to immediately suspend or terminate the accounts of abusive users.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>5. Intellectual Property</h2>
            <p style={pageStyles.paragraph}>
              Our Technology Platform Provider, Convey Pro Inc., retains all rights, title, and interest in and to the platform's technology, including the underlying source code and backend configurations. The Company retains ownership of the content and data it uploads to the platform.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>6. App Store Additional Terms (Apple iOS)</h2>
            <p style={pageStyles.paragraph}>
              If you downloaded the App from the Apple App Store, the following terms apply:
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Acknowledgment:</strong> You acknowledge that these Terms are between you and the Company, not Apple. The Company (not Apple) is solely responsible for the App and its content.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Maintenance and Support:</strong> Apple has no obligation whatsoever to furnish any maintenance and support services with respect to the App.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Warranty:</strong> Apple is not responsible for any product warranties, whether express or implied by law.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Third-Party Beneficiary:</strong> Apple and Apple's subsidiaries are third-party beneficiaries of these Terms, and upon your acceptance, Apple will have the right to enforce these Terms against you.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>7. Limitation of Liability</h2>
            <p style={pageStyles.paragraph}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER THE COMPANY NOR CONVEY PRO INC. SHALL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE APP.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>8. Governing Law</h2>
            <p style={pageStyles.paragraph}>
              These Terms shall be governed by the laws of the State of California, without regard to its conflict of law principles.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>9. Contact Information</h2>
            <p style={pageStyles.paragraph}>
              If you have any questions about these Terms, please contact us at: Meduloc LLC, 2010 Jimmy Durante Blvd, Suite 200, Del Mar, CA 92014. Contact: Sarah Sachinis, sarah@meduloc.com, 1-203-583-6263
            </p>
            <p style={pageStyles.paragraph}>
              For technical data requests related to the platform, please tap the link to send a question to our technology provider:{' '}
              <a href="https://www.cognitoforms.com/ConveyProInc/DataRequest" target="_blank" rel="noopener noreferrer" style={{ color: '#004B87' }}>Data Request Form</a>
            </p>
          </div>

          <div style={{ height: '100px' }} />
        </div>
      </div>
    </div>
  );
};

export const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div style={pageStyles.container}>
      <header style={pageStyles.header}>
        <div style={pageStyles.headerInner}>
          <button style={pageStyles.backButton} onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <h1 style={pageStyles.headerTitle}>Privacy Policy</h1>
        </div>
        <div style={pageStyles.headerBorder} />
      </header>
      <div style={pageStyles.contentContainer}>
        <div style={pageStyles.content}>
          <p style={pageStyles.lastUpdated}>Last updated: February 24, 2026</p>

          <p style={pageStyles.paragraph}>
            Meduloc LLC ("we," "our," or "us") respects your privacy. This Privacy Policy describes how we collect, use, and share information when you use our mobile application (the "App"). We partner with Convey Pro Inc., who acts as our data processor and technology provider to host and operate the App on our behalf.
          </p>
          <p style={pageStyles.paragraph}>
            By downloading or using the App, you agree to the terms of this Privacy Policy.
          </p>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>1. Information We Collect</h2>
            <p style={pageStyles.paragraph}>
              We collect information to provide you with a secure, customized, and efficient experience.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Information You Provide to Us:</strong> When you register or log in, we collect your name, email address, phone number, and job title/role. We also collect any text, images, or files you voluntarily upload, as well as text prompts and queries you submit to our AI Agent features.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Information Collected Automatically:</strong> We track how you interact with the App, including screens visited, time spent, and features used. We collect technical details such as your device model, operating system version, unique device identifiers, and IP address. We also collect logs related to App crashes or performance issues.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>2. How We Use Your Information</h2>
            <p style={pageStyles.paragraph}>
              <strong>Service Delivery:</strong> To authenticate your identity.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Communication:</strong> To send you push notifications, updates, or important administrative messages.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>App Improvement:</strong> To analyze usage trends and fix technical issues.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>AI Features:</strong> To process your questions via our AI Agent and provide automated answers regarding product information.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>3. AI Features & Data Sharing</h2>
            <p style={pageStyles.paragraph}>
              This App contains AI-powered features designed to assist you with product queries. To provide these features, specific data is shared with our third-party AI provider.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>What is Shared:</strong> Only the text prompts you explicitly submit to the AI Agent are sent to our AI provider, Google AI Studio. We do not send your user profile or contact details to the AI provider.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Consent:</strong> You have control over this sharing. Data is only transmitted to the AI provider when you actively engage with the AI Agent feature.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>No Training:</strong> Because we utilize Google AI Studio as a paid enterprise service, we have ensured through our service agreements that your text prompts and queries are not used to train their public foundation models.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>4. Data Sharing with Third Parties</h2>
            <p style={pageStyles.paragraph}>
              We do not sell your personal data. We share data with Convey Pro Inc. and the following service providers who assist in operating the App:
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Supabase:</strong> Backend database and authentication. Receives user profile (name, email), app content, and usage logs.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Netlify:</strong> Web hosting and content delivery. Receives IP address and browser/device user agent.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Gemini:</strong> LLM/AI processing. Receives user prompts and queries (text input).
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Google/Apple:</strong> App Store distribution. Receives anonymous app performance analytics.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>5. Data Retention & Deletion</h2>
            <p style={pageStyles.paragraph}>
              We retain your account data for as long as your organization's license is active or as required by law. You may request the deletion of your account and associated data at any time using the "Delete Account" feature within the App settings.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>6. Security</h2>
            <p style={pageStyles.paragraph}>
              Industry-standard security measures are implemented to protect your data, including encryption of data in transit (TLS/SSL) and at rest, access controls limiting authorized personnel, and active vulnerability monitoring. However, no method of transmission over the Internet is 100% secure.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>7. Your Rights</h2>
            <p style={pageStyles.paragraph}>
              Depending on your location, you may have the right to access, correct, or delete your personal data. You may opt out of AI features by avoiding the use of the AI Agent tab within the App.
            </p>
            <p style={pageStyles.paragraph}>
              To exercise these rights, please submit a request to our technology provider:{' '}
              <a href="https://www.cognitoforms.com/ConveyProInc/DataRequest" target="_blank" rel="noopener noreferrer" style={{ color: '#004B87' }}>Data Request Form</a>
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>8. Children's Privacy</h2>
            <p style={pageStyles.paragraph}>
              The App is a B2B business tool intended for professionals. We do not knowingly collect data from children under the age of 13. If you believe a child has provided us with personal data, please contact us immediately.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>9. Contact Us</h2>
            <p style={pageStyles.paragraph}>
              If you have questions about this Privacy Policy, please contact us at: Meduloc LLC, 2010 Jimmy Durante Blvd, Suite 200, Del Mar, CA 92014. Contact: Sarah Sachinis, sarah@meduloc.com, 1-203-583-6263
            </p>
            <p style={pageStyles.paragraph}>
              For technical data inquiries, submit a request here:{' '}
              <a href="https://www.cognitoforms.com/ConveyProInc/DataRequest" target="_blank" rel="noopener noreferrer" style={{ color: '#004B87' }}>Data Request Form</a>
            </p>
          </div>

          <div style={{ height: '100px' }} />
        </div>
      </div>
    </div>
  );
};

export const DeleteAccount = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;

    setLoading(true);
    setError('');

    try {
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) throw rpcError;
      await signOut();
    } catch (err) {
      console.error('Delete account error:', err);
      setError('Failed to delete account. Please try again or contact support.');
      setLoading(false);
    }
  };

  return (
    <div style={pageStyles.container}>
      <header style={pageStyles.header}>
        <div style={pageStyles.headerInner}>
          <button style={pageStyles.backButton} onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <h1 style={{...pageStyles.headerTitle, color: '#dc2626'}}>Delete Account</h1>
        </div>
        <div style={pageStyles.headerBorder} />
      </header>
      <div style={pageStyles.contentContainer}>
        <div style={pageStyles.content}>
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#dc2626',
              margin: '0 0 12px 0',
            }}>
              This action is permanent
            </h2>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#7f1d1d',
              margin: '0 0 8px 0',
            }}>
              Deleting your account will permanently remove:
            </p>
            <ul style={{
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#7f1d1d',
              margin: '0',
              paddingLeft: '20px',
            }}>
              <li>Your profile and account data</li>
              <li>All posts, comments, and likes</li>
              <li>Chat messages and conversations</li>
              <li>Notification preferences and device registrations</li>
              <li>All bookmarks and saved content</li>
            </ul>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          }}>
            <p style={{
              fontSize: '14px',
              color: '#64748b',
              margin: '0 0 16px 0',
            }}>
              To confirm, type <strong>DELETE</strong> below:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                letterSpacing: '2px',
              }}
            />
            {error && (
              <p style={{
                fontSize: '13px',
                color: '#dc2626',
                margin: '12px 0 0 0',
              }}>
                {error}
              </p>
            )}
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || loading}
              style={{
                width: '100%',
                padding: '14px',
                marginTop: '16px',
                backgroundColor: confirmText === 'DELETE' ? '#dc2626' : '#e2e8f0',
                color: confirmText === 'DELETE' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Deleting...' : 'Permanently Delete Account'}
            </button>
          </div>

          <div style={{ height: '100px' }} />
        </div>
      </div>
    </div>
  );
};
