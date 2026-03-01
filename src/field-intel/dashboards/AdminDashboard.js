import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import DashboardMetrics from './DashboardMetrics';

const DatabaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [totalSurgeons, setTotalSurgeons] = useState(0);
  const [totalHierarchyUsers, setTotalHierarchyUsers] = useState(0);
  const [totalCallLogs, setTotalCallLogs] = useState(0);
  const [pendingLeads, setPendingLeads] = useState(0);
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        // Global counts in parallel
        const [surgeonsRes, hierarchyRes, callsRes, leadsRes, regionsRes] = await Promise.all([
          supabase.from('surgeons').select('id'),
          supabase.from('hierarchy_assignments').select('user_id'),
          supabase.from('call_logs').select('id'),
          supabase.from('leads').select('id').eq('status', 'pending'),
          supabase.from('regions').select('*').order('name'),
        ]);

        setTotalSurgeons((surgeonsRes.data || []).length);
        setTotalHierarchyUsers((hierarchyRes.data || []).length);
        setTotalCallLogs((callsRes.data || []).length);
        setPendingLeads((leadsRes.data || []).length);

        // Region summaries with VP names
        const regionData = regionsRes.data || [];
        const regionSummaries = await Promise.all(regionData.map(async (region) => {
          // Get VP for this region
          const { data: vpAssigns } = await supabase
            .from('hierarchy_assignments')
            .select('user_id')
            .eq('region_id', region.id)
            .eq('role_tier', 'vp')
            .limit(1);

          let vpName = 'No VP assigned';
          let vpUserId = null;
          if (vpAssigns?.[0]) {
            vpUserId = vpAssigns[0].user_id;
            const { data: vpUser } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', vpUserId)
              .single();
            if (vpUser) {
              vpName = `${vpUser.first_name || ''} ${vpUser.last_name || ''}`.trim() || 'Unknown';
            }
          }

          // Account count in region
          const { data: accountCountData } = await supabase
            .from('surgeon_regions')
            .select('surgeon_id')
            .eq('region_id', region.id);

          return {
            ...region,
            vpName,
            vpUserId,
            accountCount: (accountCountData || []).length,
          };
        }));

        setRegions(regionSummaries);
      } catch (err) {
        console.error('[AdminDashboard] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

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
    { label: 'Surgeons', value: totalSurgeons, color: '#1e3a8a', icon: <DatabaseIcon /> },
    { label: 'Hierarchy', value: totalHierarchyUsers, color: '#7c3aed', icon: <UsersIcon /> },
    { label: 'Call Logs', value: totalCallLogs, color: '#059669', icon: <PhoneIcon /> },
    { label: 'Regions', value: regions.length, color: '#d97706', icon: <GlobeIcon /> },
  ];

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Admin Dashboard</h2>

      <DashboardMetrics metrics={metrics} />

      {/* Pending Leads */}
      {pendingLeads > 0 && (
        <button
          onClick={() => navigate('/field-intel/leads')}
          style={styles.pendingBanner}
        >
          <span style={styles.pendingText}>
            {pendingLeads} pending lead{pendingLeads !== 1 ? 's' : ''} awaiting review
          </span>
          <ArrowRightIcon />
        </button>
      )}

      {/* Region Summary Cards */}
      {regions.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionTitle}>Regions</span>
          <div style={styles.cardList}>
            {regions.map(region => (
              <button
                key={region.id}
                style={styles.regionCard}
                onClick={() => {
                  if (region.vpUserId) {
                    navigate(`/field-intel/drill/${region.vpUserId}`);
                  }
                }}
              >
                <div style={styles.regionHeader}>
                  <span style={styles.regionName}>{region.name}</span>
                  <span style={styles.regionAccounts}>{region.accountCount} accounts</span>
                </div>
                <div style={styles.regionFooter}>
                  <span style={styles.regionVP}>{region.vpName}</span>
                  {region.vpUserId && <ArrowRightIcon />}
                </div>
              </button>
            ))}
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
  pendingBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    backgroundColor: '#fefce8',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    color: '#92400e',
  },
  pendingText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
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
  regionCard: {
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
  regionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regionName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  regionAccounts: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  regionFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#94a3b8',
  },
  regionVP: {
    fontSize: '12px',
    color: '#94a3b8',
  },
};

export default AdminDashboard;
