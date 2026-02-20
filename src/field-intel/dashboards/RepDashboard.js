import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import DashboardMetrics from './DashboardMetrics';
import StaleAccountIndicator from './StaleAccountIndicator';

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const RepDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [callsThisWeek, setCallsThisWeek] = useState(0);
  const [upcomingCloses, setUpcomingCloses] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [staleAccounts, setStaleAccounts] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        // Get accounts delegated to me
        const { data: delegations } = await supabase
          .from('account_delegations')
          .select('surgeon_id')
          .eq('delegated_to', user.id);

        const myAccountIds = (delegations || []).map(d => d.surgeon_id);
        setTotalAccounts(myAccountIds.length);

        // Get calls this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: callCountData } = await supabase
          .from('call_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('call_date', weekAgo.toISOString());
        setCallsThisWeek((callCountData || []).length);

        // Recent calls
        const { data: calls } = await supabase
          .from('call_logs')
          .select('*, surgeon:surgeons(full_name, first_name, last_name)')
          .eq('user_id', user.id)
          .order('call_date', { ascending: false })
          .limit(5);
        setRecentCalls(calls || []);

        // Upcoming close dates (from surgeons with forecast_close_date)
        if (myAccountIds.length > 0) {
          const thirtyDaysOut = new Date();
          thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

          const { data: closing } = await supabase
            .from('surgeons')
            .select('id, full_name, first_name, last_name, forecast_close_date')
            .in('id', myAccountIds)
            .not('forecast_close_date', 'is', null)
            .lte('forecast_close_date', thirtyDaysOut.toISOString())
            .gte('forecast_close_date', new Date().toISOString())
            .order('forecast_close_date');
          setUpcomingCloses(closing || []);

          // Stale accounts: no call_log in 14+ days
          const fourteenDaysAgo = new Date();
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

          const { data: recentCallData } = await supabase
            .from('call_logs')
            .select('surgeon_id, call_date')
            .eq('user_id', user.id)
            .in('surgeon_id', myAccountIds)
            .gte('call_date', fourteenDaysAgo.toISOString());

          const recentlyCalledIds = new Set((recentCallData || []).map(c => c.surgeon_id));
          const staleIds = myAccountIds.filter(id => !recentlyCalledIds.has(id));

          if (staleIds.length > 0) {
            const { data: staleSurgeons } = await supabase
              .from('surgeons')
              .select('id, full_name, first_name, last_name, specialty')
              .in('id', staleIds.slice(0, 20));
            setStaleAccounts(staleSurgeons || []);
          } else {
            setStaleAccounts([]);
          }
        }
      } catch (err) {
        console.error('[RepDashboard] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.id]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Accounts', value: totalAccounts, color: '#1e293b', icon: <BriefcaseIcon /> },
    { label: 'Calls (7d)', value: callsThisWeek, color: '#1e3a8a', icon: <PhoneIcon /> },
    { label: 'Closing Soon', value: upcomingCloses.length, color: '#7c3aed', icon: <CalendarIcon /> },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <h2 style={styles.pageTitle}>My Territory</h2>
        <div style={styles.quickActions}>
          <button onClick={() => navigate('/field-intel/call-log/new')} style={styles.actionBtn}>
            <PlusIcon /> Log Call
          </button>
          <button onClick={() => navigate('/field-intel/leads/new')} style={styles.actionBtnSecondary}>
            <PlusIcon /> Lead
          </button>
        </div>
      </div>

      <DashboardMetrics metrics={metrics} />

      {/* Upcoming Close Dates */}
      {upcomingCloses.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Upcoming Close Dates</span>
          <div style={styles.list}>
            {upcomingCloses.map(surgeon => {
              const name = surgeon.full_name
                || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim();
              return (
                <button
                  key={surgeon.id}
                  onClick={() => navigate(`/field-intel/dossier/${surgeon.id}`)}
                  style={styles.row}
                >
                  <span style={styles.rowName}>{name}</span>
                  <span style={styles.rowDate}>
                    {new Date(surgeon.forecast_close_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Calls */}
      {recentCalls.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Recent Calls</span>
          <div style={styles.list}>
            {recentCalls.map(call => {
              const surgeonName = call.surgeon
                ? (call.surgeon.full_name || `${call.surgeon.first_name || ''} ${call.surgeon.last_name || ''}`.trim())
                : 'Unknown';
              return (
                <button
                  key={call.id}
                  onClick={() => navigate(`/field-intel/dossier/${call.surgeon_id}`)}
                  style={styles.row}
                >
                  <div style={styles.rowInfo}>
                    <span style={styles.rowName}>{surgeonName}</span>
                    {call.summary && (
                      <span style={styles.rowSummary}>
                        {call.summary.length > 60 ? call.summary.slice(0, 60) + '...' : call.summary}
                      </span>
                    )}
                  </div>
                  <span style={styles.rowDate}>
                    {new Date(call.call_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stale Accounts */}
      {staleAccounts.length > 0 && (
        <div style={styles.section}>
          <div style={styles.staleTitleRow}>
            <span style={styles.sectionTitle}>Needs Attention</span>
            <StaleAccountIndicator daysSinceActivity={14} />
          </div>
          <div style={styles.list}>
            {staleAccounts.map(surgeon => {
              const name = surgeon.full_name
                || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim();
              return (
                <button
                  key={surgeon.id}
                  onClick={() => navigate(`/field-intel/dossier/${surgeon.id}`)}
                  style={{ ...styles.row, border: '1px solid #fde68a' }}
                >
                  <span style={styles.rowName}>{name}</span>
                  {surgeon.specialty && <span style={styles.rowMeta}>{surgeon.specialty}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ height: '24px' }} />
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
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '60px 0',
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
    color: '#64748b',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  quickActions: {
    display: 'flex',
    gap: '6px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '7px 12px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionBtnSecondary: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '7px 12px',
    backgroundColor: '#ffffff',
    color: '#1e3a8a',
    border: '1px solid #1e3a8a',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
  },
  staleTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '12px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  rowInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  rowSummary: {
    fontSize: '12px',
    color: '#64748b',
  },
  rowDate: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    flexShrink: 0,
  },
  rowMeta: {
    fontSize: '12px',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '2px 6px',
    borderRadius: '4px',
    flexShrink: 0,
  },
};

export default RepDashboard;
