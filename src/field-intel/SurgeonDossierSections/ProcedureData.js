import React from 'react';

const formatCurrency = (value) => {
  if (value == null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

const formatNumber = (value) => {
  if (value == null) return null;
  return Number(value).toLocaleString();
};

const ProcedureData = ({ surgeon, cptData = [], cptPrices = [] }) => {
  // Build a lookup from cpt_code -> average_price
  const priceMap = {};
  cptPrices.forEach((p) => {
    if (p.average_price != null) {
      priceMap[p.cpt_code] = parseFloat(p.average_price);
    }
  });

  // If we have multi-CPT data from the new table, render that
  if (cptData && cptData.length > 0) {
    // Calculate total market opportunity across all CPT codes with prices
    let totalOpportunity = 0;
    let hasAnyPrice = false;

    const cards = cptData.map((item) => {
      const price = priceMap[item.cpt_code];
      const hasPrice = price != null && price > 0;
      const volume = item.annual_volume || 0;
      const opportunity = hasPrice ? volume * price : null;

      if (hasPrice) {
        hasAnyPrice = true;
        totalOpportunity += opportunity || 0;
      }

      return { ...item, price, hasPrice, opportunity };
    });

    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <ProcedureIcon />
          <h3 style={styles.title}>Procedure Data</h3>
          <span style={styles.badge}>{cptData.length} procedure{cptData.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={styles.cptList}>
          {cards.map((item) => (
            <div key={item.id || item.cpt_code} style={styles.cptCard}>
              <div style={styles.cptHeader}>
                <span style={styles.cptCode}>{item.cpt_code}</span>
                {item.cpt_description && (
                  <span style={styles.cptDesc}>{item.cpt_description}</span>
                )}
              </div>
              <div style={styles.cptGrid}>
                {item.annual_volume != null && (
                  <div style={styles.field}>
                    <span style={styles.label}>Annual Volume</span>
                    <span style={styles.value}>{formatNumber(item.annual_volume)}</span>
                  </div>
                )}
                {item.site_of_care && (
                  <div style={styles.field}>
                    <span style={styles.label}>Site of Care</span>
                    <span style={styles.value}>{item.site_of_care}</span>
                  </div>
                )}
                {item.hasPrice && (
                  <div style={styles.field}>
                    <span style={styles.label}>Price</span>
                    <span style={styles.value}>{formatCurrency(item.price)}</span>
                  </div>
                )}
                {item.opportunity != null && (
                  <div style={styles.field}>
                    <span style={styles.label}>Market Opportunity</span>
                    <span style={styles.valueHighlight}>{formatCurrency(item.opportunity)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {hasAnyPrice && totalOpportunity > 0 && (
          <div style={styles.totalRow}>
            <span style={styles.totalLabel}>Total Market Opportunity</span>
            <span style={styles.totalValue}>{formatCurrency(totalOpportunity)}</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback: legacy single-CPT fields on surgeon record
  if (!surgeon) return null;
  const hasData = surgeon.cpt_code || surgeon.cpt_description || surgeon.annual_volume || surgeon.device_price || surgeon.market_opportunity;
  if (!hasData) return null;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <ProcedureIcon />
        <h3 style={styles.title}>Procedure Data</h3>
      </div>
      <div style={styles.grid}>
        {surgeon.cpt_code && (
          <div style={styles.field}>
            <span style={styles.label}>CPT Code</span>
            <span style={styles.value}>{surgeon.cpt_code}</span>
          </div>
        )}
        {surgeon.cpt_description && (
          <div style={styles.field}>
            <span style={styles.label}>CPT Description</span>
            <span style={styles.value}>{surgeon.cpt_description}</span>
          </div>
        )}
        {surgeon.annual_volume != null && (
          <div style={styles.field}>
            <span style={styles.label}>Annual Volume</span>
            <span style={styles.value}>{Number(surgeon.annual_volume).toLocaleString()}</span>
          </div>
        )}
        {surgeon.device_price != null && (
          <div style={styles.field}>
            <span style={styles.label}>Device Price</span>
            <span style={styles.value}>{formatCurrency(surgeon.device_price) || surgeon.device_price}</span>
          </div>
        )}
        {surgeon.market_opportunity != null && (
          <div style={styles.field}>
            <span style={styles.label}>Market Opportunity</span>
            <span style={styles.valueHighlight}>{formatCurrency(surgeon.market_opportunity) || surgeon.market_opportunity}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ProcedureIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
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
  badge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cptList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cptCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px',
  },
  cptHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginBottom: '10px',
  },
  cptCode: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e3a8a',
  },
  cptDesc: {
    fontSize: '13px',
    color: '#64748b',
  },
  cptGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
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
  },
  valueHighlight: {
    fontSize: '14px',
    color: '#059669',
    fontWeight: '700',
  },
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '14px',
    paddingTop: '14px',
    borderTop: '2px solid #e2e8f0',
  },
  totalLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#059669',
  },
};

export default ProcedureData;
