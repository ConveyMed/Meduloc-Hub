import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFieldIntel } from '../FieldIntelContext';
import { supabase } from '../../config/supabase';

const ActivityFeed = () => {
  const { user } = useAuth();
  const { role } = useFieldIntel();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState([]);
  const [displayCount, setDisplayCount] = useState(20);

  useEffect(() => {
    if (!user?.id || !role) return;

    const fetchActivity = async () => {
      setLoading(true);
      try {
        let userIds = [user.id];

        if (role === 'manager') {
          // Get reps under this manager
          const { data: repAssigns } = await supabase
            .from('hierarchy_assignments')
            .select('user_id')
            .eq('parent_user_id', user.id)
            .eq('role_tier', 'rep');
          userIds = [...userIds, ...(repAssigns || []).map(r => r.user_id)];
        } else if (role === 'vp') {
          // Get managers + their reps
          const { data: mgrAssigns } = await supabase
            .from('hierarchy_assignments')
            .select('user_id')
            .eq('parent_user_id', user.id)
            .eq('role_tier', 'manager');

          const mgrIds = (mgrAssigns || []).map(m => m.user_id);
          userIds = [...userIds, ...mgrIds];

          if (mgrIds.length > 0) {
            const { data: repAssigns } = await supabase
              .from('hierarchy_assignments')
              .select('user_id')
              .in('parent_user_id', mgrIds)
              .eq('role_tier', 'rep');
            userIds = [...userIds, ...(repAssigns || []).map(r => r.user_id)];
          }
        } else if (role === 'admin') {
          // Admin sees all - no filter
          userIds = null;
        }

        let query = supabase
          .from('call_logs')
          .select('*, surgeon:surgeons(full_name, first_name, last_name), rep:users!call_logs_user_id_fkey(first_name, last_name)')
          .order('call_date', { ascending: false })
          .limit(100);

        if (userIds) {
          query = query.in('user_id', userIds);
        }

        const { data, error } = await query;

        if (error) {
          // Fallback without join
          let fallback = supabase
            .from('call_logs')
            .select('*, surgeon:surgeons(full_name, first_name, last_name)')
            .order('call_date', { ascending: false })
            .limit(100);

          if (userIds) {
            fallback = fallback.in('user_id', userIds);
          }

          const { data: fb } = await fallback;
          setCalls(fb || []);
        } else {
          setCalls(data || []);
        }
      } catch (err) {
        console.error('[ActivityFeed] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [user?.id, role]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading activity...</span>
        </div>
      </div>
    );
  }

  const visible = calls.slice(0, displayCount);
  const hasMore = calls.length > displayCount;

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Activity Feed</h2>
      <span style={styles.countLabel}>
        {calls.length} call{calls.length !== 1 ? 's' : ''}
      </span>

      <div style={styles.list}>
        {calls.length === 0 && (
          <div style={styles.emptyState}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={styles.emptyText}>No activity yet</span>
          </div>
        )}

        {visible.map(call => {
          const surgeonName = call.surgeon
            ? (call.surgeon.full_name || `${call.surgeon.first_name || ''} ${call.surgeon.last_name || ''}`.trim())
            : 'Unknown';
          const repName = call.rep
            ? `${call.rep.first_name || ''} ${call.rep.last_name || ''}`.trim()
            : '';

          const updates = [];
          if (call.buying_stage_update) updates.push(`Stage: ${call.buying_stage_update}`);
          if (call.contract_status_update) updates.push(`Contract: ${call.contract_status_update}`);
          if (call.forecast_close_date_update) {
            updates.push(`Close: ${new Date(call.forecast_close_date_update).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
          }

          return (
            <button
              key={call.id}
              onClick={() => navigate(`/field-intel/dossier/${call.surgeon_id}`)}
              style={styles.row}
            >
              <div style={styles.rowHeader}>
                <span style={styles.surgeonName}>{surgeonName}</span>
                <span style={styles.date}>
                  {new Date(call.call_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  })}
                </span>
              </div>
              {repName && <span style={styles.repName}>{repName}</span>}
              {call.summary && (
                <p style={styles.summary}>
                  {call.summary.length > 120 ? call.summary.slice(0, 120) + '...' : call.summary}
                </p>
              )}
              {updates.length > 0 && (
                <div style={styles.updatesRow}>
                  {updates.map((u, i) => (
                    <span key={i} style={styles.updateTag}>{u}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setDisplayCount(prev => prev + 20)}
            style={styles.loadMoreBtn}
          >
            Show more ({(calls.length - displayCount)} remaining)
          </button>
        )}
      </div>
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
    gap: '12px',
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
  countLabel: {
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingBottom: '24px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '40px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  rowHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  surgeonName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  date: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
  },
  repName: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  summary: {
    fontSize: '13px',
    color: '#334155',
    lineHeight: '1.5',
    margin: 0,
  },
  updatesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '4px',
  },
  updateTag: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#a16207',
    backgroundColor: '#fefce8',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  loadMoreBtn: {
    display: 'flex',
    justifyContent: 'center',
    padding: '14px',
    backgroundColor: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e3a8a',
  },
};

export default ActivityFeed;
