import React, { useState, useEffect } from 'react';
import { shopsApi } from '../api/client';
import {
  Store,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Award,
  ShieldCheck,
  Building,
  User,
  Phone,
  MapPin,
  RefreshCw,
  Ban
} from 'lucide-react';

export default function Shops() {
  const [shops, setShops] = useState([]);
  const [pendingShops, setPendingShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [commissionRate, setCommissionRate] = useState(15);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadLiveShops = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [allRes, pendingRes] = await Promise.allSettled([
        shopsApi.getShops(),
        shopsApi.getPendingShops()
      ]);

      const allList = allRes.status === 'fulfilled' ? (allRes.value?.data || []) : [];
      const pendList = pendingRes.status === 'fulfilled' ? (pendingRes.value?.data || []) : [];

      setShops(Array.isArray(allList) ? allList : []);
      setPendingShops(Array.isArray(pendList) ? pendList : []);

      const combined = [...pendList, ...allList];
      if (combined.length > 0) {
        handleSelectShop(combined[0]);
      }
    } catch (err) {
      console.error('Failed to load shops:', err);
      setErrorMsg(err.message || 'Error fetching shops');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShop = async (shop) => {
    setSelectedShop(shop);
    try {
      const res = await shopsApi.getShopById(shop.id);
      const detail = res?.data || res;
      if (detail && detail.id) {
        setSelectedShop(detail);
        if (detail.commission_rate !== undefined && detail.commission_rate !== null) {
          const rateNum = Number(detail.commission_rate);
          // If stored as 0.15 => 15, if stored as 15 => 15
          setCommissionRate(rateNum <= 1 ? Math.round(rateNum * 100) : Math.round(rateNum));
        }
      }
    } catch (err) {
      console.error('Failed to fetch full shop details:', err);
    }
  };

  useEffect(() => {
    loadLiveShops();
  }, []);

  const handleApprove = async (shopId) => {
    setActionLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await shopsApi.approveShop(shopId);
      setSuccessMsg(`Shop verified and approved successfully!`);
      await loadLiveShops();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to approve shop');
    } finally {
      setActionLoading(false);
      setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 5000);
    }
  };

  const handleUpdateCommission = async (shopId) => {
    setActionLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await shopsApi.updateCommission(shopId, commissionRate);
      setSuccessMsg(`Commission rate updated to ${commissionRate}%!`);
      await loadLiveShops();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to update commission rate');
    } finally {
      setActionLoading(false);
      setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 5000);
    }
  };

  const handleToggleBlock = async (shopId) => {
    setActionLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await shopsApi.toggleBlock(shopId);
      setSuccessMsg(res?.message || 'Shop status toggled');
      await loadLiveShops();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to toggle shop status');
    } finally {
      setActionLoading(false);
      setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 5000);
    }
  };

  const displayedList = activeTab === 'pending' ? pendingShops : shops;
  const filteredShops = displayedList.filter(s => {
    if (!search) return true;
    return (s.shop_name && s.shop_name.toLowerCase().includes(search.toLowerCase())) ||
           (s.city && s.city.toLowerCase().includes(search.toLowerCase())) ||
           (s.owner_name && s.owner_name.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Shop Network Operations & Directory
            </h1>
            <span className="badge-emerald" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px' }}>
              {shops.length} Active Verified
            </span>
            {pendingShops.length > 0 && (
              <span className="badge-amber" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px' }}>
                {pendingShops.length} Pending Approval
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Live shop records from PostgreSQL • Manage merchant approvals, commission tiers, and SLA ratings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadLiveShops} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            Verified Active Shops ({shops.length})
          </button>
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
            Pending Verifications ({pendingShops.length})
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by shop name, owner, city..."
            className="terminal-input"
            style={{ width: '100%', paddingLeft: '30px' }}
          />
        </div>
      </div>

      {/* SPLIT VIEW: DIRECTORY TABLE + LIVE INSPECTION DOSSIER */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedShop ? '1fr 420px' : '1fr', gap: '16px' }}>
        {/* TABLE */}
        <div className="terminal-card">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Shop Name</th>
                <th>Owner & City</th>
                <th>Category</th>
                <th>Rating & Jobs</th>
                <th>Operating Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No shops in this view.
                  </td>
                </tr>
              ) : (
                filteredShops.map(s => {
                  const isSelected = selectedShop?.id === s.id;
                  return (
                    <tr
                      key={s.id}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => handleSelectShop(s)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{s.shop_name}</div>
                        <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                          ID: {s.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-primary)' }}>{s.owner_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.city}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', background: '#161e2e', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8', textTransform: 'capitalize' }}>
                          {s.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fbbf24' }}>
                          {s.avg_rating} ★ ({s.total_ratings} ratings)
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {s.total_jobs} repairs completed
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#fff' }}>
                          {s.opening_time} - {s.closing_time}
                        </span>
                      </td>
                      <td>
                        <span className="badge-emerald" style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px' }}>
                          Active Verified
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* RIGHT DOSSIER PANEL (LIVE DATA) */}
        {selectedShop && (
          <div className="terminal-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#0e1420' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                  {selectedShop.shop_name}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  UUID: {selectedShop.id}
                </div>
              </div>
              <span className="badge-emerald" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                Verified
              </span>
            </div>

            {/* Shop Description */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Description
              </div>
              <div style={{ padding: '8px 10px', background: '#111827', borderRadius: '4px', border: '1px solid #1e293b', fontSize: '12px', color: '#dfe2ee' }}>
                {selectedShop.description || 'Verified electronics and appliance repair shop.'}
              </div>
            </div>

            {/* Location & Contact Details */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Address & Coordinates
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                <div style={{ padding: '8px 10px', background: '#111827', borderRadius: '4px', border: '1px solid #1e293b' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Location</div>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{selectedShop.address}, {selectedShop.city}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    GPS: {selectedShop.lat}, {selectedShop.lng}
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: '#111827', borderRadius: '4px', border: '1px solid #1e293b' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Proprietor</div>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{selectedShop.owner_name}</div>
                </div>
              </div>
            </div>

            {/* Performance Ratings */}
            <div style={{ padding: '10px', background: '#111827', borderRadius: '4px', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Customer Rating Average</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24' }}>
                  {selectedShop.avg_rating} / 5.0 ★
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total Feedbacks</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {selectedShop.total_ratings}
                </div>
              </div>
            </div>

            {/* Commission Rate Configurator */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Custom Commission Rate
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                  {commissionRate}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="25"
                step="1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <button
                disabled={actionLoading}
                onClick={() => handleUpdateCommission(selectedShop.id)}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '6px', padding: '5px' }}
              >
                Apply New Rate
              </button>
            </div>

            {/* Actions: Block / Suspend Toggle */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-default)', paddingTop: '12px' }}>
              <button
                disabled={actionLoading}
                onClick={() => handleToggleBlock(selectedShop.id)}
                className="btn-danger"
                style={{ width: '100%', justifyContent: 'center', padding: '8px' }}
              >
                <Ban size={15} />
                <span>Toggle Shop Block Status</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
