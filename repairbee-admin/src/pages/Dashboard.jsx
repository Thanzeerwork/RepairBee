import React, { useState, useEffect } from 'react';
import { analyticsApi, ordersApi, shopsApi, disputesApi } from '../api/client';
import {
  TrendingUp,
  DollarSign,
  Wrench,
  Store,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [orders, setOrders] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [pendingShops, setPendingShops] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLiveData = async () => {
    try {
      setLoading(true);
      const [overviewRes, ordersRes, dailyRes, pendingShopsRes, disputesRes] = await Promise.allSettled([
        analyticsApi.getOverview(),
        ordersApi.getOrders({ limit: 10 }),
        analyticsApi.getOrderStats('daily'),
        shopsApi.getPendingShops(),
        disputesApi.getDisputes({ limit: 5 })
      ]);

      if (overviewRes.status === 'fulfilled') {
        const data = overviewRes.value?.data || overviewRes.value;
        setOverview(data);
      }
      if (ordersRes.status === 'fulfilled') {
        const list = ordersRes.value?.data || [];
        setOrders(Array.isArray(list) ? list : []);
      }
      if (dailyRes.status === 'fulfilled') {
        const stats = dailyRes.value?.data || [];
        if (Array.isArray(stats) && stats.length > 0) {
          setDailyStats(stats.map(s => ({
            day: s.period,
            revenue: Number(s.revenue || 0),
            volume: Number(s.total || 0)
          })));
        }
      }
      if (pendingShopsRes.status === 'fulfilled') {
        const list = pendingShopsRes.value?.data || [];
        setPendingShops(Array.isArray(list) ? list : []);
      }
      if (disputesRes.status === 'fulfilled') {
        const list = disputesRes.value?.data || [];
        setDisputes(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Failed to load live dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveData();
  }, []);

  // Compute actual order status breakdown from live orders
  const statusCounts = orders.reduce((acc, curr) => {
    const st = curr.current_status || 'other';
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  const statusColors = {
    delivery_confirmed: '#10b981',
    completed: '#10b981',
    pickup_requested: '#f59e0b',
    in_repair: '#38bdf8',
    diagnosing: '#a855f7',
    out_for_delivery: '#06b6d4',
    other: '#64748b'
  };

  const statusPieData = Object.keys(statusCounts).map(k => ({
    name: k.replace(/_/g, ' '),
    value: statusCounts[k],
    color: statusColors[k] || '#3b82f6'
  }));

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

  const gmv = Number(overview?.orders?.gmv || 0);
  const commission = Number(overview?.orders?.total_commission || 0);
  const activeOrders = Number(overview?.orders?.active_orders || 0);
  const totalOrders = Number(overview?.orders?.total_orders || 0);
  const totalShops = Number(overview?.users?.total_shop_owners || 0);
  const totalPartners = Number(overview?.users?.total_delivery_partners || 0);
  const totalCustomers = Number(overview?.users?.total_customers || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Live Operations Dashboard
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Real-time Supabase PostgreSQL telemetry • {totalOrders} total repair transactions recorded.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={loadLiveData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} className={loading ? 'live-pulse' : ''} />
            <span>Sync Live Data</span>
          </button>
        </div>
      </div>

      {/* 4 TOP METRIC KPI CARDS (LIVE BACKEND DATA) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Card 1: GMV */}
        <div className="terminal-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Total Platform GMV
            </span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '11px',
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '1px 6px',
              borderRadius: '4px'
            }}>
              Live
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
            ₹{gmv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Total Completed Repairs: <strong style={{ color: 'var(--text-secondary)' }}>{overview?.orders?.completed_orders || 0}</strong>
          </div>
        </div>

        {/* Card 2: Commission */}
        <div className="terminal-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Platform Commission
            </span>
            <span style={{
              fontSize: '11px',
              color: '#38bdf8',
              background: 'rgba(6, 182, 212, 0.1)',
              padding: '1px 6px',
              borderRadius: '4px'
            }}>
              15% Cut
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
            ₹{commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Net platform revenue generated
          </div>
        </div>

        {/* Card 3: Active Orders */}
        <div className="terminal-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Active Repair Pipeline
            </span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#34d399'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} className="live-pulse"></span>
              Live Pipeline
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
            {activeOrders}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Today's Orders: <strong style={{ color: '#fff' }}>{overview?.orders?.today_orders || 0}</strong> • Total: {totalOrders}
          </div>
        </div>

        {/* Card 4: Platform Users */}
        <div className="terminal-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Platform Ecosystem
            </span>
            <span style={{
              fontSize: '11px',
              color: '#c084fc',
              background: 'rgba(139, 92, 246, 0.1)',
              padding: '1px 6px',
              borderRadius: '4px'
            }}>
              Database
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
            {totalShops + totalPartners + totalCustomers}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            <strong style={{ color: '#38bdf8' }}>{totalShops}</strong> Shops • <strong style={{ color: '#34d399' }}>{totalPartners}</strong> Partners • <strong style={{ color: '#c084fc' }}>{totalCustomers}</strong> Customers
          </div>
        </div>
      </div>

      {/* ANALYTICS CHARTS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Left: Revenue Velocity Chart */}
        <div className="terminal-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                Daily Order Revenue & Volume
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Live database aggregation from analytics module
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--primary)' }}></span> Revenue (₹)
              </span>
            </div>
          </div>

          <div style={{ height: '200px', width: '100%' }}>
            {dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats}>
                  <defs>
                    <linearGradient id="colorRevLive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #334155', borderRadius: '4px', fontSize: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevLive)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                Awaiting more historical orders for chart timeline.
              </div>
            )}
          </div>
        </div>

        {/* Right: Lifecycle Breakdown Donut */}
        <div className="terminal-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              Live Order Stages
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Current database status distribution
            </div>
          </div>

          <div style={{ height: '140px', width: '100%', position: 'relative' }}>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No active orders
              </div>
            )}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                {orders.length}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orders</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: 'auto' }}>
            {statusPieData.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color }}></span>
                  <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{item.name}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: LIVE ORDERS STREAM + LIVE QUEUES */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Left: Live Database Orders Stream */}
        <div className="terminal-card">
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                Live Database Repair Orders
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {orders.length} order(s) fetched directly from PostgreSQL `repair_orders`
              </div>
            </div>
            <a href="/orders" style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
              Full Orders Desk <ChevronRight size={14} />
            </a>
          </div>

          <table className="terminal-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Assigned Shop</th>
                <th>Product & Scope</th>
                <th>Status</th>
                <th>Quote Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No orders found in database.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }} title={ord.id}>
                        #{ord.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#fff' }}>{ord.customer_name || 'Customer'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ID: {ord.customer_id?.slice(0, 8)}</div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-primary)' }}>{ord.shop_name || 'Assigned Shop'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#fff' }}>{ord.product_name || 'Device'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ord.description || 'Diagnosis and repair'}
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(ord.current_status)}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff' }}>
                        ₹{Number(ord.quote_amount || 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Right: Live Triage (Pending Shops & Live Disputes from DB) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Live Disputes Widget */}
          <div className="terminal-card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} style={{ color: '#fb7185' }} />
                <span>Live Disputes Queue</span>
              </div>
              <span className="badge-rose" style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>
                {disputes.length} Case(s)
              </span>
            </div>

            {disputes.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '8px 0' }}>
                ✓ Zero open disputes in queue.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {disputes.slice(0, 2).map((d) => (
                  <div key={d.id} style={{ padding: '10px', background: '#0e1420', borderRadius: '4px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#fb7185', fontFamily: 'var(--font-mono)' }}>
                        #{d.id.slice(0, 8)}
                      </span>
                      <span style={{ fontSize: '10px', color: d.status === 'resolved' ? '#34d399' : '#fbbf24', textTransform: 'uppercase' }}>
                        {d.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500 }}>
                      {d.reason}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Customer: {d.raised_by_name} • Order #{d.order_id?.slice(0, 8)}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <a href="/disputes" className="btn-secondary" style={{ padding: '3px 8px', fontSize: '11px', textDecoration: 'none' }}>
                        Arbitrate Case →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Shops Widget */}
          <div className="terminal-card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Store size={14} style={{ color: '#fbbf24' }} />
                <span>Pending Shop Approvals</span>
              </div>
              <span className="badge-amber" style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>
                {pendingShops.length} Pending
              </span>
            </div>

            {pendingShops.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '8px 0' }}>
                ✓ All shops verified. Zero pending review.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingShops.map((s) => (
                  <div key={s.id} style={{ padding: '10px', background: '#0e1420', borderRadius: '4px', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{s.shop_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.city} • {s.category}</div>
                    <div style={{ marginTop: '6px' }}>
                      <a href="/shops" className="btn-primary" style={{ padding: '3px 8px', fontSize: '11px', textDecoration: 'none' }}>
                        Verify & Activate
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
