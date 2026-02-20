import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFieldIntel } from './FieldIntelContext';
import { supabase } from '../config/supabase';

const LeadQueue = () => {
  const { user } = useAuth();
  const { role } = useFieldIntel();
  const navigate = useNavigate();
  const isAdmin = role === 'admin';

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchLeads();
  }, [user?.id, filter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*, submitter:users!leads_submitted_by_fkey(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        // Fallback without join
        console.warn('[LeadQueue] Join failed, trying fallback:', error);
        let fallback = supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });
        if (filter !== 'all') fallback = fallback.eq('status', filter);
        const { data: fb } = await fallback;
        setLeads(fb || []);
      } else {
        setLeads(data || []);
      }
    } catch (err) {
      console.error('[LeadQueue] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (lead) => {
    setProcessing(lead.id);
    try {
      // Create surgeon record from lead
      const { data: surgeon, error: surgeonErr } = await supabase
        .from('surgeons')
        .insert({
          first_name: lead.first_name,
          last_name: lead.last_name,
          full_name: `${lead.first_name} ${lead.last_name}`.trim(),
          city: lead.city,
          state: lead.state,
          specialty: lead.specialty,
        })
        .select()
        .single();

      if (surgeonErr) throw surgeonErr;

      // Update lead status
      const { error: updateErr } = await supabase
        .from('leads')
        .update({
          status: 'approved',
          approved_by: user.id,
          surgeon_id: surgeon.id,
        })
        .eq('id', lead.id);

      if (updateErr) throw updateErr;

      // Refresh list
      fetchLeads();
    } catch (err) {
      console.error('[LeadQueue] Approve error:', err);
      alert('Failed to approve lead. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (leadId) => {
    setProcessing(leadId);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'rejected', approved_by: user.id })
        .eq('id', leadId);

      if (error) throw error;
      fetchLeads();
    } catch (err) {
      console.error('[LeadQueue] Reject error:', err);
      alert('Failed to reject lead.');
    } finally {
      setProcessing(null);
    }
  };

  const statusColor = {
    pending: { bg: '#fefce8', text: '#a16207' },
    approved: { bg: '#f0fdf4', text: '#15803d' },
    rejected: { bg: '#fef2f2', text: '#b91c1c' },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading leads...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <h2 style={styles.pageTitle}>Leads</h2>
        <button onClick={() => navigate('/field-intel/leads/new')} style={styles.submitBtn}>
          <PlusIcon /> Submit Lead
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.filterTab,
              ...(filter === f ? styles.filterTabActive : {}),
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <span style={styles.countLabel}>
        {leads.length} lead{leads.length !== 1 ? 's' : ''}
      </span>

      <div style={styles.list}>
        {leads.length === 0 && (
          <div style={styles.emptyState}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span style={styles.emptyText}>
              {filter === 'pending' ? 'No pending leads' : 'No leads found'}
            </span>
          </div>
        )}

        {leads.map(lead => {
          const submitterName = lead.submitter
            ? `${lead.submitter.first_name || ''} ${lead.submitter.last_name || ''}`.trim()
            : 'Unknown';
          const sc = statusColor[lead.status] || statusColor.pending;
          const isProcessing = processing === lead.id;

          return (
            <div key={lead.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.leadName}>
                  {lead.first_name} {lead.last_name}
                </span>
                <span style={{
                  ...styles.statusPill,
                  backgroundColor: sc.bg,
                  color: sc.text,
                }}>
                  {lead.status}
                </span>
              </div>

              <div style={styles.cardMeta}>
                {lead.specialty && <span style={styles.metaTag}>{lead.specialty}</span>}
                {(lead.city || lead.state) && (
                  <span style={styles.metaText}>
                    {[lead.city, lead.state].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>

              {lead.notes && <p style={styles.notes}>{lead.notes}</p>}

              <div style={styles.cardFooter}>
                <span style={styles.footerText}>
                  Submitted by {submitterName} on{' '}
                  {new Date(lead.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </div>

              {/* Admin actions for pending leads */}
              {isAdmin && lead.status === 'pending' && (
                <div style={styles.actions}>
                  <button
                    onClick={() => handleApprove(lead)}
                    disabled={isProcessing}
                    style={styles.approveBtn}
                  >
                    {isProcessing ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(lead.id)}
                    disabled={isProcessing}
                    style={styles.rejectBtn}
                  >
                    Reject
                  </button>
                </div>
              )}

              {lead.status === 'approved' && lead.surgeon_id && (
                <button
                  onClick={() => navigate(`/field-intel/dossier/${lead.surgeon_id}`)}
                  style={styles.viewBtn}
                >
                  View Surgeon Profile
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  filterRow: {
    display: 'flex',
    gap: '6px',
  },
  filterTab: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterTabActive: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: '1px solid #1e3a8a',
  },
  countLabel: {
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingBottom: '24px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '40px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leadName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  statusPill: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '5px',
    textTransform: 'capitalize',
  },
  cardMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  metaTag: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  metaText: {
    fontSize: '12px',
    color: '#64748b',
  },
  notes: {
    fontSize: '13px',
    color: '#334155',
    lineHeight: '1.5',
    margin: 0,
  },
  cardFooter: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '6px',
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  approveBtn: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#15803d',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  rejectBtn: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#ffffff',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  viewBtn: {
    padding: '8px',
    backgroundColor: '#eff6ff',
    color: '#1e3a8a',
    border: '1px solid #93c5fd',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
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
};

export default LeadQueue;
