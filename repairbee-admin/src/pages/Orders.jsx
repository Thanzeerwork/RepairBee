import React, { useState, useEffect } from 'react';
import { ordersApi } from '../api/client';
import {
  Wrench,
  Search,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  Clock,
  RefreshCw,
  Tag,
  PackageCheck,
  DollarSign
} from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [releasingEscrow, setReleasingEscrow] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchLiveOrders = async () => {
    try {
      setLoading(true);
      setActionError('');
      const res = await ordersApi.getOrders();
      const list = res?.data || [];
      setOrders(Array.isArray(list) ? list : []);
      if (Array.isArray(list) && list.length > 0) {
        setSelectedOrder(prev => {
          if (!prev) return list[0];
          const found = list.find(o => o.id === prev.id);
          return found || list[0];
        });
      }
    } catch (err) {
      console.error('Failed to fetch live orders:', err);
      setActionError(err.message || 'Error fetching live orders from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveOrders();
  }, []);

  const handleReleaseEscrow = async (orderId) => {
    setReleasingEscrow(true);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await ordersApi.releaseEscrow(orderId);
      setActionSuccess(res?.message || `Escrow released successfully for order #${orderId.slice(0, 8)}! Funds credited to shop payout wallet.`);
      await fetchLiveOrders();
    } catch (err) {
      setActionError(err?.message || 'Failed to release escrow');
    } finally {
      setReleasingEscrow(false);
      setTimeout(() => {
        setActionSuccess('');
        setActionError('');
      }, 6000);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivery_confirmed':
      case 'completed':
        return <span className="badge-emerald" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500 }}>Delivered & Confirmed</span>;
      case 'pickup_requested':
        return <span className="badge-amber" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500 }}>Pickup Requested</span>;
      case 'in_repair':
      case 'repair_in_progress':
        return <span className="badge-cyan" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500 }}>In Bench Repair</span>;
      case 'out_for_delivery':
        return <span className="badge-purple" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500 }}>Out for Delivery</span>;
      default:
        return <span className="badge-blue" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500 }}>{status?.replace(/_/g, ' ')}</span>;
    }
  };

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'active') return o.current_status !== 'delivery_confirmed' && o.current_status !== 'completed';
    if (activeTab === 'completed') return o.current_status === 'delivery_confirmed' || o.current_status === 'completed';
    if (activeTab === 'warranty') return o.is_warranty_claim;
    return true;
  }).filter(o => {
    if (!search) return true;
    return o.id.toLowerCase().includes(search.toLowerCase()) ||
           (o.customer_name && o.customer_name.toLowerCase().includes(search.toLowerCase())) ||
           (o.shop_name && o.shop_name.toLowerCase().includes(search.toLowerCase())) ||
           (o.product_name && o.product_name.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Repair Orders & Escrow Governance
            </h1>
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(37, 99, 235, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(37, 99, 235, 0.3)'
            }}>
              {orders.length} Live Orders
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Live records from PostgreSQL database • Escrow locked in platform vault until delivery signoff.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchLiveOrders} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} className={loading ? 'live-pulse' : ''} />
            <span>Sync Live DB</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10b981',
          borderRadius: '6px',
          color: '#34d399',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid #f43f5e',
          borderRadius: '6px',
          color: '#fb7185',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertOctagon size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* FILTER TABS & SEARCH */}
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
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'all', label: `All Orders (${orders.length})` },
            { id: 'active', label: 'Active Pipeline' },
            { id: 'completed', label: 'Completed' },
            { id: 'warranty', label: 'Warranty Claims' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'var(--primary)' : '#0e1420',
                color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                border: activeTab === tab.id ? '1px solid var(--primary)' : '1px solid #1e293b',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by Order ID, customer, shop..."
            className="terminal-input"
            style={{ width: '100%', paddingLeft: '30px' }}
          />
        </div>
      </div>

      {/* SPLIT SCREEN: LIVE ORDERS TABLE + DOCKED INSPECTION PANEL */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 430px' : '1fr', gap: '16px' }}>
        {/* DATA TABLE */}
        <div className="terminal-card">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Assigned Shop</th>
                <th>Device & Reported Fault</th>
                <th>Status</th>
                <th>Quote Amount</th>
                <th>Escrow Payout</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No orders matching this filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(ord => {
                  const isSelected = selectedOrder?.id === ord.id;
                  return (
                    <tr
                      key={ord.id}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => setSelectedOrder(ord)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }} title={ord.id}>
                          #{ord.id.slice(0, 8)}
                        </span>
                        {ord.is_warranty_claim && (
                          <div style={{ fontSize: '9px', color: '#fbbf24', marginTop: '2px' }}>Warranty Claim</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{ord.customer_name || 'Customer'}</div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-primary)' }}>{ord.shop_name || 'Assigned Shop'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: '#fff' }}>{ord.product_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ord.description}
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(ord.current_status)}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                          ₹{Number(ord.quote_amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#34d399' }}>
                          ₹{Number(ord.shop_payout || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* RIGHT DOCKED INSPECTION PANEL (LIVE DETAILS) */}
        {selectedOrder && (
          <div className="terminal-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#0e1420' }}>
            {/* Header */}
            <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    Order #{selectedOrder.id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    UUID: {selectedOrder.id}
                  </div>
                </div>
                {getStatusBadge(selectedOrder.current_status)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Device: <strong style={{ color: '#fff' }}>{selectedOrder.product_name}</strong>
              </div>
            </div>

            {/* Scope & Customer Reported Issue */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                Reported Fault Description
              </div>
              <div style={{ padding: '10px', background: '#111827', borderRadius: '4px', border: '1px solid #1e293b', fontSize: '12px', color: '#dfe2ee', lineHeight: '1.4' }}>
                "{selectedOrder.description || 'No description provided.'}"
              </div>
            </div>

            {/* Live Financials & Escrow Breakdown */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                Live Escrow Vault Breakdown
              </div>
              <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Quote Total (GMV):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff' }}>
                    ₹{Number(selectedOrder.quote_amount || 0).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Platform Commission (15%):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    ₹{Number(selectedOrder.commission_amount || 0).toLocaleString()}
                  </span>
                </div>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                  <span style={{ color: '#34d399' }}>Shop Escrow Payout (85%):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    ₹{Number(selectedOrder.shop_payout || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Parties Info */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                Order Parties & Logistics
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                <div style={{ padding: '8px 10px', background: '#111827', borderRadius: '4px', border: '1px solid #1e293b' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Customer</div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{selectedOrder.customer_name || (selectedOrder.customer_id ? `Customer #${selectedOrder.customer_id.slice(0, 8)}` : 'Customer')}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ID: {selectedOrder.customer_id}</div>
                </div>
                <div style={{ padding: '8px 10px', background: '#111827', borderRadius: '4px', border: '1px solid #1e293b' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Assigned Repair Shop</div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{selectedOrder.shop_name || (selectedOrder.shop_id ? `Shop #${selectedOrder.shop_id.slice(0, 8)}` : 'Unassigned')}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ID: {selectedOrder.shop_id}</div>
                </div>
              </div>
            </div>

            {/* Warranty Details if exists */}
            {selectedOrder.warranty_days > 0 && (
              <div style={{ padding: '8px 10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '11px' }}>
                <div style={{ fontWeight: 600, color: '#34d399' }}>🛡️ 30-Day Platform Warranty Active</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Expires on: {new Date(selectedOrder.warranty_expires_at).toLocaleDateString()}
                </div>
              </div>
            )}

            {/* Timestamp metadata */}
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Created: {new Date(selectedOrder.created_at).toLocaleString()}
            </div>

            {/* Action Buttons: Escrow Release */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-default)', paddingTop: '12px' }}>
              <button
                disabled={releasingEscrow || selectedOrder.current_status === 'delivery_confirmed'}
                onClick={() => handleReleaseEscrow(selectedOrder.id)}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '10px',
                  opacity: selectedOrder.current_status === 'delivery_confirmed' ? 0.6 : 1
                }}
              >
                <ShieldCheck size={16} />
                <span>
                  {selectedOrder.current_status === 'delivery_confirmed'
                    ? '✓ Escrow Disbursed to Shop'
                    : releasingEscrow ? 'Processing Release...' : `Release Escrow to Shop (₹${Number(selectedOrder.shop_payout || 0).toLocaleString()})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
