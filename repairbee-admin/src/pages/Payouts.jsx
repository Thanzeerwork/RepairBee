import React, { useState, useEffect } from 'react';
import { withdrawalsApi } from '../api/client';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Building,
  User,
  Clock,
  ArrowUpRight,
  Landmark,
  X,
  Check,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';

export default function Payouts() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all' | 'processed'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'shop' | 'partner'
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Disbursement Modal State
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [disbursementNote, setDisbursementNote] = useState('');

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await withdrawalsApi.getWithdrawals();
      const list = res?.data || (Array.isArray(res) ? res : []);
      setWithdrawals(list);
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
      setErrorMsg(err?.message || 'Error fetching bank payout requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const openDisburseModal = (item) => {
    setSelectedWithdrawal(item);
    setUtrNumber(`IMPS-${Date.now().toString().slice(-8)}`);
    setDisbursementNote(`Settled to ${item.bank_name || 'Bank'} Account ending in ${item.bank_account_number?.slice(-4) || '****'}`);
    setModalOpen(true);
  };

  const handleConfirmDisbursement = async (e) => {
    e?.preventDefault();
    if (!selectedWithdrawal) return;
    if (!utrNumber.trim()) {
      setErrorMsg('Please enter a valid IMPS/NEFT UTR reference number.');
      return;
    }

    setActionLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await withdrawalsApi.processWithdrawal(selectedWithdrawal.id, {
        status: 'processed',
        admin_note: `UTR: ${utrNumber.trim()} • ${disbursementNote.trim()}`
      });
      setSuccessMsg(`✓ Payout of ₹${Number(selectedWithdrawal.amount).toLocaleString()} disbursed successfully! UTR: ${utrNumber.trim()}`);
      setModalOpen(false);
      setSelectedWithdrawal(null);
      await loadWithdrawals();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to process bank disbursement');
    } finally {
      setActionLoading(false);
      setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 6000);
    }
  };

  const handleRejectWithdrawal = async (item) => {
    const reason = window.prompt(`Enter reason for rejecting payout WD-#${item.id.slice(0, 8)}:`, 'Invalid account details');
    if (!reason) return;

    setActionLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await withdrawalsApi.processWithdrawal(item.id, {
        status: 'failed',
        admin_note: `Rejected: ${reason}`
      });
      setSuccessMsg(`Payout WD-#${item.id.slice(0, 8)} marked as failed/rejected.`);
      await loadWithdrawals();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to reject payout');
    } finally {
      setActionLoading(false);
      setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 6000);
    }
  };

  // Filtered List
  const filteredWithdrawals = withdrawals.filter(w => {
    if (activeTab === 'pending' && w.status !== 'pending') return false;
    if (activeTab === 'processed' && w.status !== 'processed') return false;
    if (roleFilter !== 'all' && w.user_role !== roleFilter) return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (w.id && w.id.toLowerCase().includes(q)) ||
      (w.bank_account_name && w.bank_account_name.toLowerCase().includes(q)) ||
      (w.user_name && w.user_name.toLowerCase().includes(q)) ||
      (w.bank_name && w.bank_name.toLowerCase().includes(q)) ||
      (w.bank_account_number && w.bank_account_number.includes(q)) ||
      (w.bank_ifsc && w.bank_ifsc.toLowerCase().includes(q)) ||
      (w.admin_note && w.admin_note.toLowerCase().includes(q))
    );
  });

  const pendingList = withdrawals.filter(w => w.status === 'pending');
  const processedList = withdrawals.filter(w => w.status === 'processed');
  const totalDisbursed = processedList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalPending = pendingList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* HEADER & METRIC SUMMARY */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Merchant & Partner Payout Settlements
            </h1>
            <span className="badge-amber" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px' }}>
              {pendingList.length} Pending Clearance
            </span>
            <span className="badge-emerald" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px' }}>
              {processedList.length} Disbursed
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Live bank settlement queue from PostgreSQL • Review workshop earnings, verify IFSC routes, and issue NEFT/IMPS UTR references.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadWithdrawals} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} className={loading ? 'live-pulse' : ''} />
            <span>Sync Live DB</span>
          </button>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="terminal-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Clearance
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            ₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {pendingList.length} requests awaiting bank wire
          </div>
        </div>

        <div className="terminal-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Settled Disbursed
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            ₹{totalDisbursed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {processedList.length} payments finalized via IMPS/NEFT
          </div>
        </div>

        <div className="terminal-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Platform Escrow Protection
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            15% Net Margin
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Retained from workshop quotes
          </div>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
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

      {/* FILTER TABS & CONTROLS */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '10px 14px',
        background: '#111827',
        border: '1px solid var(--border-default)',
        borderRadius: '6px'
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              background: activeTab === 'pending' ? 'var(--primary)' : '#0e1420',
              color: activeTab === 'pending' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'pending' ? '1px solid var(--primary)' : '1px solid #1e293b',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Pending Clearance ({pendingList.length})
          </button>
          <button
            onClick={() => setActiveTab('processed')}
            style={{
              background: activeTab === 'processed' ? 'var(--primary)' : '#0e1420',
              color: activeTab === 'processed' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'processed' ? '1px solid var(--primary)' : '1px solid #1e293b',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Processed & Disbursed ({processedList.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              background: activeTab === 'all' ? 'var(--primary)' : '#0e1420',
              color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'all' ? '1px solid var(--primary)' : '1px solid #1e293b',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            All Ledger Records ({withdrawals.length})
          </button>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="terminal-input"
            style={{ padding: '3px 8px', fontSize: '11px' }}
          >
            <option value="all">All Roles (Shops & Partners)</option>
            <option value="shop">Workshop Merchants Only</option>
            <option value="partner">Delivery Partners Only</option>
          </select>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, bank, UTR..."
            className="terminal-input"
            style={{ width: '100%', paddingLeft: '30px' }}
          />
        </div>
      </div>

      {/* WITHDRAWALS DATA TABLE */}
      <div className="terminal-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="terminal-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Request ID & Date</th>
                <th>Beneficiary & Entity</th>
                <th>Amount (₹)</th>
                <th>Destination Bank Details</th>
                <th>Status</th>
                <th>UTR / Settlement Note</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.length > 0 ? (
                filteredWithdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                        WD-#{w.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(w.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{w.user_name || w.bank_account_name || 'Workshop Account'}</span>
                        <span className={w.user_role === 'shop' ? 'badge-amber' : 'badge-blue'} style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '9px', textTransform: 'uppercase' }}>
                          {w.user_role === 'shop' ? 'Workshop' : 'Partner'}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Beneficiary: {w.bank_account_name || '—'}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8', fontSize: '13px' }}>
                        ₹{Number(w.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{w.bank_name || 'HDFC Bank'}</div>
                      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        Acc: {w.bank_account_number || '••••'} • IFSC: <span style={{ color: '#34d399' }}>{w.bank_ifsc || '—'}</span>
                      </div>
                    </td>

                    <td>
                      {w.status === 'processed' ? (
                        <span className="badge-emerald" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px' }}>
                          ✓ Disbursed
                        </span>
                      ) : w.status === 'pending' ? (
                        <span className="badge-amber" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px' }}>
                          Pending Clearance
                        </span>
                      ) : (
                        <span className="badge-rose" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px' }}>
                          Failed
                        </span>
                      )}
                    </td>

                    <td style={{ maxWidth: '240px', fontSize: '11px' }}>
                      {w.admin_note ? (
                        <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)' }}>{w.admin_note}</span>
                      ) : w.status === 'pending' ? (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Awaiting UTR clearance</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    <td>
                      {w.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            disabled={actionLoading}
                            onClick={() => openDisburseModal(w)}
                            className="btn-primary"
                            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <ArrowUpRight size={12} />
                            <span>Disburse</span>
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleRejectWithdrawal(w)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              background: '#1f1315',
                              border: '1px solid #e11d48',
                              color: '#fb7185',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            title="Reject request"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {w.processed_at ? new Date(w.processed_at).toLocaleDateString() : 'Settled'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No payout settlement records found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISBURSEMENT CONFIRMATION MODAL */}
      {modalOpen && selectedWithdrawal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="terminal-card" style={{ maxWidth: '520px', width: '100%', padding: '24px', background: '#0e1420' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Landmark size={18} color="#10b981" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Confirm Bank Payout Disbursement
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDisbursement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Summary Box */}
              <div style={{ padding: '14px', background: '#111827', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Disbursement Amount</span>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                    ₹{Number(selectedWithdrawal.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div><strong>Beneficiary:</strong> {selectedWithdrawal.bank_account_name || selectedWithdrawal.user_name}</div>
                  <div><strong>Bank Name:</strong> {selectedWithdrawal.bank_name || 'HDFC Bank'}</div>
                  <div><strong>Account Number:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedWithdrawal.bank_account_number}</span></div>
                  <div><strong>IFSC Code:</strong> <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{selectedWithdrawal.bank_ifsc}</span></div>
                </div>
              </div>

              {/* UTR Input */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  IMPS / NEFT UTR Reference Number *
                </label>
                <input
                  type="text"
                  required
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. HDFC-IMPS-98124981"
                  className="terminal-input"
                  style={{ width: '100%', marginTop: '4px', fontFamily: 'var(--font-mono)' }}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                  The reference code provided by your corporate banking portal upon wire dispatch.
                </span>
              </div>

              {/* Settlement Note */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Settlement Dispatch Note
                </label>
                <input
                  type="text"
                  value={disbursementNote}
                  onChange={(e) => setDisbursementNote(e.target.value)}
                  placeholder="Settlement notes..."
                  className="terminal-input"
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '8px 18px', background: '#059669', borderColor: '#10b981' }}
                >
                  <Check size={14} />
                  <span style={{ marginLeft: '6px' }}>{actionLoading ? 'Disbursing...' : 'Confirm & Mark Processed'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
