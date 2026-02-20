import React from 'react';

const CallHistory = ({ callLogs = [], surgeonId, onLogCall }) => {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <CallIcon />
        <h3 style={styles.title}>Call History</h3>
        {callLogs.length > 0 && (
          <span style={styles.count}>{callLogs.length}</span>
        )}
        {onLogCall && (
          <button onClick={onLogCall} style={styles.logBtn}>
            <PlusIcon /> Log Call
          </button>
        )}
      </div>

      {callLogs.length === 0 ? (
        <div style={styles.emptyState}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span style={styles.emptyText}>No calls logged yet</span>
          {onLogCall && (
            <button onClick={onLogCall} style={styles.emptyBtn}>Log your first call</button>
          )}
        </div>
      ) : (
        <div style={styles.list}>
          {callLogs.map((log, idx) => {
            const repName = log.rep
              ? `${log.rep.first_name || ''} ${log.rep.last_name || ''}`.trim()
              : null;

            const updates = [];
            if (log.buying_stage_update) updates.push(`Stage: ${log.buying_stage_update}`);
            if (log.contract_status_update) updates.push(`Contract: ${log.contract_status_update}`);
            if (log.forecast_close_date_update) {
              updates.push(`Close: ${new Date(log.forecast_close_date_update).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
            }
            if (log.competitor_update) updates.push(`Competitor: ${log.competitor_update}`);

            return (
              <div key={log.id || idx} style={styles.entry}>
                <div style={styles.entryHeader}>
                  <span style={styles.entryDate}>
                    {new Date(log.call_date).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </span>
                  {repName && <span style={styles.repName}>{repName}</span>}
                </div>
                {log.summary && (
                  <p style={styles.entrySummary}>{log.summary}</p>
                )}
                {updates.length > 0 && (
                  <div style={styles.updatesRow}>
                    {updates.map((u, i) => (
                      <span key={i} style={styles.updateTag}>{u}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CallIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
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
  count: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  logBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '24px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  emptyBtn: {
    padding: '6px 12px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  entry: {
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #f1f5f9',
  },
  entryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  entryDate: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
  },
  repName: {
    fontSize: '12px',
    color: '#64748b',
  },
  entrySummary: {
    fontSize: '13px',
    color: '#334155',
    lineHeight: '1.5',
    margin: 0,
  },
  updatesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '6px',
  },
  updateTag: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#a16207',
    backgroundColor: '#fefce8',
    padding: '2px 6px',
    borderRadius: '4px',
  },
};

export default CallHistory;
