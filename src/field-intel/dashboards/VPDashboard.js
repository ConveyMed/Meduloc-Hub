import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFieldIntel } from '../FieldIntelContext';
import { supabase } from '../../config/supabase';
import DashboardMetrics from './DashboardMetrics';
import PersonCard from '../PersonCard';
import UnassignedPool from '../UnassignedPool';

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const VPDashboard = () => {
  const { user } = useAuth();
  const { regionIds } = useFieldIntel();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [managers, setManagers] = useState([]);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [callsThisWeek, setCallsThisWeek] = useState(0);
  const [unassignedManagers, setUnassignedManagers] = useState([]);
  const [unassignedAccounts, setUnassignedAccounts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        // Fetch regions
        if (regionIds.length > 0) {
          const { data: regionData } = await supabase
            .from('regions')
            .select('id, name')
            .in('id', regionIds)
            .order('name');
          setRegions(regionData || []);
          if (!selectedRegion && regionData?.length > 0) {
            setSelectedRegion(regionData[0].id);
          }
        }

        // Get managers under this VP
        const { data: mgrAssigns } = await supabase
          .from('hierarchy_assignments')
          .select('user_id, role_tier, custom_label')
          .eq('parent_user_id', user.id)
          .eq('role_tier', 'manager');

        const mgrIds = (mgrAssigns || []).map(m => m.user_id);
        let mgrUsers = [];
        if (mgrIds.length > 0) {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', mgrIds);
          mgrUsers = data || [];
        }

        const mgrCards = await Promise.all((mgrAssigns || []).map(async (m) => {
          const mgrUser = mgrUsers.find(u => u.id === m.user_id);
          const { data: acctCountData } = await supabase
            .from('account_delegations')
            .select('id')
            .eq('delegated_to', m.user_id);

          const { data: lastCall } = await supabase
            .from('call_logs')
            .select('call_date')
            .eq('user_id', m.user_id)
            .order('call_date', { ascending: false })
            .limit(1);

          return {
            id: m.user_id,
            userId: m.user_id,
            name: mgrUser ? `${mgrUser.first_name || ''} ${mgrUser.last_name || ''}`.trim() || mgrUser.email : 'Unknown',
            role: m.role_tier,
            custom_label: m.custom_label,
            accountCount: (acctCountData || []).length,
            lastActivity: lastCall?.[0]?.call_date || null,
          };
        }));

        setManagers(mgrCards);

        // Total accounts in region
        if (regionIds.length > 0) {
          const { data: srData } = await supabase
            .from('surgeon_regions')
            .select('surgeon_id')
            .in('region_id', regionIds);
          const surgeonIds = [...new Set((srData || []).map(r => r.surgeon_id))];
          setTotalAccounts(surgeonIds.length);

          // Unassigned accounts
          if (surgeonIds.length > 0) {
            const { data: delegated } = await supabase
              .from('account_delegations')
              .select('surgeon_id')
              .in('surgeon_id', surgeonIds);
            const delegatedIds = new Set((delegated || []).map(d => d.surgeon_id));
            const unassignedIds = surgeonIds.filter(id => !delegatedIds.has(id));

            if (unassignedIds.length > 0) {
              const { data: surgeons } = await supabase
                .from('surgeons')
                .select('id, full_name, first_name, last_name, specialty')
                .in('id', unassignedIds.slice(0, 50));
              setUnassignedAccounts(surgeons || []);
            }
          }
        }

        // Unassigned managers
        const { data: orphanManagers } = await supabase
          .from('hierarchy_assignments')
          .select('user_id, role_tier')
          .eq('role_tier', 'manager')
          .is('parent_user_id', null);

        if (orphanManagers?.length > 0) {
          const orphanIds = orphanManagers.map(o => o.user_id);
          const { data: orphanUsers } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', orphanIds);
          setUnassignedManagers((orphanUsers || []).map(u => ({ ...u, role_tier: 'manager' })));
        }

        // Team calls this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        // Get all people under VP (managers + their reps)
        let allTeamIds = [...mgrIds];
        if (mgrIds.length > 0) {
          const { data: repAssigns } = await supabase
            .from('hierarchy_assignments')
            .select('user_id')
            .in('parent_user_id', mgrIds)
            .eq('role_tier', 'rep');
          allTeamIds = [...allTeamIds, ...(repAssigns || []).map(r => r.user_id)];
        }

        if (allTeamIds.length > 0) {
          const { data: callCountData } = await supabase
            .from('call_logs')
            .select('id')
            .in('user_id', allTeamIds)
            .gte('call_date', weekAgo.toISOString());
          setCallsThisWeek((callCountData || []).length);

          // Recent activity
          const { data: calls } = await supabase
            .from('call_logs')
            .select('*, surgeon:surgeons(full_name, first_name, last_name), rep:users!call_logs_user_id_fkey(first_name, last_name)')
            .in('user_id', allTeamIds)
            .order('call_date', { ascending: false })
            .limit(10);
          setRecentActivity(calls || []);
        }
      } catch (err) {
        console.error('[VPDashboard] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.id, regionIds, selectedRegion]);

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
    { label: 'Managers', value: managers.length, color: '#7c3aed', icon: <UsersIcon /> },
    { label: 'Accounts', value: totalAccounts, color: '#059669', icon: <BriefcaseIcon /> },
    { label: 'Unassigned', value: unassignedAccounts.length, color: '#d97706', icon: <AlertIcon /> },
    { label: 'Calls (7d)', value: callsThisWeek, color: '#1e3a8a', icon: <PhoneIcon /> },
  ];

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Dashboard</h2>

      {/* Region Picker */}
      {regions.length > 1 && (
        <div style={styles.regionPicker}>
          {regions.map(region => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              style={{
                ...styles.regionTab,
                ...(selectedRegion === region.id ? styles.regionTabActive : {}),
              }}
            >
              {region.name}
            </button>
          ))}
        </div>
      )}

      <DashboardMetrics metrics={metrics} />

      {/* Manager Cards */}
      {managers.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Managers</span>
          <div style={styles.cardList}>
            {managers.map(mgr => (
              <PersonCard key={mgr.id} person={mgr} />
            ))}
          </div>
        </div>
      )}

      {/* Unassigned */}
      <UnassignedPool accounts={unassignedAccounts} people={unassignedManagers} />

      {/* Activity Feed */}
      {recentActivity.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Region Activity</span>
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
  regionPicker: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
  },
  regionTab: {
    padding: '6px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  regionTabActive: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: '1px solid #1e3a8a',
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

export default VPDashboard;
