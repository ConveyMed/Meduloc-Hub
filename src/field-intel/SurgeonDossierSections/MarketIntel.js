import React from 'react';

const stageColors = {
  prospect: { bg: '#f0f9ff', text: '#0369a1' },
  qualified: { bg: '#eff6ff', text: '#1e3a8a' },
  evaluation: { bg: '#fefce8', text: '#a16207' },
  negotiation: { bg: '#fff7ed', text: '#c2410c' },
  closed_won: { bg: '#f0fdf4', text: '#15803d' },
  closed_lost: { bg: '#fef2f2', text: '#b91c1c' },
};

const contractColors = {
  active: { bg: '#f0fdf4', text: '#15803d' },
  expired: { bg: '#fef2f2', text: '#b91c1c' },
  pending: { bg: '#fefce8', text: '#a16207' },
  none: { bg: '#f1f5f9', text: '#64748b' },
};

const MarketIntel = ({ surgeon }) => {
  if (!surgeon) return null;

  const hasData = surgeon.competitor_products || surgeon.contract_status || surgeon.buying_stage || surgeon.forecast_close_date;
  if (!hasData) return null;

  const stageStyle = stageColors[surgeon.buying_stage?.toLowerCase()?.replace(/\s+/g, '_')] || { bg: '#f1f5f9', text: '#64748b' };
  const contractStyle = contractColors[surgeon.contract_status?.toLowerCase()] || { bg: '#f1f5f9', text: '#64748b' };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <MarketIcon />
        <h3 style={styles.title}>Market Intelligence</h3>
      </div>
      <div style={styles.grid}>
        {surgeon.buying_stage && (
          <div style={styles.field}>
            <span style={styles.label}>Buying Stage</span>
            <span style={{
              ...styles.pill,
              backgroundColor: stageStyle.bg,
              color: stageStyle.text,
            }}>
              {surgeon.buying_stage}
            </span>
          </div>
        )}
        {surgeon.contract_status && (
          <div style={styles.field}>
            <span style={styles.label}>Contract Status</span>
            <span style={{
              ...styles.pill,
              backgroundColor: contractStyle.bg,
              color: contractStyle.text,
            }}>
              {surgeon.contract_status}
            </span>
          </div>
        )}
        {surgeon.competitor_products && (
          <div style={styles.field}>
            <span style={styles.label}>Competitor Products</span>
            <span style={styles.value}>{surgeon.competitor_products}</span>
          </div>
        )}
        {surgeon.forecast_close_date && (
          <div style={styles.field}>
            <span style={styles.label}>Forecast Close Date</span>
            <span style={styles.value}>
              {new Date(surgeon.forecast_close_date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const MarketIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
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
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
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
  },
  pill: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '6px',
    alignSelf: 'flex-start',
  },
};

export default MarketIntel;
