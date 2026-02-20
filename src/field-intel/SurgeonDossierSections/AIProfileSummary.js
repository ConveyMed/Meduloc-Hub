import React, { useState } from 'react';
import { supabase } from '../../config/supabase';

const AIProfileSummary = ({ profile, surgeonId, surgeonName, onProfileGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('physician-research', {
        body: { surgeon_id: surgeonId },
      });
      if (fnError) throw fnError;
      if (data?.success && data.profile) {
        onProfileGenerated(data.profile);
      } else {
        throw new Error(data?.error || 'Failed to generate profile');
      }
    } catch (err) {
      console.error('[AIProfile] Error:', err);
      setError(err.message || 'Failed to generate profile');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <BrainIcon />
          <h3 style={styles.title}>AI Physician Profile</h3>
        </div>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Researching Dr. {surgeonName}...</span>
          <span style={styles.loadingHint}>This may take 10-20 seconds</span>
        </div>
      </div>
    );
  }

  // No profile yet
  if (!profile) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <BrainIcon />
          <h3 style={styles.title}>AI Physician Profile</h3>
        </div>
        {error && (
          <div style={styles.errorBanner}>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}
        <button onClick={generateProfile} style={styles.generateBtn}>
          <BrainIcon color="#ffffff" size={16} />
          Generate AI Profile
        </button>
        <p style={styles.hint}>Uses AI with web search to compile physician background, education, publications, and online presence.</p>
      </div>
    );
  }

  // Profile exists - render it
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <BrainIcon />
        <h3 style={styles.title}>AI Physician Profile</h3>
        <span style={styles.cachedBadge}>Cached</span>
      </div>

      {profile.summary && (
        <div style={styles.section}>
          <p style={styles.summary}>{profile.summary}</p>
        </div>
      )}

      <div style={styles.detailsGrid}>
        {profile.medical_school && (
          <div style={styles.field}>
            <span style={styles.label}>Medical School</span>
            <span style={styles.value}>{profile.medical_school}</span>
          </div>
        )}
        {profile.residency && (
          <div style={styles.field}>
            <span style={styles.label}>Residency</span>
            <span style={styles.value}>{profile.residency}</span>
          </div>
        )}
        {profile.fellowship && (
          <div style={styles.field}>
            <span style={styles.label}>Fellowship</span>
            <span style={styles.value}>{profile.fellowship}</span>
          </div>
        )}
        {profile.research_interests && (
          <div style={styles.field}>
            <span style={styles.label}>Research Interests</span>
            <span style={styles.value}>{profile.research_interests}</span>
          </div>
        )}
        {profile.publications && (
          <div style={styles.field}>
            <span style={styles.label}>Publications</span>
            <span style={styles.value}>{profile.publications}</span>
          </div>
        )}
        {profile.healthgrades_score && (
          <div style={styles.field}>
            <span style={styles.label}>Healthgrades Score</span>
            <span style={styles.value}>{profile.healthgrades_score}</span>
          </div>
        )}
        {profile.news_pr && (
          <div style={styles.field}>
            <span style={styles.label}>News / PR</span>
            <span style={styles.value}>{profile.news_pr}</span>
          </div>
        )}
      </div>

      {profile.updated_at && (
        <span style={styles.timestamp}>
          Last updated: {new Date(profile.updated_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
          })}
        </span>
      )}
    </div>
  );
};

const BrainIcon = ({ color = '#1e3a8a', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 1.58.67 3 1.74 4.01L12 18l6.26-6.49A5.48 5.48 0 0 0 20 7.5 5.5 5.5 0 0 0 14.5 2 5.5 5.5 0 0 0 12 2.84 5.5 5.5 0 0 0 9.5 2z" />
    <path d="M12 18v4" />
  </svg>
);

const styles = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '14px',
  },
  title: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    flex: 1,
  },
  cachedBadge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#15803d',
    backgroundColor: '#f0fdf4',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '24px 0',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  loadingHint: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '12px',
  },
  errorText: {
    fontSize: '13px',
    color: '#b91c1c',
  },
  generateBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  hint: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
    margin: '10px 0 0 0',
    lineHeight: '1.4',
  },
  section: {
    marginBottom: '14px',
  },
  summary: {
    fontSize: '14px',
    color: '#334155',
    lineHeight: '1.6',
    margin: 0,
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '500',
    lineHeight: '1.5',
  },
  timestamp: {
    display: 'block',
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '14px',
    textAlign: 'right',
  },
};

export default AIProfileSummary;
