import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import DashboardMetrics from './DashboardMetrics';
import PersonCard from '../PersonCard';
import UnassignedPool from '../UnassignedPool';

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [reps, setReps] = useState([]);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [unassignedAccounts, setUnassignedAccounts] = useState([]);
  const [teamCallsThisWeek, setTeamCallsThisWeek] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        // Get reps under this manager
        const { data: repAssigns } = await supabase
          .from('hierarchy_assignments')
          .select('user_id, role_tier, custom_label')
          .eq('parent_user_id', user.id)
          .eq('role_tier', 'rep');

        const repIds = (repAssigns || []).map(r => r.user_id);
        let repUsers = [];
        if (repIds.length > 0) {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', repIds);
          repUsers = data || [];
        }

        // Get account counts and last activity per rep
        const repCards = await Promise.all((repAssigns || []).map(async (r) => {
          const repUser = repUsers.find(u => u.id === r.user_id);
          const { data: acctCountData } = await supabase
            .from('account_delegations')
            .select('id')
            .eq('delegated_to', r.user_id);

          const { data: lastCall } = await supabase
            .from('call_logs')
            .select('call_date')
            .eq('user_id', r.user_id)
            .order('call_date', { ascending: false })
            .limit(1);

          return {
            id: r.user_id,
            userId: r.user_id,
            name: repUser ? `${repUser.first_name || ''} ${repUser.last_name || ''}`.trim() || repUser.email : 'Unknown',
            role: r.role_tier,
            custom_label: r.custom_label,
            accountCount: (acctCountData || []).length,
            lastActivity: lastCall?.[0]?.call_date || null,
          };
        }));

        setReps(repCards);

        // Total accounts delegated to this manager
        const { data: myDelegations } = await supabase
          .from('account_delegations')
          .select('surgeon_id')
          .eq('delegated_to', user.id);

        const myAccountIds = (myDelegations || []).map(d => d.surgeon_id);
        setTotalAccounts(myAccountIds.length);

        // Find unassigned accounts (delegated to manager but not to any rep)
        if (myAccountIds.length > 0) {
          const { data: subDelegations } = await supabase
            .from('account_delegations')
            .select('surgeon_id')
            .eq('delegated_by', user.id);

          const subDelegatedIds = new Set((subDelegations || []).map(d => d.surgeon_id));
          const unassignedIds = myAccountIds.filter(id => !subDelegatedIds.has(id));

          if (unassignedIds.length > 0) {
            const { data: surgeons } = await supabase
              .from('surgeons')
              .select('id, full_name, first_name, last_name, specialty')
              .in('id', unassignedIds.slice(0, 50));
            setUnassignedAccounts(surgeons || []);
          }
        }

        // Team calls this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (repIds.length > 0) {
          const { data: callCountData } = await supabase
            .from('call_logs')
            .select('id')
            .in('user_id', repIds)
            .gte('call_date', weekAgo.toISOString());
          setTeamCallsThisWeek((callCountData || []).length);
        }

        // Recent team activity
        if (repIds.length > 0) {
          const { data: calls } = await supabase
            .from('call_logs')
            .select('*, surgeon:surgeons(full_name, first_name, last_name), rep:users!call_logs_user_id_fkey(first_name, last_name)')
            .in('user_id', repIds)
            .order('call_date', { ascending: false })
            .limit(10);
          setRecentActivity(calls || []);
        }
      } catch (err) {
        console.error('[ManagerDashboard] Error:', err);
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
    { label: 'Reps', value: reps.length, color: '#2563eb', icon: <UsersIcon /> },
    { label: 'Accounts', value: totalAccounts, color: '#059669', icon: <BriefcaseIcon /> },
    { label: 'Unassigned', value: unassignedAccounts.length, color: '#d97706', icon: <AlertIcon /> },
    { label: 'Calls (7d)', value: teamCallsThisWeek, color: '#1e3a8a', icon: <PhoneIcon /> },
  ];

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Team Overview</h2>

      <DashboardMetrics metrics={metrics} />

      {/* Rep Cards */}
      {reps.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Reps</span>
          <div style={styles.cardList}>
            {reps.map(rep => (
              <PersonCard key={rep.id} person={rep} />
            ))}
          </div>
        </div>
      )}

      {/* Unassigned Pool */}
      <UnassignedPool accounts={unassignedAccounts} people={[]} />

      {/* Team Activity Feed */}
      {recentActivity.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Team Activity</span>
          <div style={styles.cardList}>
            {recentActivity.map(call => {
              const surgeonName = call.surgeon
                ? (call.surgeon.full_name || `${call.surgeon.first_name || ''} ${call.surgeon.last_name || ''}`.trim())
                : 'Unknown';
              const repName = call.rep
                ? `${call.rep.first_name || ''} ${call.rep.last_name || ''}`.trim()
                : '';

              return (
                <button
                  key={call.id}
                  onClick={() => navigate(`/field-intel/dossier/${call.surgeon_id}`)}
                  style={styles.activityRow}
                >
                  <div style={styles.activityHeader}>
                    <span style={styles.activitySurgeon}>{surgeonName}</span>
                    <span style={styles.activityDate}>
                      {new Date(call.call_date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                      })}
                    </span>
                  </div>
                  {repName && <span style={styles.activityRep}>{repName}</span>}
                  {call.summary && (
                    <span style={styles.activitySummary}>
                      {call.summary.length > 80 ? call.summary.slice(0, 80) + '...' : call.summary}
                    </span>
                  )}
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
  pageTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
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
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  activityRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  activityHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activitySurgeon: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
  },
  activityDate: {
    fontSize: '12px',
    color: '#64748b',
  },
  activityRep: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  activitySummary: {
    fontSize: '12px',
    color: '#334155',
    lineHeight: '1.4',
  },
};

export default ManagerDashboard;
