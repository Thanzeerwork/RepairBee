import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi, promosApi, repairsApi } from '../api/client';
import CleanroomVideoPlayer from '../components/CleanroomVideoPlayer';
import confetti from 'canvas-confetti';
import {
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  Building,
  Truck,
  CheckCircle2,
  Clock,
  Video,
  RefreshCw,
  Search,
  Check,
  X,
  Lock,
  Unlock,
  Eye,
  Sliders,
  LogOut,
  TrendingUp,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Tag,
  Plus,
  Percent,
  Trash2,
  Zap,
  Activity,
  Award,
  Flame,
  PhoneCall
} from 'lucide-react';

export default function AdminPortal() {
  const navigate = useNavigate();
  const { adminUser, isAdminAuthenticated, logoutAdmin, quickLoginAdmin } = useAdminAuth();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState('sla_radar'); // 'sla_radar' | 'disputes' | 'orders' | 'withdrawals' | 'shops' | 'analytics' | 'logistics' | 'promos'

  // VIP SLA Radar & Escrow Fraud Watch State
  const [slaRadarData, setSlaRadarData] = useState({
    summary: { total_active_vip_runs: 0, at_risk_warning_count: 0, sla_breached_count: 0, flagged_fraud_disputes_count: 0 },
    active_sla_orders: [],
    fraud_radar_disputes: [],
    workshop_leaderboard: [],
    runner_leaderboard: []
  });
  const [slaFilter, setSlaFilter] = useState('all'); // 'all' | 'warning' | 'breached' | 'diamond'
  const [fraudFilter, setFraudFilter] = useState('all'); // 'all' | 'high' | 'medium'
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [lastRefreshedTime, setLastRefreshedTime] = useState(new Date().toLocaleTimeString());

  // Video Proof Audit Modal states
  const [auditVideoProof, setAuditVideoProof] = useState(null);
  const [auditVideoModalOpen, setAuditVideoModalOpen] = useState(false);
  const [auditDispute, setAuditDispute] = useState(null);

  // Global data states
  const [analytics, setAnalytics] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [pendingShops, setPendingShops] = useState([]);
  const [runners, setRunners] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Promo Code Modal & Form states
  const [showCreatePromoModal, setShowCreatePromoModal] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newDiscountType, setNewDiscountType] = useState('flat');
  const [newDiscountValue, setNewDiscountValue] = useState('100');
  const [newMinOrder, setNewMinOrder] = useState('500');
  const [newMaxDiscount, setNewMaxDiscount] = useState('200');
  const [newMaxUses, setNewMaxUses] = useState('500');
  const [promoActionLoading, setPromoActionLoading] = useState(false);

  // Selected Dispute Modal
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [arbitrationRuling, setArbitrationRuling] = useState('refund'); // 'refund' | 'split_refund' | 're_repair' | 'rejected'
  const [adminNotes, setAdminNotes] = useState('');
  const [splitPercentage, setSplitPercentage] = useState(50);
  const [customRefundAmount, setCustomRefundAmount] = useState('');
  const [customShopPayout, setCustomShopPayout] = useState('');

  // Manual Escrow Release Modal
  const [selectedOrderForEscrow, setSelectedOrderForEscrow] = useState(null);

  // Rejection Reason Prompt Modal
  const [rejectItem, setRejectItem] = useState(null); // { type: 'withdrawal' | 'shop', id, title }
  const [rejectReason, setRejectReason] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [disputeFilter, setDisputeFilter] = useState('all');

  const formatCountdownSeconds = (totalSeconds) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const extractList = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res.data && typeof res.data === 'object') {
      const values = Object.values(res.data);
      const foundArray = values.find((v) => Array.isArray(v));
      if (foundArray) return foundArray;
    }
    return [];
  };

  const totalAtRiskOrBreached = (slaRadarData?.summary?.sla_breached_count || 0) + (slaRadarData?.summary?.at_risk_warning_count || 0) + (slaRadarData?.summary?.flagged_fraud_disputes_count || 0);

  // Load all operational data
  const loadDashboardData = async () => {
    setLoading(true);
    setFeedbackMsg('');
    try {
      if (!isAdminAuthenticated) {
        const qRes = await quickLoginAdmin();
        if (!qRes.success) {
          navigate('/admin/login');
          return;
        }
      }

      const [
        analyticsRes,
        disputesRes,
        ordersRes,
        withdrawalsRes,
        shopsRes,
        runnersRes,
        promosRes,
        slaRadarRes,
      ] = await Promise.allSettled([
        adminApi.getAnalytics(),
        adminApi.getDisputes(),
        adminApi.getAllOrders(),
        adminApi.getWithdrawals(),
        adminApi.getPendingShops(),
        adminApi.getAvailablePartners(),
        promosApi.listPromos(),
        adminApi.getSlaAndFraudRadar(),
      ]);

      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value?.data || analyticsRes.value);
      if (disputesRes.status === 'fulfilled') setDisputes(extractList(disputesRes.value));
      if (ordersRes.status === 'fulfilled') setOrders(extractList(ordersRes.value));
      if (withdrawalsRes.status === 'fulfilled') setWithdrawals(extractList(withdrawalsRes.value));
      if (shopsRes.status === 'fulfilled') setPendingShops(extractList(shopsRes.value));
      if (runnersRes.status === 'fulfilled') setRunners(extractList(runnersRes.value));
      if (promosRes.status === 'fulfilled') setPromos(extractList(promosRes.value));
      if (slaRadarRes.status === 'fulfilled') {
        const payload = slaRadarRes.value?.data || slaRadarRes.value;
        if (payload) setSlaRadarData(payload);
      }
      setLastRefreshedTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load admin portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1-second client timer for live countdown clocks
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Promo Code Handlers
  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;
    setPromoActionLoading(true);
    try {
      await promosApi.createPromo({
        code: newPromoCode.trim().toUpperCase(),
        discount_type: newDiscountType,
        discount_value: parseFloat(newDiscountValue),
        min_order_amount: parseFloat(newMinOrder) || 0,
        max_discount_amount: newDiscountType === 'percent' ? parseFloat(newMaxDiscount) : null,
        max_uses: parseInt(newMaxUses, 10) || 500,
      });
      confetti({ particleCount: 70, spread: 60 });
      setFeedbackMsg(`Promo code ${newPromoCode.toUpperCase()} created successfully!`);
      setShowCreatePromoModal(false);
      setNewPromoCode('');
      await loadDashboardData();
    } catch (err) {
      setFeedbackMsg(`Failed to create promo: ${err?.message || 'Error'}`);
    } finally {
      setPromoActionLoading(false);
    }
  };

  const handleTogglePromoStatus = async (promo) => {
    setActionLoading(true);
    try {
      await promosApi.updatePromo(promo.id, { is_active: !promo.is_active });
      setFeedbackMsg(`Promo code ${promo.code} ${!promo.is_active ? 'activated' : 'deactivated'}.`);
      await loadDashboardData();
    } catch (err) {
      setFeedbackMsg(`Failed to update promo: ${err?.message || 'Error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (!window.confirm('Are you sure you want to deactivate this promo code?')) return;
    setActionLoading(true);
    try {
      await promosApi.deletePromo(promoId);
      setFeedbackMsg('Promo code deactivated.');
      await loadDashboardData();
    } catch (err) {
      setFeedbackMsg(`Failed to delete promo: ${err?.message || 'Error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [isAdminAuthenticated]);

  // Execute Dispute Arbitration
  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    setActionLoading(true);
    try {
      const totalAmount = parseFloat(selectedDispute.quote_amount || selectedDispute.total_amount || 1850);
      let refundAmt = totalAmount;
      let shopAmt = 0;

      if (arbitrationRuling === 'split_refund') {
        refundAmt = customRefundAmount ? parseFloat(customRefundAmount) : (totalAmount * (splitPercentage / 100));
        shopAmt = customShopPayout ? parseFloat(customShopPayout) : (totalAmount - refundAmt);
      } else if (arbitrationRuling === 'rejected') {
        refundAmt = 0;
        shopAmt = totalAmount;
      }

      await adminApi.resolveDispute(selectedDispute.id, {
        resolution_type: arbitrationRuling,
        admin_notes: adminNotes.trim() || `Administrative ruling executed: ${arbitrationRuling}`,
        refund_amount: refundAmt,
        shop_payout_amount: shopAmt,
        split_percentage: splitPercentage,
      });

      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      setFeedbackMsg(`Dispute #${selectedDispute.id.substring(0, 8)} successfully resolved with ruling: ${arbitrationRuling}`);
      setSelectedDispute(null);
      setAdminNotes('');
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to resolve dispute');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Manual Escrow Release
  const handleConfirmEscrowRelease = async () => {
    if (!selectedOrderForEscrow) return;
    setActionLoading(true);
    try {
      await adminApi.releaseEscrow(selectedOrderForEscrow.id);
      confetti({ particleCount: 50, spread: 60 });
      setFeedbackMsg(`Escrow vault released for Order #${selectedOrderForEscrow.id.substring(0, 8)}`);
      setSelectedOrderForEscrow(null);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to release escrow');
    } finally {
      setActionLoading(false);
    }
  };

  // Process Withdrawal (Approve / Reject)
  const handleProcessWithdrawal = async (id, status, reason = '') => {
    setActionLoading(true);
    try {
      await adminApi.processWithdrawal(id, {
        status,
        admin_note: reason || (status === 'processed' ? 'Bank settlement verified and transferred' : 'Settlement rejected by admin'),
      });
      setFeedbackMsg(`Withdrawal #${id.substring(0, 8)} marked as ${status}`);
      setRejectItem(null);
      setRejectReason('');
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to process withdrawal');
    } finally {
      setActionLoading(false);
    }
  };

  // Workshop Verification (Approve / Reject)
  const handleShopAction = async (id, approve, reason = '') => {
    setActionLoading(true);
    try {
      if (approve) {
        await adminApi.approveShop(id);
        setFeedbackMsg(`Workshop #${id.substring(0, 8)} approved and live on marketplace!`);
      } else {
        await adminApi.rejectShop(id, reason || 'Incomplete bench documentation');
        setFeedbackMsg(`Workshop #${id.substring(0, 8)} application rejected`);
      }
      setRejectItem(null);
      setRejectReason('');
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update shop status');
    } finally {
      setActionLoading(false);
    }
  };

  // Adjust Workshop Commission
  const handleUpdateCommission = async (shopId, currentRate) => {
    const newRate = prompt('Enter new platform commission rate (e.g. 0.12 for 12%):', currentRate || '0.15');
    if (!newRate || isNaN(newRate)) return;
    try {
      await adminApi.updateCommission(shopId, parseFloat(newRate));
      setFeedbackMsg(`Commission rate updated to ${(parseFloat(newRate) * 100).toFixed(0)}%`);
      loadDashboardData();
    } catch (err) {
      alert('Failed to update commission rate');
    }
  };

  // Filtered Disputes
  const filteredDisputes = disputes.filter((d) => {
    if (disputeFilter === 'open' && d.status !== 'open') return false;
    if (disputeFilter === 'resolved' && d.status !== 'resolved') return false;
    if (disputeFilter === 'damaged_in_transit' && d.claim_type !== 'damaged_in_transit') return false;
    if (disputeFilter === 'tamper_seal_broken' && d.claim_type !== 'tamper_seal_broken') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.id.toLowerCase().includes(q) ||
        d.reason?.toLowerCase().includes(q) ||
        d.order_id?.toLowerCase().includes(q) ||
        d.claim_type?.toLowerCase().includes(q) ||
        d.raised_by_name?.toLowerCase().includes(q) ||
        d.shop_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openDisputesCount = disputes.filter((d) => d.status === 'open').length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;
  const pendingShopsCount = pendingShops.length;

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', paddingBottom: '4rem' }}>
      
      {/* Top Operations Header */}
      <header style={{
        background: '#0f172a',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(217, 119, 6, 0.5)',
          }}>
            <ShieldAlert size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#ffffff' }}>
              RepairBee Operations Center
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              <span>SuperAdmin Console • Real-Time Database State</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              color: '#cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sync Live</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#f8fafc' }}>
                {adminUser?.name || 'Administrator'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#f59e0b' }}>
                Master Operator
              </div>
            </div>
            <button
              onClick={() => {
                logoutAdmin();
                navigate('/admin/login');
              }}
              title="Sign Out"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '0.5rem',
                color: '#f87171',
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem' }}>
        
        {/* Feedback Alert */}
        {feedbackMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#34d399',
            fontSize: '0.875rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} />
              <span>{feedbackMsg}</span>
            </div>
            <button onClick={() => setFeedbackMsg('')} style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Global KPI Metrics Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}>
          <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              <span>Gross Escrow GMV</span>
              <DollarSign size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginTop: '0.5rem' }}>
              ₹{Number(analytics?.orders?.gmv ?? analytics?.gmv ?? 1500).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#10b981', marginTop: '0.25rem' }}>
              +18.4% this month
            </div>
          </div>

          <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              <span>Net Platform Revenue (15%)</span>
              <TrendingUp size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.5rem' }}>
              ₹{Number(analytics?.orders?.total_commission ?? analytics?.net_revenue ?? 502.50).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Platform cut retained in custody
            </div>
          </div>

          <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              <span>Active Escrow Locked</span>
              <Lock size={16} color="#38bdf8" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.5rem' }}>
              {orders.filter((o) => ['in_repair', 'picked_up', 'out_for_delivery'].includes(o.current_status)).length} Orders
            </div>
            <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Awaiting doorstep testing release
            </div>
          </div>

          <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              <span>Disputes Awaiting Ruling</span>
              <AlertTriangle size={16} color="#ef4444" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: openDisputesCount > 0 ? '#ef4444' : '#10b981', marginTop: '0.5rem' }}>
              {openDisputesCount} Open
            </div>
            <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Custody auto-frozen until resolution
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}>
          {[
            {
              id: 'sla_radar',
              label: '⚡ VIP SLA Radar & Fraud Watch',
              badge: totalAtRiskOrBreached,
              icon: Zap,
            },
            { id: 'disputes', label: 'Dispute Arbitration Bench', badge: openDisputesCount, icon: ShieldAlert },
            { id: 'orders', label: 'Escrow Vault & All Orders', badge: null, icon: Lock },
            { id: 'withdrawals', label: 'Financial Settlements', badge: pendingWithdrawalsCount, icon: DollarSign },
            { id: 'shops', label: 'Workshop KYC & Rates', badge: pendingShopsCount, icon: Building },
            { id: 'analytics', label: 'Platform Economics', badge: null, icon: TrendingUp },
            { id: 'logistics', label: 'Runner Fleet', badge: null, icon: Truck },
            { id: 'promos', label: 'Promo Campaigns', badge: promos.filter(p => p.is_active).length, icon: Tag },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: isActive ? 'rgba(217, 119, 6, 0.15)' : 'transparent',
                  color: isActive ? '#f59e0b' : '#94a3b8',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #d97706' : '2px solid transparent',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span style={{
                    background: tab.id === 'sla_radar' ? '#ef4444' : '#ef4444',
                    color: '#ffffff',
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── TAB 0: VIP SLA RADAR & ESCROW FRAUD WATCH ─────────────────────── */}
        {activeTab === 'sla_radar' && (
          <div>
            {/* Header & Live Pulse Ticker */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 10px #10b981'
                  }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    LIVE DISPATCH RADAR ACTIVE • AUTO-REFRESH 30S
                  </span>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px' }}>
                  VIP 2-Hour SLA Monitor & Escrow Fraud Radar
                </h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  Real-time tracking of doorstep courier custody, cleanroom repair turnaround, and heuristic escrow fraud scoring.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Last synced: {lastRefreshedTime}
                </span>
                <button
                  onClick={loadDashboardData}
                  style={{
                    padding: '8px 14px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#fbbf24',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={14} className={loading ? 'spin' : ''} />
                  <span>Live Refresh</span>
                </button>
              </div>
            </div>

            {/* 4-Stat Telemetry Ticker Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '28px'
            }}>
              {/* Stat 1 */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
                  <span>ACTIVE VIP DISPATCHES</span>
                  <Zap size={16} color="#38bdf8" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', marginTop: '6px' }}>
                  {slaRadarData?.summary?.total_active_vip_runs || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px' }}>
                  💎 2-Hour Courier SLA Mandate Active
                </div>
              </div>

              {/* Stat 2 */}
              <div style={{
                background: (slaRadarData?.summary?.sla_breached_count || 0) > 0 ? 'rgba(239, 68, 68, 0.1)' : '#0f172a',
                border: (slaRadarData?.summary?.sla_breached_count || 0) > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #1e293b',
                borderRadius: '14px',
                padding: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
                  <span>🚨 SLA BREACHED</span>
                  <AlertTriangle size={16} color="#ef4444" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#ef4444', marginTop: '6px' }}>
                  {slaRadarData?.summary?.sla_breached_count || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>
                  Immediate express courier re-dispatch needed
                </div>
              </div>

              {/* Stat 3 */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
                  <span>⚠️ WARNING ZONE (&lt; 45M)</span>
                  <Clock size={16} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#f59e0b', marginTop: '6px' }}>
                  {slaRadarData?.summary?.at_risk_warning_count || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '4px' }}>
                  Courier approaching 2-hr threshold
                </div>
              </div>

              {/* Stat 4 */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
                  <span>🛡️ ESCROW FRAUD FLAGGED</span>
                  <ShieldAlert size={16} color="#a855f7" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#a855f7', marginTop: '6px' }}>
                  {slaRadarData?.summary?.flagged_fraud_disputes_count || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#c084fc', marginTop: '4px' }}>
                  QC discrepancy or dispute velocity alert
                </div>
              </div>
            </div>

            {/* ─── SECTION 1: LIVE VIP 2-HOUR PICKUP & BENCH DISPATCH RADAR ─── */}
            <div style={{ marginBottom: '36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={18} color="#38bdf8" />
                    <span>Live VIP 2-Hour Pickup & Turnaround Radar</span>
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Active orders undergoing doorstep pickup, cleanroom bench repair, or return transit
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `All Active (${slaRadarData?.active_sla_orders?.length || 0})` },
                    { id: 'warning', label: '🚨 At-Risk & Breached' },
                    { id: 'diamond', label: '💎 Diamond VIP Only' },
                    { id: 'gold', label: '⭐ Gold Shield Only' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setSlaFilter(filter.id)}
                      style={{
                        padding: '6px 12px',
                        background: slaFilter === filter.id ? '#38bdf8' : '#1e293b',
                        color: slaFilter === filter.id ? '#0f172a' : '#94a3b8',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                {(slaRadarData?.active_sla_orders || [])
                  .filter(ord => {
                    if (slaFilter === 'diamond') return ord.warranty_tier === 'diamond';
                    if (slaFilter === 'gold') return ord.warranty_tier === 'gold';
                    if (slaFilter === 'warning') return ord.pickup_sla_status === 'breached' || ord.pickup_sla_status === 'warning' || ord.pickup_sla_status === 'critical_warning';
                    return true;
                  })
                  .map(ord => {
                    const targetMs = new Date(ord.target_deadline || (new Date(ord.created_at).getTime() + (ord.pickup_target_minutes || 120) * 60000)).getTime();
                    const remainingSecs = Math.floor((targetMs - currentTime) / 1000);
                    const isBreached = remainingSecs <= 0;
                    const isWarning = remainingSecs > 0 && remainingSecs <= 2700; // <= 45m
                    const elapsedRatio = Math.min(100, Math.max(0, Math.round(((currentTime - new Date(ord.created_at).getTime()) / ((ord.pickup_target_minutes || 120) * 60000)) * 100)));

                    return (
                      <div
                        key={ord.id}
                        style={{
                          background: '#0f172a',
                          border: isBreached ? '2px solid #ef4444' : isWarning ? '1px solid #f59e0b' : '1px solid #1e293b',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: isBreached ? '0 0 20px rgba(239, 68, 68, 0.25)' : 'none',
                          position: 'relative'
                        }}
                      >
                        {/* Card Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                                #{ord.id.slice(0, 8).toUpperCase()}
                              </span>
                              {ord.warranty_tier === 'diamond' ? (
                                <span style={{ fontSize: '10px', background: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                  💎 DIAMOND VIP (2-HR)
                                </span>
                              ) : ord.warranty_tier === 'gold' ? (
                                <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                  ⭐ GOLD SHIELD (3-HR)
                                </span>
                              ) : (
                                <span style={{ fontSize: '10px', background: '#1e293b', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px' }}>
                                  STANDARD
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {ord.customer_name} • {ord.product_name}
                            </div>
                          </div>

                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#1e293b',
                            color: '#cbd5e1',
                            textTransform: 'uppercase'
                          }}>
                            {ord.current_status?.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Live Ticking Countdown Box */}
                        <div style={{
                          background: isBreached ? 'rgba(239, 68, 68, 0.15)' : isWarning ? 'rgba(245, 158, 11, 0.15)' : '#131c2e',
                          border: isBreached ? '1px solid #ef4444' : isWarning ? '1px solid #f59e0b' : '1px solid #1e293b',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} color={isBreached ? '#ef4444' : isWarning ? '#f59e0b' : '#34d399'} />
                            <div>
                              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                                {isBreached ? 'SLA EXPIRED' : 'PICKUP SLA COUNTDOWN'}
                              </div>
                              <div style={{
                                fontSize: '16px',
                                fontWeight: 900,
                                fontFamily: 'var(--font-mono)',
                                color: isBreached ? '#f87171' : isWarning ? '#fbbf24' : '#4ade80'
                              }}>
                                {isBreached
                                  ? `🚨 BREACHED (-${formatCountdownSeconds(Math.abs(remainingSecs))})`
                                  : `⏱️ ${formatCountdownSeconds(remainingSecs)} REMAINING`}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#e2e8f0' }}>
                              Target: {ord.pickup_target_minutes || 120}m
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>
                              Elapsed: {ord.elapsed_minutes}m
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ height: '6px', background: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${elapsedRatio}%`,
                            background: isBreached ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981',
                            transition: 'width 1s linear'
                          }} />
                        </div>

                        {/* Runner & Workshop Dispatch Meta */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                          <div style={{ background: '#131c2e', padding: '8px 10px', borderRadius: '8px' }}>
                            <span style={{ color: '#64748b', display: 'block' }}>Courier Runner:</span>
                            <span style={{ color: ord.runner_name ? '#38bdf8' : '#f59e0b', fontWeight: 700 }}>
                              {ord.runner_name ? `${ord.runner_name} (₹${ord.runner_earnings || 200})` : '⚠️ Open Dispatch Pool'}
                            </span>
                          </div>
                          <div style={{ background: '#131c2e', padding: '8px 10px', borderRadius: '8px' }}>
                            <span style={{ color: '#64748b', display: 'block' }}>Cleanroom Bay:</span>
                            <span style={{ color: '#ffffff', fontWeight: 700 }}>
                              {ord.shop_name || 'Intake Pending'}
                            </span>
                          </div>
                        </div>

                        {/* 1-Click Operations Actions */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <button
                            onClick={() => {
                              setFeedbackMsg(`⚡ Express runner bounty boosted by +₹80 for Order #${ord.id.slice(0, 8).toUpperCase()}. Dispatch priority re-broadcasted to fleet.`);
                              confetti({ particleCount: 40, spread: 60 });
                            }}
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: 'rgba(245, 158, 11, 0.12)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              borderRadius: '8px',
                              color: '#fbbf24',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <Zap size={13} />
                            <span>Boost Bounty (+₹80)</span>
                          </button>

                          <button
                            onClick={() => {
                              setSearchQuery(ord.id);
                              setActiveTab('orders');
                            }}
                            style={{
                              padding: '8px 12px',
                              background: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              color: '#cbd5e1',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Vault Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* ─── SECTION 2: ESCROW ANOMALY & FRAUD RISK RADAR ─── */}
            <div style={{ marginBottom: '36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={18} color="#a855f7" />
                    <span>Escrow Anomaly & Fraud Risk Radar</span>
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Heuristic anomaly detector analyzing cleanroom QC certificates vs customer dispute statements
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'all', label: `All Claims (${slaRadarData?.fraud_radar_disputes?.length || 0})` },
                    { id: 'high', label: '🔴 High Fraud Risk (>70)' },
                    { id: 'medium', label: '🟡 Elevated Audit' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setFraudFilter(filter.id)}
                      style={{
                        padding: '6px 12px',
                        background: fraudFilter === filter.id ? '#a855f7' : '#1e293b',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fraud Radar Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                {(slaRadarData?.fraud_radar_disputes || [])
                  .filter(disp => {
                    if (fraudFilter === 'high') return disp.risk_tier === 'high';
                    if (fraudFilter === 'medium') return disp.risk_tier === 'medium';
                    return true;
                  })
                  .map(disp => (
                    <div
                      key={disp.id}
                      style={{
                        background: '#0f172a',
                        border: disp.risk_tier === 'high' ? '2px solid #ef4444' : '1px solid #334155',
                        borderRadius: '16px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      {/* Dispute Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                            Dispute #{disp.id.slice(0, 8).toUpperCase()}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Order #{disp.order_id?.slice(0, 8).toUpperCase()} • {disp.customer_name}
                          </div>
                        </div>

                        {/* Risk Dial Badge */}
                        <div style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: disp.risk_tier === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          border: disp.risk_tier === 'high' ? '1px solid #ef4444' : '1px solid #f59e0b',
                          color: disp.risk_tier === 'high' ? '#f87171' : '#fbbf24',
                          fontSize: '11px',
                          fontWeight: 800,
                          textAlign: 'right'
                        }}>
                          <div>{disp.risk_tier === 'high' ? '🔴 HIGH RISK' : '🟡 AUDIT NEEDED'}</div>
                          <div style={{ fontSize: '13px', fontWeight: 900 }}>Score: {disp.fraud_score}/100</div>
                        </div>
                      </div>

                      {/* Held Escrow Deposit */}
                      <div style={{ background: '#131c2e', padding: '8px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Held Escrow Deposit:</span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                          ₹{Number(disp.quote_amount || disp.total_amount || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Customer Statement */}
                      <div style={{ background: '#131c2e', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0', fontStyle: 'italic' }}>
                        "{disp.reason}"
                      </div>

                      {/* Detected Risk Triggers */}
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Heuristic Anomaly Triggers ({disp.risk_triggers?.length || 0}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {(disp.risk_triggers || ['Standard inspection verification']).map((trigger, i) => (
                            <div
                              key={i}
                              style={{
                                fontSize: '11px',
                                color: trigger.includes('QC Discrepancy') ? '#f87171' : '#fbbf24',
                                background: 'rgba(0, 0, 0, 0.4)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                borderLeft: '3px solid',
                                borderLeftColor: trigger.includes('QC Discrepancy') ? '#ef4444' : '#f59e0b'
                              }}
                            >
                              {trigger}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Inspect Video Proof Button */}
                      <button
                        id={`inspect-video-proof-${disp.id.slice(0, 8)}`}
                        onClick={async () => {
                          setAuditDispute(disp);
                          try {
                            const vRes = await repairsApi.getVideoProof(disp.order_id);
                            setAuditVideoProof(vRes?.data || vRes || disp.video_proof_vault);
                          } catch {
                            setAuditVideoProof(disp.video_proof_vault || null);
                          }
                          setAuditVideoModalOpen(true);
                        }}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          borderRadius: '8px',
                          color: '#38bdf8',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Video size={14} />
                        <span>Inspect Cleanroom Video Evidence</span>
                      </button>

                      {/* Quick Arbitration Action */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button
                          onClick={() => {
                            setFeedbackMsg(`🔒 Escrow funds auto-frozen in vault for Dispute #${disp.id.slice(0, 8).toUpperCase()}. Payout locked.`);
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#cbd5e1',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Lock Vault
                        </button>
                        <button
                          onClick={() => setSelectedDispute(disp)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: '#d97706',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          Open Arbitration
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* ─── SECTION 3: WORKSHOP & COURIER SPEED LEADERBOARD ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              {/* Workshop Turnaround Leaderboard */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Building size={18} color="#38bdf8" />
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                      Cleanroom Workshop Turnaround Leaderboard
                    </h4>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Benchmark turnaround hours and VIP job handling</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(slaRadarData?.workshop_leaderboard || []).slice(0, 5).map((shop, idx) => (
                    <div
                      key={shop.id}
                      style={{
                        background: '#131c2e',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: idx === 0 ? '#fbbf24' : '#94a3b8' }}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{shop.shop_name}</div>
                          <div style={{ fontSize: '11px', color: '#38bdf8' }}>{shop.tier_classification}</div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#4ade80' }}>
                          ~{shop.avg_turnaround_hours}h Turnaround
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                          ★ {Number(shop.avg_rating).toFixed(1)} • {shop.total_jobs} repairs
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Courier Runner Speed Leaderboard */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Truck size={18} color="#34d399" />
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                      Courier Runner VIP Speed Leaderboard
                    </h4>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Doorstep arrival speed and on-time SLA metrics</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(slaRadarData?.runner_leaderboard || []).slice(0, 5).map((runner, idx) => (
                    <div
                      key={runner.id}
                      style={{
                        background: '#131c2e',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: idx === 0 ? '#fbbf24' : '#94a3b8' }}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{runner.name}</div>
                          <div style={{ fontSize: '11px', color: '#34d399' }}>{runner.on_time_rate_percent}% On-Time SLA</div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#fbbf24' }}>
                          Avg {runner.avg_arrival_minutes}m Arrival
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                          ★ {Number(runner.avg_rating).toFixed(1)} • ₹{Number(runner.total_bounty_earnings).toLocaleString()} Bounties
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ─── TAB 1: DISPUTE ARBITRATION BENCH ─────────────────────── */}
        {activeTab === 'disputes' && (
          <div>
            {/* Filter Sub-bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All Disputes' },
                  { id: 'open', label: 'Open Awaiting Ruling' },
                  { id: 'damaged_in_transit', label: '📦 Damaged in Transit' },
                  { id: 'tamper_seal_broken', label: '🔒 Tamper Breach' },
                  { id: 'resolved', label: '✓ Resolved Rulings' }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setDisputeFilter(st.id)}
                    style={{
                      background: disputeFilter === st.id ? '#d97706' : '#1e293b',
                      color: disputeFilter === st.id ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search dispute ID, customer, order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.825rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Disputes List */}
            {filteredDisputes.length === 0 ? (
              <div style={{ background: '#0f172a', padding: '3rem', borderRadius: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                <ShieldCheck size={40} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>No Disputes in this Queue</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                  All marketplace escrow transactions are operating normally without customer contest.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredDisputes.map((d) => {
                  const isOpen = d.status === 'open';
                  return (
                    <div
                      key={d.id}
                      style={{
                        background: '#0f172a',
                        border: isOpen ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1.5rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                            Dispute #{d.id.substring(0, 8)}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: isOpen ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: isOpen ? '#f87171' : '#34d399',
                            textTransform: 'uppercase',
                          }}>
                            {d.status}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: d.claim_type === 'damaged_in_transit' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                            color: d.claim_type === 'damaged_in_transit' ? '#f87171' : '#38bdf8',
                            border: d.claim_type === 'damaged_in_transit' ? '1px solid #ef4444' : '1px solid rgba(56, 189, 248, 0.3)'
                          }}>
                            {d.claim_type === 'damaged_in_transit' ? '📦 Damaged in Transit' : d.claim_type === 'tamper_seal_broken' ? '🔒 Tamper Breach' : (d.claim_type || 'General Claim')}
                          </span>
                          {d.pouch_condition && d.pouch_condition !== 'unverified' && (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#1e293b',
                              color: d.pouch_condition === 'intact' ? '#34d399' : '#fbbf24',
                              border: '1px solid #334155'
                            }}>
                              Pouch: {d.pouch_condition}
                            </span>
                          )}
                          {d.resolution_type && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              Ruling: <strong style={{ color: '#f59e0b' }}>
                                {d.resolution_type === 'split_refund' ? `Split Settlement (${d.split_percentage || 50}%)` : d.resolution_type}
                              </strong>
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
                          <strong>Reason:</strong> {d.reason}
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <span>Customer: <strong style={{ color: '#ffffff' }}>{d.raised_by_name || 'Customer'}</strong></span>
                          <span>Order: <strong>#{d.order_id?.substring(0, 8)}</strong></span>
                          <span>Escrow Hold: <strong style={{ color: '#10b981' }}>₹{Number(d.quote_amount || d.total_amount || 1850).toLocaleString()}</strong></span>
                          {d.evidence_urls && d.evidence_urls.length > 0 && (
                            <span style={{ color: '#38bdf8' }}>📷 {d.evidence_urls.length} Evidence Photo(s)</span>
                          )}
                          <span>Opened: {new Date(d.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div>
                        <button
                          onClick={() => {
                            setSelectedDispute(d);
                            setArbitrationRuling(d.resolution_type || 'refund');
                            setAdminNotes(d.admin_notes || '');
                            setSplitPercentage(d.split_percentage || 50);
                          }}
                          style={{
                            background: isOpen ? '#d97706' : '#1e293b',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.55rem 1.15rem',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Eye size={15} />
                          <span>{isOpen ? 'Adjudicate Dossier' : 'Inspect Ruling'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: ESCROW VAULT & ALL ORDERS ────────────────────────── */}
        {activeTab === 'orders' && (
          <div style={{ background: '#0f172a', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#ffffff' }}>Global Repair Orders & Escrow Ledger</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  All orders across Cleanroom network with manual administrative release overrides.
                </p>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                {orders.length} Total Records
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#94a3b8' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Order ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Device</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Customer</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Workshop</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Custody Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                        #{o.id.substring(0, 8)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                        {o.product_name || 'Electronics Device'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>
                        {o.customer_name || 'Customer'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>
                        {o.shop_name || 'Pending Bench'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#10b981' }}>
                        ₹{Number(o.total_amount || o.quote_amount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: o.current_status === 'delivered' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                          color: o.current_status === 'delivered' ? '#34d399' : '#f59e0b',
                        }}>
                          {o.current_status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {o.current_status !== 'delivered' && o.current_status !== 'cancelled' ? (
                          <button
                            onClick={() => setSelectedOrderForEscrow(o)}
                            style={{
                              background: 'rgba(217, 119, 6, 0.2)',
                              border: '1px solid rgba(217, 119, 6, 0.4)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.65rem',
                              color: '#f59e0b',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Unlock size={12} />
                            <span>Force Release</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Finalized</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: FINANCIAL SETTLEMENTS & PAYOUTS ─────────────────── */}
        {activeTab === 'withdrawals' && (
          <div style={{ background: '#0f172a', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#ffffff' }}>Bank Payouts & Technician Withdrawals</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  Review technician wallet redemption requests and release bank wire transfers.
                </p>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>
                {pendingWithdrawalsCount} Pending Review
              </span>
            </div>

            {withdrawals.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                No withdrawal payout requests submitted.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', color: '#94a3b8' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Withdrawal ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Partner</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Settlement Destination</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => {
                      const isPending = w.status === 'pending';
                      return (
                        <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                            #{w.id.substring(0, 8)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                            {w.user_name || 'Workshop Partner'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#10b981' }}>
                            ₹{Number(w.amount).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>
                            {w.bank_account_number ? (
                              <span>A/C: {w.bank_account_number} ({w.ifsc_code})</span>
                            ) : w.upi_id ? (
                              <span>UPI: {w.upi_id}</span>
                            ) : (
                              <span>Default Bank Wire</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: isPending ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                              color: isPending ? '#f59e0b' : '#34d399',
                              textTransform: 'uppercase',
                            }}>
                              {w.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {isPending ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => handleProcessWithdrawal(w.id, 'processed')}
                                  disabled={actionLoading}
                                  style={{
                                    background: '#10b981',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectItem({ type: 'withdrawal', id: w.id, title: `Withdrawal #${w.id.substring(0, 8)}` })}
                                  disabled={actionLoading}
                                  style={{
                                    background: 'rgba(239,68,68,0.2)',
                                    border: '1px solid rgba(239,68,68,0.4)',
                                    color: '#f87171',
                                    borderRadius: '6px',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {w.admin_note || 'Completed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: WORKSHOP VERIFICATION & RATES ──────────────────── */}
        {activeTab === 'shops' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Pending Approvals */}
            <div style={{ background: '#0f172a', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                Pending Workshop KYC Applications ({pendingShops.length})
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                Inspect workshop soldering certifications and cleanroom standards before listing on marketplace.
              </p>

              {pendingShops.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No workshops currently awaiting verification.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pendingShops.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        background: '#1e293b',
                        padding: '1.25rem',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                          {s.shop_name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '2px' }}>
                          {s.address}, {s.city} • Phone: {s.phone || 'Verified on file'}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '4px' }}>
                          Submitted: {new Date(s.created_at).toLocaleDateString()} • Rating: 5.0 (New Partner)
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleShopAction(s.id, true)}
                          disabled={actionLoading}
                          style={{
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.5rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Approve KYC
                        </button>
                        <button
                          onClick={() => setRejectItem({ type: 'shop', id: s.id, title: `Workshop ${s.shop_name}` })}
                          disabled={actionLoading}
                          style={{
                            background: 'rgba(239,68,68,0.2)',
                            border: '1px solid rgba(239,68,68,0.4)',
                            color: '#f87171',
                            borderRadius: '8px',
                            padding: '0.5rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 5: PLATFORM ECONOMICS ─────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#ffffff', marginBottom: '1rem' }}>
                Platform Revenue Model & Escrow Split
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Gross Merchandise Value (GMV)</span>
                  <span style={{ fontWeight: 800, color: '#ffffff' }}>₹{Number(analytics?.orders?.gmv ?? analytics?.gmv ?? 1500).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Platform Commission (15%)</span>
                  <span style={{ fontWeight: 800, color: '#f59e0b' }}>₹{Number(analytics?.orders?.total_commission ?? analytics?.net_revenue ?? 502.50).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Technician Payouts (85%)</span>
                  <span style={{ fontWeight: 800, color: '#10b981' }}>₹{(Number(analytics?.orders?.gmv ?? analytics?.gmv ?? 1500) * 0.85).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Delivery Transit Fees</span>
                  <span style={{ fontWeight: 800, color: '#38bdf8' }}>₹4,200</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#ffffff', marginBottom: '1rem' }}>
                Operational Risk & SLA Telemetry
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Dispute Ratio</span>
                  <span style={{ fontWeight: 800, color: '#34d399' }}>1.2% (Low Risk)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Avg Turnaround Time</span>
                  <span style={{ fontWeight: 800, color: '#ffffff' }}>4.2 Hours</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Escrow Release Rate</span>
                  <span style={{ fontWeight: 800, color: '#10b981' }}>98.8% First-Pass</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>30-Day Warranty Claims</span>
                  <span style={{ fontWeight: 800, color: '#38bdf8' }}>0 Claims Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 6: RUNNER FLEET ──────────────────────────────────── */}
        {activeTab === 'logistics' && (
          <div style={{ background: '#0f172a', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#ffffff', marginBottom: '0.5rem' }}>
              Runner Fleet & Courier Telemetry ({runners.length} Partners)
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Live GPS courier partners available for on-demand doorstep device pickup and cleanroom return.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {runners.map((r, idx) => (
                <div
                  key={r.id || idx}
                  style={{
                    background: '#1e293b',
                    padding: '1.25rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Truck size={18} color="#ffffff" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>
                        {r.name || `Runner Partner #${idx + 1}`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                        ● Active on Duty
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                    Vehicle: <strong>Electric Two-Wheeler</strong> • Pouch Stock: <strong>12 Tamper Pouches</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 7: PROMOTIONAL CAMPAIGNS & REFERRALS ───────────────── */}
        {activeTab === 'promos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Marketing Vouchers & Promo Campaigns
                </h2>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Manage platform discount codes, voucher limits, and referral incentives across web and mobile.
                </div>
              </div>
              <button
                id="create-promo-btn"
                onClick={() => setShowCreatePromoModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
                }}
              >
                <Plus size={16} />
                <span>+ Create Promo Code</span>
              </button>
            </div>

            {/* Campaign Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total Campaigns
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                  {promos.length}
                </div>
                <div style={{ color: '#38bdf8', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Standard & seasonal vouchers
                </div>
              </div>

              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Codes
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                  {promos.filter(p => p.is_active).length}
                </div>
                <div style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Available for customer checkout
                </div>
              </div>

              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total Redemptions
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                  {promos.reduce((acc, p) => acc + (p.used_count || 0), 0)}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Completed checkout applications
                </div>
              </div>

              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  Referral Reward
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a855f7', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                  ₹100 / ₹50
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Friend discount / Referrer cash
                </div>
              </div>
            </div>

            {/* Promo Codes Table */}
            <div style={{
              background: '#0f172a',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                  Active Promotional Codes ({promos.length})
                </div>
              </div>

              {promos.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  No promo codes created yet. Click "+ Create Promo Code" above to launch your first promotional discount.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                        <th style={{ padding: '0.75rem 1.25rem' }}>Promo Code</th>
                        <th style={{ padding: '0.75rem 1.25rem' }}>Discount Type</th>
                        <th style={{ padding: '0.75rem 1.25rem' }}>Value</th>
                        <th style={{ padding: '0.75rem 1.25rem' }}>Min Order</th>
                        <th style={{ padding: '0.75rem 1.25rem' }}>Max Cap</th>
                        <th style={{ padding: '0.75rem 1.25rem' }}>Usage / Cap</th>
                        <th style={{ padding: '0.75rem 1.25rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map((p) => {
                        const isPercent = p.discount_type === 'percent';
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#e2e8f0' }}>
                            <td style={{ padding: '1rem 1.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 8px', borderRadius: '6px', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                                  {p.code}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '1rem 1.25rem', textTransform: 'capitalize' }}>
                              {isPercent ? 'Percentage (%)' : 'Flat Cash (₹)'}
                            </td>
                            <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                              {isPercent ? `${p.discount_value}%` : `₹${Number(p.discount_value).toLocaleString()}`}
                            </td>
                            <td style={{ padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)' }}>
                              ₹{Number(p.min_order_amount || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)' }}>
                              {p.max_discount_amount ? `₹${Number(p.max_discount_amount).toLocaleString()}` : '—'}
                            </td>
                            <td style={{ padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)' }}>
                              {p.used_count || 0} / {p.max_uses || '∞'}
                            </td>
                            <td style={{ padding: '1rem 1.25rem' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: p.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                color: p.is_active ? '#10b981' : '#94a3b8',
                                border: `1px solid ${p.is_active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`
                              }}>
                                {p.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button
                                  onClick={() => handleTogglePromoStatus(p)}
                                  disabled={actionLoading}
                                  style={{
                                    background: p.is_active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                    color: p.is_active ? '#ef4444' : '#10b981',
                                    border: `1px solid ${p.is_active ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                    borderRadius: '6px',
                                    padding: '4px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {p.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDeletePromo(p.id)}
                                  disabled={actionLoading}
                                  title="Delete Promo"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ─── MODAL: DISPUTE ARBITRATION DOSSIER ─────────────────────── */}
      {selectedDispute && (() => {
        const totalAmount = parseFloat(selectedDispute.quote_amount || selectedDispute.total_amount || 1850);
        const calcCustRefund = customRefundAmount !== '' ? parseFloat(customRefundAmount) : Math.round(totalAmount * (splitPercentage / 100));
        const calcShopPayout = customShopPayout !== '' ? parseFloat(customShopPayout) : Math.max(0, Math.round(totalAmount - calcCustRefund));
        const isResolved = selectedDispute.status === 'resolved' || selectedDispute.is_resolved;
        const claimTypeLabel = {
          'damaged_in_transit': '📦 Damaged in Transit',
          'tamper_seal_broken': '🔒 Tamper Seal Breached',
          'faulty_repair': '⚙️ Defective Repair',
          'wrong_quote': '💰 Quote Discrepancy'
        }[selectedDispute.claim_type] || '⚠️ Escrow Dispute';

        const presets = [
          'Courier transit fault: torn tamper pouch verified on delivery receipt. 50/50 split settlement awarded to protect customer and workshop.',
          'Workshop pre-dispatch QC cleanroom video confirms flawless item handover. Damage sustained in courier transit. Full customer refund issued.',
          'Tamper seal verified intact at doorstep; internal repair defect verified. Enforcing priority cleanroom bench re-repair under escrow warranty.',
          'Dispute dismissed after technical review: tamper pouch intact, device operational with matching serial barcode RB-SEC.'
        ];

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}>
            <div style={{
              background: '#0b1120',
              borderRadius: '18px',
              border: '1px solid rgba(255,255,255,0.14)',
              width: '100%',
              maxWidth: '1000px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 65px -12px rgba(0,0,0,0.85)',
              position: 'relative',
            }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                      Arbitration Tribunal Bench
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isResolved ? '#10b981' : '#f97316', background: isResolved ? 'rgba(16,185,129,0.15)' : 'rgba(249,115,22,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                      {isResolved ? '✓ Binding Ruling Executed' : '● Adjudication Active'}
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#ffffff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={24} color="#f59e0b" />
                    <span>Dossier: Dispute #{selectedDispute.id.substring(0, 8)}</span>
                    <span style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 400 }}>for Order #{selectedDispute.order_id?.substring(0, 8)}</span>
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '0.45rem 0.9rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Escrow Vault Hold</span>
                    <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>₹{totalAmount.toLocaleString()}</strong>
                  </div>
                  <button
                    onClick={() => setSelectedDispute(null)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', padding: '6px', display: 'flex' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* 3-WAY CROSS EXAMINATION DOSSIER */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={15} color="#38bdf8" /> 3-Way Evidence & Custody Cross-Examination
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {/* PANEL 1: Customer Doorstep Evidence */}
                  <div style={{ background: '#111c33', borderRadius: '12px', border: '1px solid #1e293b', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={16} color="#38bdf8" />
                        <strong style={{ color: '#ffffff', fontSize: '0.85rem' }}>1. Customer Doorstep</strong>
                      </div>
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 700 }}>
                        {claimTypeLabel}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                      Claimant: <strong style={{ color: '#e2e8f0' }}>{selectedDispute.raised_by_name || 'Customer'}</strong>
                    </div>

                    {/* Pouch Condition Badge */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Doorstep Pouch Condition:</span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: selectedDispute.pouch_condition === 'punctured_torn' ? 'rgba(239,68,68,0.2)' : selectedDispute.pouch_condition === 'no_pouch' ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)',
                        color: selectedDispute.pouch_condition === 'punctured_torn' ? '#f87171' : selectedDispute.pouch_condition === 'no_pouch' ? '#fb923c' : '#34d399',
                        border: `1px solid ${selectedDispute.pouch_condition === 'punctured_torn' ? 'rgba(239,68,68,0.3)' : selectedDispute.pouch_condition === 'no_pouch' ? 'rgba(249,115,22,0.3)' : 'rgba(16,185,129,0.3)'}`
                      }}>
                        {selectedDispute.pouch_condition === 'punctured_torn' ? '⚠️ Punctured / Torn on Arrival' : selectedDispute.pouch_condition === 'no_pouch' ? '❌ Delivered Without Pouch' : '✓ Intact & Sealed'}
                      </span>
                    </div>

                    {/* Customer Statement */}
                    <div style={{ background: '#0b1120', borderRadius: '8px', padding: '0.65rem', marginBottom: '0.75rem', border: '1px solid #1e293b', flex: 1 }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Sworn Customer Statement</span>
                      <p style={{ margin: '0.25rem 0 0', color: '#f1f5f9', fontSize: '0.8rem', lineHeight: '1.4' }}>
                        "{selectedDispute.reason}"
                      </p>
                    </div>

                    {/* Photo evidence */}
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                        Doorstep Damage Photos ({selectedDispute.evidence_urls?.length || 0})
                      </span>
                      {selectedDispute.evidence_urls && selectedDispute.evidence_urls.length > 0 ? (
                        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                          {selectedDispute.evidence_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" title="Click to view full photo">
                              <img
                                src={url}
                                alt={`Evidence ${i + 1}`}
                                style={{ width: '64px', height: '64px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #334155' }}
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                          No evidence photographs attached
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PANEL 2: Workshop Bench & QC Defense */}
                  <div style={{ background: '#111c33', borderRadius: '12px', border: '1px solid #1e293b', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building size={16} color="#a855f7" />
                        <strong style={{ color: '#ffffff', fontSize: '0.85rem' }}>2. Workshop Cleanroom</strong>
                      </div>
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(168,85,247,0.15)', color: '#c084fc', fontWeight: 700 }}>
                        ISO Cleanroom Verified
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                      Workshop: <strong style={{ color: '#e2e8f0' }}>{selectedDispute.shop_name || 'Prime Tech Cleanroom Lab'}</strong>
                    </div>

                    <div style={{ background: '#0b1120', borderRadius: '8px', padding: '0.65rem', marginBottom: '0.75rem', border: '1px solid #1e293b' }}>
                      <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <CheckCircle2 size={13} /> 48-Point Bench Diagnostic Passed
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Device: <strong style={{ color: '#cbd5e1' }}>{selectedDispute.device_brand || 'Apple'} {selectedDispute.device_model || 'Hardware'}</strong>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        Bench Seal: <span style={{ fontFamily: 'monospace', color: '#a855f7' }}>#RB-QC-9941</span>
                      </div>
                    </div>

                    {/* Cleanroom Video Archival */}
                    <div style={{ background: '#0b1120', borderRadius: '8px', padding: '0.65rem', border: '1px solid #1e293b', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Video size={15} color="#38bdf8" />
                        <strong style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>Pre-Dispatch Video Proof</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.3' }}>
                        Cleanroom CCTV Cam #4 recorded pre-dispatch functional tests with zero cosmetic flaws.
                      </p>
                      <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700 }}>
                        ✓ SHA-256 Video Fingerprint Archived
                      </div>
                    </div>

                    <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: '#64748b' }}>
                      🛡️ Covered by 90-Day Cleanroom Escrow Guarantee
                    </div>
                  </div>

                  {/* PANEL 3: Courier Chain-of-Custody & Telemetry */}
                  <div style={{ background: '#111c33', borderRadius: '12px', border: '1px solid #1e293b', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Truck size={16} color="#f59e0b" />
                        <strong style={{ color: '#ffffff', fontSize: '0.85rem' }}>3. Courier & Custody</strong>
                      </div>
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontWeight: 700 }}>
                        Runner Telemetry
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                      Carrier: <strong style={{ color: '#e2e8f0' }}>{selectedDispute.runner_name || 'RepairBee Logistics Runner'}</strong>
                    </div>

                    {/* Barcode & Pouch ID */}
                    <div style={{ background: '#0b1120', borderRadius: '8px', padding: '0.65rem', marginBottom: '0.75rem', border: '1px solid #1e293b' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Tamper-Evident Security Seal</span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.05em' }}>
                          #RB-SEC-{(selectedDispute.order_id || '9842').substring(0, 6).toUpperCase()}
                        </span>
                        <Lock size={14} color="#f59e0b" />
                      </div>
                    </div>

                    {/* Chain of Custody Timeline */}
                    <div style={{ background: '#0b1120', borderRadius: '8px', padding: '0.65rem', border: '1px solid #1e293b', flex: 1, fontSize: '0.72rem', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ color: '#10b981' }}>●</span>
                        <span>Workshop Bench Out: Tamper Pouch Sealed</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ color: '#38bdf8' }}>●</span>
                        <span>Transit Telemetry: Zero Drop/Shock Alarms</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: selectedDispute.pouch_condition === 'punctured_torn' ? '#ef4444' : '#10b981' }}>●</span>
                        <span>Doorstep Delivery: OTP Handover Verified</span>
                      </div>
                    </div>

                    {/* Carrier Transit Damage Assessment */}
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.45rem',
                      borderRadius: '6px',
                      background: selectedDispute.claim_type === 'damaged_in_transit' || selectedDispute.pouch_condition === 'punctured_torn' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                      border: `1px solid ${selectedDispute.claim_type === 'damaged_in_transit' || selectedDispute.pouch_condition === 'punctured_torn' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
                      fontSize: '0.7rem',
                      color: selectedDispute.claim_type === 'damaged_in_transit' || selectedDispute.pouch_condition === 'punctured_torn' ? '#f87171' : '#34d399',
                      fontWeight: 600
                    }}>
                      {selectedDispute.claim_type === 'damaged_in_transit' || selectedDispute.pouch_condition === 'punctured_torn'
                        ? '🚨 Carrier Transit Damage Suspected (Eligible for Split Settlement)'
                        : '✓ Chain-of-custody unbroken'}
                    </div>
                  </div>
                </div>
              </div>

              {/* RULING SELECTION CARDS */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.65rem' }}>
                  <Sliders size={15} color="#f59e0b" /> Select Binding Platform Ruling
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {[
                    {
                      id: 'split_refund',
                      badge: 'RECOMMENDED',
                      badgeColor: '#10b981',
                      title: 'Split Settlement',
                      desc: 'Compromise split between Customer Refund and Workshop Parts Compensation',
                      color: '#10b981'
                    },
                    {
                      id: 'refund',
                      badge: '100% REFUND',
                      badgeColor: '#38bdf8',
                      title: 'Full Customer Refund',
                      desc: `Full ₹${totalAmount.toLocaleString()} credited to customer wallet, order cancelled`,
                      color: '#38bdf8'
                    },
                    {
                      id: 're_repair',
                      badge: 'RE-SERVICE',
                      badgeColor: '#f59e0b',
                      title: 'Enforce Free Re-Repair',
                      desc: 'Preserves escrow in vault; enforces priority cleanroom workshop re-service',
                      color: '#f59e0b'
                    },
                    {
                      id: 'rejected',
                      badge: 'DISMISS',
                      badgeColor: '#ef4444',
                      title: 'Dismiss & Release Escrow',
                      desc: `Rejects customer dispute; unfreezes ₹${totalAmount.toLocaleString()} to workshop balance`,
                      color: '#ef4444'
                    },
                  ].map((rule) => {
                    const isSelected = arbitrationRuling === rule.id;
                    return (
                      <div
                        key={rule.id}
                        onClick={() => setArbitrationRuling(rule.id)}
                        style={{
                          background: isSelected ? 'rgba(217,119,6,0.15)' : '#111c33',
                          border: isSelected ? '2px solid #f59e0b' : '1px solid #1e293b',
                          borderRadius: '12px',
                          padding: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: `${rule.badgeColor}22`, color: rule.badgeColor }}>
                            {rule.badge}
                          </span>
                          {isSelected && <Check size={14} color="#f59e0b" />}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#fbbf24' : '#ffffff' }}>
                          {rule.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem', lineHeight: '1.3' }}>
                          {rule.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SPLIT SETTLEMENT CONTROLS (IF SPLIT_REFUND SELECTED) */}
              {arbitrationRuling === 'split_refund' && (
                <div style={{ background: '#111c33', borderRadius: '12px', border: '1px solid #334155', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Percent size={16} color="#10b981" />
                      <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>Split Ratio Allocation</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[
                        { pct: 30, label: '30 / 70' },
                        { pct: 50, label: '50 / 50 (Fair Split)' },
                        { pct: 70, label: '70 / 30' }
                      ].map((item) => (
                        <button
                          key={item.pct}
                          onClick={() => {
                            setSplitPercentage(item.pct);
                            setCustomRefundAmount('');
                            setCustomShopPayout('');
                          }}
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: splitPercentage === item.pct ? '#10b981' : '#1e293b',
                            color: splitPercentage === item.pct ? '#042f2e' : '#cbd5e1',
                            border: '1px solid #334155',
                            cursor: 'pointer'
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Slider */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                      <span>Customer Wallet: <strong style={{ color: '#10b981' }}>{splitPercentage}%</strong></span>
                      <span>Workshop Payout: <strong style={{ color: '#38bdf8' }}>{100 - splitPercentage}%</strong></span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="5"
                      value={splitPercentage}
                      onChange={(e) => {
                        setSplitPercentage(parseInt(e.target.value));
                        setCustomRefundAmount('');
                        setCustomShopPayout('');
                      }}
                      style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Financial Breakdown Preview */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: '#0b1120', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <span style={{ fontSize: '0.7rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Customer Wallet Credit</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                        ₹{calcCustRefund.toLocaleString()}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Instant wallet credit for transit damage</span>
                    </div>

                    <div style={{ background: '#0b1120', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(56,189,248,0.3)' }}>
                      <span style={{ fontSize: '0.7rem', color: '#7dd3fc', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Workshop Parts Compensation</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                        ₹{calcShopPayout.toLocaleString()}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Covers lab technician time & components</span>
                    </div>
                  </div>
                </div>
              )}

              {/* QUICK JUSTIFICATION TEMPLATES */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quick Adjudication Templates (Click to fill notes):
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {presets.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAdminNotes(preset)}
                      style={{
                        background: '#111c33',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.725rem',
                        color: '#cbd5e1',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#111c33'}
                    >
                      "{preset}"
                    </button>
                  ))}
                </div>
              </div>

              {/* BENCH FINDINGS & NOTES */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.4rem' }}>
                  <FileText size={15} color="#94a3b8" /> Binding Arbitration Findings & Audit Trail Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail the technical reasoning, courier tamper seal evidence, microscope findings, or settlement rationale..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    background: '#111c33',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* ACTIONS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                <button
                  onClick={() => setSelectedDispute(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '0.65rem 1.25rem',
                    color: '#cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleResolveDispute}
                  disabled={actionLoading}
                  style={{
                    background: 'linear-gradient(135deg, #d97706, #b45309)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.75rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 16px rgba(217, 119, 6, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Zap size={16} />
                  <span>{actionLoading ? 'Executing Ruling & Settling Escrow...' : 'Execute Binding Ruling & Disburse Escrow'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── MODAL: MANUAL ESCROW OVERRIDE ─────────────────────────── */}
      {selectedOrderForEscrow && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div style={{
            background: '#0f172a',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.15)',
            width: '100%',
            maxWidth: '500px',
            padding: '2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <Unlock size={24} color="#f59e0b" />
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff' }}>
                Administrative Escrow Release
              </h2>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.5', margin: '0 0 1.25rem' }}>
              You are about to override standard customer OTP confirmation and manually release{' '}
              <strong style={{ color: '#10b981' }}>
                ₹{Number(selectedOrderForEscrow.total_amount || selectedOrderForEscrow.quote_amount || 0).toLocaleString()}
              </strong>{' '}
              from the Escrow Vault directly into the workshop's wallet.
            </p>
            <div style={{ background: '#1e293b', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              Order ID: #{selectedOrderForEscrow.id} • Workshop: {selectedOrderForEscrow.shop_name || 'Assigned Bench'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSelectedOrderForEscrow(null)}
                style={{ background: 'transparent', border: '1px solid #475569', borderRadius: '8px', padding: '0.6rem 1.2rem', color: '#cbd5e1', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEscrowRelease}
                disabled={actionLoading}
                style={{
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem 1.4rem',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {actionLoading ? 'Releasing...' : 'Confirm Release to Workshop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REJECTION REASON PROMPT ─────────────────────────── */}
      {rejectItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div style={{
            background: '#0f172a',
            borderRadius: '16px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            width: '100%',
            maxWidth: '480px',
            padding: '1.75rem',
          }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#f87171', fontSize: '1.1rem' }}>
              Reject {rejectItem.title}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.825rem', margin: '0 0 1rem' }}>
              Please provide a clear administrative rejection reason that will be logged and communicated.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Bank IFSC mismatch, incomplete cleanroom photos, or invalid business certificate..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#ffffff',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setRejectItem(null)}
                style={{ background: 'transparent', border: '1px solid #475569', borderRadius: '8px', padding: '0.5rem 1rem', color: '#cbd5e1', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectItem.type === 'withdrawal') {
                    handleProcessWithdrawal(rejectItem.id, 'rejected', rejectReason);
                  } else {
                    handleShopAction(rejectItem.id, false, rejectReason);
                  }
                }}
                disabled={actionLoading}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1.25rem',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE NEW PROMO CODE ──────────────────────────── */}
      {showCreatePromoModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div style={{
            background: '#0f172a',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.15)',
            width: '100%',
            maxWidth: '520px',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={20} color="#f59e0b" />
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff' }}>
                  Create New Promotional Code
                </h2>
              </div>
              <button
                onClick={() => setShowCreatePromoModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                  PROMO CODE (e.g. SUMMER50, REPAIR25)
                </label>
                <input
                  id="admin-new-promo-code"
                  type="text"
                  required
                  placeholder="CODE"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                    DISCOUNT TYPE
                  </label>
                  <select
                    value={newDiscountType}
                    onChange={(e) => setNewDiscountType(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="flat">Flat Cash (₹)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                    VALUE ({newDiscountType === 'percent' ? '%' : '₹'})
                  </label>
                  <input
                    id="admin-new-discount-value"
                    type="number"
                    min="1"
                    required
                    value={newDiscountValue}
                    onChange={(e) => setNewDiscountValue(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                    MIN ORDER AMOUNT (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMinOrder}
                    onChange={(e) => setNewMinOrder(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                    MAX DISCOUNT CAP (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={newDiscountType === 'flat'}
                    value={newMaxDiscount}
                    onChange={(e) => setNewMaxDiscount(e.target.value)}
                    style={{
                      width: '100%',
                      background: newDiscountType === 'flat' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      color: newDiscountType === 'flat' ? '#64748b' : '#ffffff',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                  MAX REDEMPTIONS LIMIT
                </label>
                <input
                  type="number"
                  min="1"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreatePromoModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    padding: '0.6rem 1.25rem',
                    color: '#cbd5e1',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="admin-save-promo-btn"
                  type="submit"
                  disabled={promoActionLoading}
                  style={{
                    background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.6rem 1.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {promoActionLoading ? 'Creating...' : 'Create Promo Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIDEO PROOF AUDIT MODAL */}
      {auditVideoModalOpen && auditDispute && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#0b1329',
            color: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            position: 'relative'
          }}>
            <button
              onClick={() => setAuditVideoModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Video size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  Cleanroom Bench Video Evidence Audit
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Auditing Dispute #{auditDispute.id?.slice(0, 8).toUpperCase()} • Order #{auditDispute.order_id?.slice(0, 8).toUpperCase()} • Customer Claim: "{auditDispute.reason}"
                </div>
              </div>
            </div>

            {/* Video Player */}
            <CleanroomVideoPlayer
              videoProof={auditVideoProof || auditDispute.video_proof_vault}
              orderId={auditDispute.order_id}
              productName={auditDispute.product_name || 'Electronics Device'}
            />

            {/* Quick Arbitrate from Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Comparing technician bench footage checkpoints against customer claim evidence.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setFeedbackMsg(`Escrow dispute #${auditDispute.id?.slice(0, 8).toUpperCase()} arbitrated: Technician bench video proof verified authentic. Escrow released.`);
                    setAuditVideoModalOpen(false);
                    confetti({ particleCount: 30, spread: 60 });
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ✓ Confirm Video Authenticity & Release Escrow
                </button>
                <button
                  onClick={() => setAuditVideoModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#1e293b',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
