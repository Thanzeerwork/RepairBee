import React, { useState, useEffect } from 'react';
import { disputesApi, withdrawalsApi } from '../api/client';
import {
  AlertOctagon,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Building,
  User,
  Check
} from 'lucide-react';

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionType, setResolutionType] = useState('re_repair');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadLiveData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [dispRes, withRes] = await Promise.allSettled([
        disputesApi.getDisputes(),
        withdrawalsApi.getWithdrawals()
      ]);

      const dispList = dispRes.status === 'fulfilled' ? (dispRes.value?.data || []) : [];
      const withList = withRes.status === 'fulfilled' ? (withRes.value?.data || []) : [];

      setDisputes(Array.isArray(dispList) ? dispList : []);
      setWithdrawals(Array.isArray(withList) ? withList : []);

      if (Array.isArray(dispList) && dispList.length > 0) {
        setSelectedDispute(prev => {
          if (!prev) return dispList[0];
          const found = dispList.find(d => d.id === prev.id);
          return found || dispList[0];
        });
      }
    } catch (err) {
      console.error('Failed to load disputes data:', err);
      setErrorMsg(err.message || 'Failed to load records from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveData();
  }, []);

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    setActionLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await disputesApi.resolveDispute(selectedDispute.id, {
        resolution_type: resolutionType,
        admin_notes: adminNotes || `Resolved as ${resolutionType} by administrator.`
      });
      setSuccessMsg(`Dispute #${selectedDispute.id.slice(0, 8)} successfully resolved as "${resolutionType}"!`);
      await loadLiveData();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to resolve dispute');
    } finally {
      setActionLoading(false);
      setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 6000);
    }
  };

  const handleProcessWithdrawal = async (wId) => {
    setActionLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await withdrawalsApi.processWithdrawal(wId, {
        notes: 'Approved and transferred via bank wire / IMPS'
      });
      setSuccessMsg(`Withdrawal #${wId.slice(0, 8)} processed successfully!`);
      await loadLiveData();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to process withdrawal');
    } finally {
      setActionLoading(false);
      setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 6000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Dispute Mediation & Payout Settlements
            </h1>
            <span className="badge-rose" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px' }}>
              {disputes.length} Total Dispute(s)
            </span>
            <span className="badge-purple" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px' }}>
              {withdrawals.length} Withdrawal Request(s)
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Live arbitration claims and merchant bank payout requests from PostgreSQL.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadLiveData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} className={loading ? 'live-pulse' : ''} />
            <span>Sync Live DB</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '6px', color: '#34d399', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid #f43f5e', borderRadius: '6px', color: '#fb7185', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SPLIT LAYOUT: LEFT QUEUES, RIGHT ARBITRATION DOSSIER */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedDispute ? '1fr 440px' : '1fr', gap: '16px' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* DISPUTES TABLE */}
          <div className="terminal-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertOctagon size={16} style={{ color: '#fb7185' }} />
                <span>Customer Disputes Log ({disputes.length})</span>
              </div>
            </div>

            {disputes.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                ✓ Zero open disputes in the database.
              </div>
            ) : (
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map(d => {
                    const isSelected = selectedDispute?.id === d.id;
                    return (
                      <tr
                        key={d.id}
                        className={isSelected ? 'selected' : ''}
                        onClick={() => setSelectedDispute(d)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fb7185' }} title={d.id}>
                            #{d.id.slice(0, 8)}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{d.raised_by_name || 'Customer'}</div>
                        </td>
                        <td>
                          <div style={{ color: 'var(--text-primary)' }}>{d.product_name || 'Device'}</div>
                        </td>
                        <td>
                          <div style={{ color: '#dfe2ee', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.reason}
                          </div>
                        </td>
                        <td>
                          {d.status === 'resolved' ? (
                            <span className="badge-emerald" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px' }}>
                              Resolved ({d.resolution_type})
                            </span>
                          ) : (
                            <span className="badge-rose" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px' }}>
                              Open / Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* WITHDRAWALS TABLE */}
          <div className="terminal-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={16} style={{ color: '#38bdf8' }} />
                <span>Shop & Partner Withdrawal Requests ({withdrawals.length})</span>
              </div>
            </div>

            {withdrawals.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No withdrawal requests found in database.
              </div>
            ) : (
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th>Amount</th>
                    <th>Bank & Account</th>
                    <th>IFSC</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{w.user_name || w.bank_account_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{w.email}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                          ₹{Number(w.amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div style={{ color: '#fff' }}>{w.bank_name}</div>
                        <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          Acc: {w.bank_account_number}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#38bdf8' }}>
                          {w.bank_ifsc}
                        </span>
                      </td>
                      <td>
                        {w.status === 'processed' ? (
                          <span className="badge-emerald" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px' }}>
                            Processed
                          </span>
                        ) : (
                          <span className="badge-amber" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px' }}>
                            Pending
                          </span>
                        )}
                      </td>
                      <td>
                        {w.status === 'processed' ? (
                          <span style={{ fontSize: '11px', color: '#34d399' }}>✓ Completed</span>
                        ) : (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleProcessWithdrawal(w.id)}
                            className="btn-primary"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                          >
                            Transfer →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT ARBITRATION PANEL */}
        {selectedDispute && (
          <div className="terminal-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#0e1420' }}>
            <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  Case #{selectedDispute.id.slice(0, 8)}
                </span>
                <span className={selectedDispute.status === 'resolved' ? 'badge-emerald' : 'badge-rose'} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                  {selectedDispute.status}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Order #{selectedDispute.order_id?.slice(0, 8)} • Product: <strong>{selectedDispute.product_name}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Workshop: <strong>{selectedDispute.shop_name || 'Assigned Hub'}</strong> • Escrow Locked: <strong style={{ color: '#fb7185' }}>₹{Number(selectedDispute.quote_amount || selectedDispute.total_amount || 0).toLocaleString()}</strong>
              </div>
            </div>

            {/* Claim Details */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Claim Reason
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fb7185' }}>
                "{selectedDispute.reason}"
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Customer Description
              </div>
              <div style={{ padding: '10px', background: '#111827', borderRadius: '4px', border: '1px solid #1e293b', fontSize: '12px', color: '#dfe2ee', lineHeight: '1.4' }}>
                {selectedDispute.description || 'No additional description provided.'}
              </div>
            </div>

            {selectedDispute.evidence_urls && selectedDispute.evidence_urls.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Uploaded Evidence Proof ({selectedDispute.evidence_urls.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                  {selectedDispute.evidence_urls.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt={`Proof ${i+1}`} style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #334155' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Details if resolved */}
            {selectedDispute.status === 'resolved' ? (
              <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#34d399' }}>
                  ✓ Resolved: {selectedDispute.resolution_type?.toUpperCase()}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {selectedDispute.admin_notes || 'Resolved by administrator.'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Resolved at: {new Date(selectedDispute.resolved_at).toLocaleString()}
                </div>
              </div>
            ) : (
              /* Arbitration Form if open */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Select Resolution Ruling
                </div>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value)}
                  className="terminal-input"
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="refund">100% Escrow Refund to Customer Wallet</option>
                  <option value="re_repair">Free Cleanroom Re-Repair by Workshop</option>
                  <option value="rejected">Reject Claim & Release Escrow to Workshop</option>
                </select>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Admin Resolution Notes:</label>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter resolution notes..."
                    className="terminal-input"
                    style={{ width: '100%', marginTop: '4px', resize: 'vertical' }}
                  />
                </div>

                <button
                  disabled={actionLoading}
                  onClick={handleResolveDispute}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '6px' }}
                >
                  <Lock size={15} />
                  <span>Execute Dispute Ruling</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
