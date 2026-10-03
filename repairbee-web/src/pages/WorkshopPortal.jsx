import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workshopApi, repairsApi, chatApi, earningsApi, withdrawalsApi, ratingsApi } from '../api/client';
import { useWorkshopAuth } from '../context/WorkshopAuthContext';
import BankDetailsModal from '../components/BankDetailsModal';
import WithdrawalModal from '../components/WithdrawalModal';
import NotificationCenter from '../components/NotificationCenter';
import BenchChatBox from '../components/BenchChatBox';
import CleanroomQcModal from '../components/CleanroomQcModal';
import CleanroomVideoProofModal from '../components/CleanroomVideoProofModal';
import confetti from 'canvas-confetti';
import {
  Wrench,
  Building,
  ShieldCheck,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Camera,
  Video,
  RefreshCw,
  Search,
  Check,
  Send,
  ArrowRight,
  Filter,
  User,
  Phone,
  Tag,
  Lock,
  ChevronRight,
  Sparkles,
  LogOut,
  MessageSquare,
  Landmark,
  CreditCard,
  ArrowUpRight,
  History,
  FileSpreadsheet,
  AlertTriangle,
  Star,
  Award,
  ThumbsUp,
  Shield,
  Zap,
  Cpu,
  PackageCheck,
  Activity
} from 'lucide-react';

const OEM_PRESETS = [
  { label: '📱 Screen & OLED (₹3,400)', price: 3400, time: '45 mins on bench' },
  { label: '⚡ Logic Board BGA (₹3,000)', price: 3000, time: '90 mins on bench' },
  { label: '🔋 OEM Battery (₹1,600)', price: 1600, time: '30 mins on bench' },
  { label: '❄️ Thermal Service (₹1,300)', price: 1300, time: '30 mins on bench' },
  { label: '🔍 Bench Diagnostic (₹499)', price: 499, time: '20 mins on bench' }
];

const getStageIndex = (status) => {
  if (['repair_requested', 'pickup_requested', 'assigned_delivery', 'picked_up'].includes(status)) return 0;
  if (['received_at_shop', 'diagnosing'].includes(status)) return 1;
  if (['quote_sent', 'quote_approved'].includes(status)) return 2;
  if (['in_repair', 'repair_in_progress'].includes(status)) return 3;
  if (['quality_check', 'repair_completed'].includes(status)) return 4;
  if (['out_for_delivery', 'delivery_confirmed', 'completed'].includes(status)) return 5;
  return 0;
};

export default function WorkshopPortal() {
  const navigate = useNavigate();
  const {
    workshopUser,
    workshopToken,
    shopDetails,
    shopStats,
    isWorkshopAuthenticated,
    quickLoginWorkshop,
    logoutWorkshop,
    refreshShopDashboard
  } = useWorkshopAuth();

  // Top View Mode: Active Workbench Bay vs Financials & Payout Settlements vs Reputation & Reviews
  const [mainView, setMainView] = useState('workbench'); // 'workbench' | 'financials' | 'reputation'
  const [financialsData, setFinancialsData] = useState(null);
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [reviewsData, setReviewsData] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [financialLedgerTab, setFinancialLedgerTab] = useState('withdrawals'); // 'withdrawals' | 'orders'
  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [videoProofModalOpen, setVideoProofModalOpen] = useState(false);

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterTab, setFilterTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Workshop-Customer Communicator state
  const [workshopChatMsg, setWorkshopChatMsg] = useState('');
  const [workshopChatHistory, setWorkshopChatHistory] = useState([]);

  // Quote Form State
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteTime, setQuoteTime] = useState('45 mins on bench');
  const [quoteWarranty, setQuoteWarranty] = useState('30');
  const [techNote, setTechNote] = useState('');

  // Synchronize bench quote defaults with selected order's protection tier
  useEffect(() => {
    if (selectedOrder) {
      const planDays = selectedOrder.warranty_days || (
        selectedOrder.warranty_tier === 'diamond' ? 180 :
        selectedOrder.warranty_tier === 'gold' ? 90 : 30
      );
      setQuoteWarranty(String(planDays));
      if (selectedOrder.quote_amount) {
        setQuotePrice(String(selectedOrder.quote_amount));
      } else {
        setQuotePrice('');
      }
    }
  }, [selectedOrder?.id]);

  // Auto quick login if not logged in for instant testing demo
  useEffect(() => {
    const initAuth = async () => {
      if (!isWorkshopAuthenticated) {
        await quickLoginWorkshop();
      }
      setLoading(false);
    };
    initAuth();
  }, [isWorkshopAuthenticated]);

  // Load shop earnings and payout status
  const loadFinancials = async () => {
    setFinancialsLoading(true);
    try {
      const res = await earningsApi.getShopEarnings();
      if (res?.data) {
        setFinancialsData(res.data);
      }
    } catch (err) {
      console.error('Failed to load workshop financials:', err);
    } finally {
      setFinancialsLoading(false);
    }
  };

  // Load shop reputation score and customer reviews
  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await ratingsApi.getMyShopReviews();
      if (res?.data) {
        setReviewsData(res.data);
      }
    } catch (err) {
      console.error('Failed to load workshop reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Load incoming repair orders for the workshop
  const loadOrders = async () => {
    setOrdersLoading(true);
    setErrorMsg('');
    try {
      const res = await workshopApi.getIncomingOrders();
      const list = res?.data || (Array.isArray(res) ? res : []);
      setOrders(list);
      if (list.length > 0 && !selectedOrder) {
        setSelectedOrder(list[0]);
      } else if (selectedOrder) {
        // Refresh currently selected order
        const updated = list.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error('Failed to load workshop orders:', err);
      setErrorMsg(err?.message || 'Could not load incoming repair orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (isWorkshopAuthenticated) {
      loadOrders();
      loadFinancials();
    }
  }, [isWorkshopAuthenticated]);

  // Load chat for selected order
  const loadWorkshopChat = async (orderId) => {
    if (!orderId) return;
    try {
      const res = await chatApi.getWorkshopHistory(orderId, 'customer_shop');
      const list = res?.data || res?.messages || (Array.isArray(res) ? res : []);
      setWorkshopChatHistory(list.map(m => ({
        id: m.id,
        sender: m.sender_role === 'customer' ? 'customer' : 'workshop',
        senderName: m.sender_name || (m.sender_role === 'customer' ? (selectedOrder?.customer_name || 'Customer') : 'Technician (You)'),
        text: m.message,
        time: m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
      })));
    } catch (err) {
      console.warn('Could not load workshop chat:', err?.message);
    }
  };

  useEffect(() => {
    if (selectedOrder?.id) {
      loadWorkshopChat(selectedOrder.id);
    }
  }, [selectedOrder?.id]);

  const handleSendWorkshopChat = async (e) => {
    e?.preventDefault();
    if (!workshopChatMsg.trim() || !selectedOrder) return;
    const text = workshopChatMsg.trim();
    setWorkshopChatMsg('');

    const optMsg = {
      id: Date.now().toString(),
      sender: 'workshop',
      senderName: 'Technician (You)',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setWorkshopChatHistory(prev => [...prev, optMsg]);

    try {
      await chatApi.sendWorkshopMessage(selectedOrder.id, text, 'customer_shop');
    } catch (err) {
      console.warn('Workshop chat send notice:', err?.message);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      (o.id && o.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.product_name && o.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.description && o.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === 'vip') {
      return o.warranty_tier === 'diamond' || o.warranty_tier === 'gold';
    }
    if (filterTab === 'triage') {
      return ['repair_requested', 'pickup_requested', 'received_at_shop', 'diagnosing'].includes(o.current_status);
    }
    if (filterTab === 'in_repair') {
      return ['quote_approved', 'in_repair', 'repair_in_progress', 'quality_check'].includes(o.current_status);
    }
    if (filterTab === 'completed') {
      return ['repair_completed', 'out_for_delivery', 'delivery_confirmed', 'completed'].includes(o.current_status);
    }
    return true;
  });

  // Action: Receive on Cleanroom Bench
  const handleReceiveAtShop = async (orderId) => {
    setActionLoading(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      await workshopApi.updateStatus(orderId, 'received_at_shop', 'Tamper seal verified. Received in Level 3 cleanroom bay.');
      setStatusMsg('✓ Order received at cleanroom bench. Tamper seal verified.');
      await loadOrders();
      await refreshShopDashboard();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to update intake status');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Start Diagnostics
  const handleStartDiagnostics = async (orderId) => {
    setActionLoading(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      await workshopApi.updateStatus(orderId, 'diagnosing', 'Master technician started high-precision diagnostic triage.');
      setStatusMsg('✓ Diagnostic triage active on bay 4.');
      await loadOrders();
      await refreshShopDashboard();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to start diagnostics');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Submit Quote to Customer
  const handleSubmitQuote = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!quotePrice || Number(quotePrice) <= 0) {
      setErrorMsg('Please enter a valid repair price.');
      return;
    }

    setActionLoading(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      await workshopApi.sendQuote(selectedOrder.id, {
        price: Number(quotePrice),
        estimated_time: quoteTime || '45 mins on bench',
        warranty_days: Number(quoteWarranty) || 30
      });
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setStatusMsg(`🎉 Quote of ₹${Number(quotePrice).toLocaleString()} sent to customer for instant approval!`);
      setQuotePrice('');
      await loadOrders();
      await refreshShopDashboard();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to send bench quote');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Start Active Repair
  const handleStartRepair = async (orderId) => {
    setActionLoading(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      await workshopApi.updateStatus(orderId, 'in_repair', 'Cleanroom micro-soldering and component replacement in progress.');
      setStatusMsg('✓ Repair active on workbench.');
      await loadOrders();
      await refreshShopDashboard();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to start repair');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Pass 24-Point QA Check
  const handlePassQA = async (orderId) => {
    setActionLoading(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      await workshopApi.updateStatus(orderId, 'quality_check', 'Passed 24-point bench inspection: Display touch, thermal, power & audio.');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStatusMsg('✓ 24-Point Quality Assurance certified. Device ready for dispatch.');
      await loadOrders();
      await refreshShopDashboard();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to pass QA check');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="live-pulse" style={{ margin: '0 auto 12px' }} />
        <div>Connecting to Fix It Electronics cleanroom workbench telemetry...</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px 20px 60px' }}>
      <div className="container" style={{ maxWidth: '1440px' }}>
        
        {/* TOP WORKSHOP TELEMETRY HEADER */}
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-lg)',
          marginBottom: '24px',
          border: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
              }}>
                <Wrench size={26} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    {shopDetails?.shop_name || 'Fix It Electronics'}
                  </h1>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid #059669',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)'
                  }}>
                    Level 3 Cleanroom Certified
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📍 {shopDetails?.address || '12 MG Road'}, {shopDetails?.city || 'Bangalore'}</span>
                  <span>•</span>
                  <span>⭐ {shopDetails?.avg_rating || '5.0'} Rating</span>
                  <span>•</span>
                  <span>🕒 Open {shopDetails?.opening_time?.slice(0, 5) || '09:00'} – {shopDetails?.closing_time?.slice(0, 5) || '21:00'}</span>
                </div>
              </div>
            </div>

            {/* Quick Workbench Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: '#1e293b',
                border: '1px solid #334155',
                fontSize: '12px',
                color: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} className="live-pulse"></span>
                <span>Technician: <strong>{workshopUser?.name || 'Fix It Shop'}</strong></span>
              </div>

              <button
                onClick={loadOrders}
                className="btn-outline"
                style={{ height: '38px', padding: '0 12px', fontSize: '12px', color: '#ffffff', borderColor: '#475569' }}
                title="Refresh Live Data"
              >
                <RefreshCw size={14} className={ordersLoading ? 'live-pulse' : ''} />
              </button>

              <NotificationCenter variant="workshop" />

              <button
                onClick={() => {
                  logoutWorkshop();
                  navigate('/workshop/login');
                }}
                className="btn-outline"
                style={{ height: '38px', padding: '0 14px', fontSize: '12px', color: '#f87171', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Sign out of Workshop"
              >
                <LogOut size={14} />
                <span>Workshop Logout</span>
              </button>
            </div>
          </div>

          {/* VIEW SWITCHER TABS: WORKBENCH BAY VS FINANCIALS & SETTLEMENTS */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #1e293b'
          }}>
            <button
              onClick={() => setMainView('workbench')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: mainView === 'workbench' ? '1px solid #f59e0b' : '1px solid #334155',
                background: mainView === 'workbench' ? 'linear-gradient(135deg, #b45309, #d97706)' : '#1e293b',
                color: '#ffffff',
                boxShadow: mainView === 'workbench' ? '0 4px 14px rgba(217, 119, 6, 0.35)' : 'none'
              }}
            >
              <Wrench size={15} />
              <span>Active Workbench Bay</span>
              <span style={{
                background: 'rgba(0,0,0,0.35)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)'
              }}>
                {orders.filter(o => !['delivery_confirmed', 'cancelled'].includes(o.current_status)).length}
              </span>
            </button>

            <button
              onClick={() => {
                setMainView('financials');
                loadFinancials();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: mainView === 'financials' ? '1px solid #10b981' : '1px solid #334155',
                background: mainView === 'financials' ? 'linear-gradient(135deg, #047857, #059669)' : '#1e293b',
                color: '#ffffff',
                boxShadow: mainView === 'financials' ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none'
              }}
            >
              <Landmark size={15} />
              <span>Financials & Payout Settlements</span>
              <span style={{
                background: 'rgba(0,0,0,0.35)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: '#34d399'
              }}>
                ₹{Number(financialsData?.summary?.available_balance ?? shopStats?.available_balance ?? 0).toLocaleString()}
              </span>
            </button>

            <button
              onClick={() => {
                setMainView('reputation');
                loadReviews();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: mainView === 'reputation' ? '1px solid #38bdf8' : '1px solid #334155',
                background: mainView === 'reputation' ? 'linear-gradient(135deg, #0369a1, #0284c7)' : '#1e293b',
                color: '#ffffff',
                boxShadow: mainView === 'reputation' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none'
              }}
            >
              <Star size={15} fill={mainView === 'reputation' ? '#ffffff' : '#f59e0b'} color={mainView === 'reputation' ? '#ffffff' : '#f59e0b'} />
              <span>Reputation & Reviews</span>
              {reviewsData?.total !== undefined && (
                <span style={{
                  background: 'rgba(0,0,0,0.35)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: '#38bdf8'
                }}>
                  {reviewsData.total}
                </span>
              )}
            </button>
          </div>

          {/* KPI CARDS BAR (Active Workbench Mode) */}
          {mainView === 'workbench' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              marginTop: '16px'
            }}>
              <div style={{ background: '#1e293b', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Bench Jobs</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {shopStats?.active_jobs || orders.filter(o => !['delivery_confirmed', 'cancelled'].includes(o.current_status)).length || 0}
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Completed Repairs</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {shopStats?.completed_jobs || 1}
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Settled Payouts</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  ₹{Number(shopStats?.total_earnings || 1275).toLocaleString()}
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Platform Commission</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#c084fc', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  15% Escrow
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FEEDBACK ALERTS */}
        {statusMsg && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--emerald-light)',
            border: '1px solid var(--emerald-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--emerald-dark)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={16} />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--rose-light)',
            border: '1px solid var(--rose-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--rose)',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {errorMsg}
          </div>
        )}

        {/* 2-COLUMN WORKBENCH LAYOUT */}
        {mainView === 'workbench' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
          
          {/* LEFT COLUMN: ORDER QUEUE & FILTERS */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--secondary)' }}>
                  Cleanroom Repair Queue ({filteredOrders.length})
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Assigned customer hardware awaiting diagnosis or repair
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter ID, product, name..."
                  className="input-field"
                  style={{ height: '36px', fontSize: '12px', paddingLeft: '32px' }}
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All Jobs (${orders.length})` },
                { id: 'vip', label: `👑 VIP Priority (${orders.filter(o => o.warranty_tier === 'diamond' || o.warranty_tier === 'gold').length})` },
                { id: 'triage', label: 'Triage & Quotes' },
                { id: 'in_repair', label: 'In Repair & QA' },
                { id: 'completed', label: 'Completed' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: filterTab === tab.id ? 'var(--secondary)' : '#f1f5f9',
                    color: filterTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Orders List */}
            {ordersLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="live-pulse" style={{ margin: '0 auto 8px' }} />
                <div>Refreshing repair queue...</div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No repair orders found in this filter.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '680px', overflowY: 'auto', paddingRight: '4px' }}>
                {filteredOrders.map(ord => {
                  const isSelected = selectedOrder?.id === ord.id;
                  return (
                    <div
                      key={ord.id}
                      onClick={() => {
                        setSelectedOrder(ord);
                        setStatusMsg('');
                        setErrorMsg('');
                      }}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--primary-light)' : '#ffffff',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-default)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--secondary)' }}>
                            #{ord.id.slice(0, 8).toUpperCase()}
                          </span>
                          {ord.warranty_tier === 'diamond' && (
                            <span style={{
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono)',
                              background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                              color: '#c7d2fe',
                              border: '1px solid #818cf8',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 0 10px rgba(99, 102, 241, 0.25)'
                            }}>
                              💎 VIP 2-HR SLA
                            </span>
                          )}
                          {ord.warranty_tier === 'gold' && (
                            <span style={{
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono)',
                              background: 'linear-gradient(135deg, #78350f, #92400e)',
                              color: '#fde68a',
                              border: '1px solid #f59e0b',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              ⭐ GOLD SHIELD (90D)
                            </span>
                          )}
                          {ord.is_warranty_claim && (
                            <span style={{
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono)',
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #f59e0b',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 800
                            }}>
                              ⚡ WARRANTY REWORK
                            </span>
                          )}
                          <span style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            background: ord.pouch_barcode ? 'rgba(16, 185, 129, 0.15)' : '#f1f5f9',
                            color: ord.pouch_barcode ? '#059669' : 'var(--text-secondary)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: ord.pouch_barcode ? 700 : 500
                          }}>
                            {ord.pouch_barcode ? `🔒 ${ord.pouch_barcode}` : `Seal #RB-${ord.id.slice(0, 4).toUpperCase()}`}
                          </span>
                        </div>

                        <span className={`badge ${
                          ord.current_status === 'delivery_confirmed' ? 'badge-emerald' :
                          ord.current_status === 'in_repair' || ord.current_status === 'quality_check' ? 'badge-blue' :
                          ord.current_status === 'quote_sent' || ord.current_status === 'diagnosing' ? 'badge-amber' :
                          'badge-slate'
                        }`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                          {ord.current_status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '4px' }}>
                        {ord.product_name || 'Hardware Device'}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }} className="truncate-2">
                        {ord.description || 'Diagnosis and repair required'}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <div>👤 {ord.customer_name || 'Customer'} • {ord.customer_phone || ''}</div>
                        <div style={{ fontWeight: 700, color: ord.is_warranty_claim ? '#059669' : ord.quote_amount ? 'var(--emerald)' : 'var(--amber)' }}>
                          {ord.is_warranty_claim ? 'Warranty: ₹0.00' : ord.quote_amount ? `Quote: ₹${Number(ord.quote_amount).toLocaleString()}` : 'Quote: Pending'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: ACTIVE BENCH ACTION DRAWER */}
          {selectedOrder ? (
            <div className="card" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
              <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '16px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Active Bench Station • Bay 4
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                      Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                    </div>
                  </div>
                  <span className="badge badge-amber" style={{ fontSize: '11px' }}>
                    Tamper RFID #RB-{selectedOrder.id.slice(0, 4).toUpperCase()}
                  </span>
                </div>

                {/* Cleanroom 6-Stage Lifecycle Stepper */}
                <div style={{
                  background: '#0f172a',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginTop: '14px',
                  marginBottom: '14px',
                  border: '1px solid #1e293b'
                }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '8px', fontWeight: 700 }}>
                    Cleanroom Lifecycle Stepper
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
                    {[
                      { label: 'Intake', stageIdx: 0 },
                      { label: 'Triage', stageIdx: 1 },
                      { label: 'Quote', stageIdx: 2 },
                      { label: 'Repair', stageIdx: 3 },
                      { label: '12-Pt QC', stageIdx: 4 },
                      { label: 'Dispatched', stageIdx: 5 },
                    ].map((step, idx) => {
                      const currentIdx = getStageIndex(selectedOrder.current_status);
                      const isDone = currentIdx > step.stageIdx;
                      const isCurrent = currentIdx === step.stageIdx;
                      return (
                        <React.Fragment key={idx}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: isDone ? '#10b981' : isCurrent ? '#f59e0b' : '#334155',
                              color: isDone || isCurrent ? '#ffffff' : '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 800,
                              boxShadow: isCurrent ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none'
                            }}>
                              {isDone ? '✓' : idx + 1}
                            </div>
                            <span style={{
                              fontSize: '9px',
                              color: isCurrent ? '#fbbf24' : isDone ? '#34d399' : '#64748b',
                              fontWeight: isCurrent ? 800 : 500,
                              marginTop: '4px',
                              textAlign: 'center'
                            }}>
                              {step.label}
                            </span>
                          </div>
                          {idx < 5 && (
                            <div style={{
                              flex: 1,
                              height: '2px',
                              background: isDone ? '#10b981' : '#334155',
                              margin: '0 2px 12px'
                            }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong>Device:</strong> {selectedOrder.product_name} • {selectedOrder.product_category}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  <strong>Customer:</strong> {selectedOrder.customer_name} ({selectedOrder.customer_phone})
                </div>
                <div style={{ marginTop: '6px', padding: '8px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--secondary)' }}>
                  💬 "{selectedOrder.description || 'Customer reported fault'}"
                </div>

                {/* Diagnostic Health Certificate Intake Report */}
                {(selectedOrder.diagnostic_report || (selectedOrder.description && selectedOrder.description.includes('Diagnostic Cert:'))) && (
                  <div style={{
                    marginTop: '10px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1))',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={18} style={{ color: '#0891b2' }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0891b2', textTransform: 'uppercase' }}>
                          🔬 Customer Hardware Diagnostic Attached
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {selectedOrder.diagnostic_report?.certificateId
                            ? `ID: ${selectedOrder.diagnostic_report.certificateId} • Diagnostic Health Score: ${selectedOrder.diagnostic_report.healthScore}/100`
                            : 'Pre-intake dead-pixel, touch digitizer & acoustic sweep attached by customer.'}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      background: 'rgba(6, 182, 212, 0.2)',
                      color: '#0891b2',
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}>
                      BENCH VERIFIED
                    </span>
                  </div>
                )}

                {/* Customer Protection Tier & SLA Card */}
                <div style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: selectedOrder.warranty_tier === 'diamond'
                    ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
                    : selectedOrder.warranty_tier === 'gold'
                    ? 'linear-gradient(135deg, #78350f 0%, #92400e 100%)'
                    : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  border: selectedOrder.warranty_tier === 'diamond'
                    ? '1px solid #818cf8'
                    : selectedOrder.warranty_tier === 'gold'
                    ? '1px solid #f59e0b'
                    : '1px solid #334155',
                  color: '#ffffff',
                  boxShadow: selectedOrder.warranty_tier === 'diamond'
                    ? '0 4px 14px rgba(99, 102, 241, 0.25)'
                    : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>
                        {selectedOrder.warranty_tier === 'diamond' ? '💎' : selectedOrder.warranty_tier === 'gold' ? '⭐' : '🛡️'}
                      </span>
                      <div>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          color: selectedOrder.warranty_tier === 'diamond' ? '#c7d2fe' : selectedOrder.warranty_tier === 'gold' ? '#fde68a' : '#93c5fd',
                          letterSpacing: '0.02em',
                          textTransform: 'uppercase'
                        }}>
                          {selectedOrder.warranty_tier === 'diamond'
                            ? 'Diamond VIP Escrow Shield'
                            : selectedOrder.warranty_tier === 'gold'
                            ? 'Gold Shield Protection'
                            : 'Standard Platform Escrow'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                          Plan: <strong>{selectedOrder.warranty_days || (selectedOrder.warranty_tier === 'diamond' ? 180 : selectedOrder.warranty_tier === 'gold' ? 90 : 30)} Days</strong> Coverage Included
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: selectedOrder.warranty_tier === 'diamond'
                        ? 'rgba(129, 140, 248, 0.25)'
                        : selectedOrder.warranty_tier === 'gold'
                        ? 'rgba(245, 158, 11, 0.25)'
                        : 'rgba(56, 189, 248, 0.2)',
                      border: selectedOrder.warranty_tier === 'diamond' ? '1px solid #818cf8' : selectedOrder.warranty_tier === 'gold' ? '1px solid #f59e0b' : '1px solid #38bdf8',
                      color: selectedOrder.warranty_tier === 'diamond' ? '#e0e7ff' : selectedOrder.warranty_tier === 'gold' ? '#fef3c7' : '#e0f2fe'
                    }}>
                      {selectedOrder.warranty_tier === 'diamond'
                        ? '⚡ 2-HOUR BENCH SLA'
                        : selectedOrder.warranty_tier === 'gold'
                        ? '⭐ PRIORITY QUEUE'
                        : 'STANDARD QUEUE'}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4', background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '6px' }}>
                    {selectedOrder.warranty_tier === 'diamond'
                      ? 'Customer purchased Diamond VIP. Zero-deductible rework guarantee, free expedited courier re-runs, and 180-day hardware warranty required on bench quotes.'
                      : selectedOrder.warranty_tier === 'gold'
                      ? 'Customer covered under 90-Day Gold Shield. Priority rework queue and 90-day comprehensive component & labor protection.'
                      : 'Standard 30-Day platform warranty coverage. Escrow protected until customer verification.'}
                  </div>
                </div>

                {selectedOrder.media_urls && selectedOrder.media_urls.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Camera size={13} style={{ color: 'var(--primary)' }} />
                      <span>Customer Fault Evidence ({selectedOrder.media_urls.length} Photos):</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {selectedOrder.media_urls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer">
                          <img
                            src={url}
                            alt="Fault evidence"
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              border: '1.5px solid var(--border-default)',
                              cursor: 'pointer'
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOrder.is_warranty_claim && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
                    border: '1.5px solid #f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '14px',
                      flexShrink: 0
                    }}>
                      ⚡
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e' }}>
                        WARRANTY CLAIM REWORK (PRIORITY CLEANROOM QUEUE)
                      </div>
                      <div style={{ fontSize: '11px', color: '#78350f', marginTop: '2px' }}>
                        Customer covered under 30-Day Platform Guarantee. Zero customer charges (₹0.00). Immediate bench turnaround required.
                        {selectedOrder.parent_order_id && <span> Original Order: <strong>#{selectedOrder.parent_order_id.slice(0, 8).toUpperCase()}</strong></span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STAGE-SPECIFIC WORKBENCH ACTIONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* PRIORITY WARRANTY REWORK ACTION */}
                {selectedOrder.is_warranty_claim && ['received_at_shop', 'diagnosing'].includes(selectedOrder.current_status) && (
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: '#fffdfa', border: '1.5px solid #f59e0b', boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#92400e' }}>
                        ⚡ Pre-Approved 30-Day Warranty Rework
                      </span>
                      <span className="badge badge-amber" style={{ fontSize: '10px' }}>
                        Priority Bench
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#78350f', marginBottom: '14px', lineHeight: 1.4 }}>
                      Device safely received in cleanroom. No price quote needed — customer pre-authorized ₹0.00 warranty rework under platform guarantee.
                    </div>
                    <button
                      id="start-warranty-rework-btn"
                      disabled={actionLoading}
                      onClick={() => handleStartRepair(selectedOrder.id)}
                      className="btn-emerald"
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      }}
                    >
                      <Wrench size={16} />
                      <span>⚡ Start Priority Warranty Rework on Workbench</span>
                    </button>
                  </div>
                )}
                
                {/* POUCH SEAL VERIFICATION & INTAKE (WHEN ARRIVING FROM COURIER) */}
                {selectedOrder.pouch_barcode && (
                  <div style={{
                    padding: '12px 14px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={18} style={{ color: '#10b981' }} />
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                          Courier Tamper Pouch Intact
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--secondary)' }}>
                          Barcode: {selectedOrder.pouch_barcode}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                      ✓ Verified & Sealed
                    </span>
                  </div>
                )}

                {/* 1. SEND BENCH QUOTE (REPAIR REQUESTED) */}
                {['repair_requested', 'quote_rejected'].includes(selectedOrder.current_status) && !selectedOrder.is_warranty_claim && (
                  <form onSubmit={handleSubmitQuote} style={{ padding: '18px', borderRadius: 'var(--radius-md)', background: '#ffffff', border: '1.5px solid var(--primary)', boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--secondary)' }}>
                        Stage 1: Issue Diagnostic Bench Quote
                      </span>
                      <span className="badge badge-amber" style={{ fontSize: '10px' }}>
                        Action Required
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                      Review reported fault and provide precision quote. Customer <strong>{selectedOrder.customer_name || 'Sarah Jenkins'}</strong> will receive an instant approval alert on their web portal.
                    </div>

                    {/* 1-Click OEM Presets */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={13} style={{ color: '#d97706' }} />
                        <span>1-Click OEM Component Presets:</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {OEM_PRESETS.map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => {
                              setQuotePrice(String(preset.price));
                              setQuoteTime(preset.time);
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#fffbeb'; e.currentTarget.style.color = '#92400e'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>
                          Total Repair Price (₹ Parts + Labor)
                        </label>
                        <input
                          id="quote-price-input"
                          type="number"
                          value={quotePrice}
                          onChange={(e) => setQuotePrice(e.target.value)}
                          placeholder="e.g. 1850"
                          className="input-field"
                          style={{ height: '40px', fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>
                            Turnaround Time
                          </label>
                          <input
                            id="quote-time-input"
                            type="text"
                            value={quoteTime}
                            onChange={(e) => setQuoteTime(e.target.value)}
                            placeholder="e.g. 45 mins"
                            className="input-field"
                            style={{ height: '36px', fontSize: '12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>
                            Warranty Duration (Days)
                          </label>
                          <input
                            id="quote-warranty-input"
                            type="number"
                            value={quoteWarranty}
                            onChange={(e) => setQuoteWarranty(e.target.value)}
                            placeholder="30"
                            className="input-field"
                            style={{ height: '36px', fontSize: '12px' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Platform Escrow Payout Breakdown (Live 15% Platform Commission) */}
                    {Number(quotePrice) > 0 && (
                      <div style={{
                        background: '#0f172a',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        color: '#ffffff',
                        marginBottom: '14px',
                        border: '1px solid #1e293b'
                      }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', marginBottom: '6px' }}>
                          Escrow Settlement Payout Calculator
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                          <span>Customer Gross Payment:</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{Number(quotePrice).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#f87171', marginBottom: '4px' }}>
                          <span>Platform Escrow Commission (15%):</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>-₹{Math.round(Number(quotePrice) * 0.15).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#34d399', fontWeight: 800, borderTop: '1px dashed #334155', paddingTop: '6px' }}>
                          <span>Net Workshop Bank Payout:</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>₹{Math.round(Number(quotePrice) * 0.85).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>
                          🔒 Funds held securely in platform escrow until customer doorstep OTP verification.
                        </div>
                      </div>
                    )}

                    <button
                      id="submit-quote-btn"
                      type="submit"
                      disabled={actionLoading}
                      className="btn-primary"
                      style={{ width: '100%', padding: '12px', fontSize: '13px' }}
                    >
                      <Send size={15} />
                      <span>Send Official Quote to Customer</span>
                    </button>
                  </form>
                )}

                {/* 2. INTAKE HANDOVER */}
                {['picked_up', 'pickup_requested', 'assigned_delivery'].includes(selectedOrder.current_status) && (
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: '#fffdfa', border: '1.5px solid var(--primary)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px' }}>
                      Stage 2: Verify Intake Tamper Seal
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Verify runner's tamper-evident seal matches <strong>#RB-{selectedOrder.id.slice(0, 4).toUpperCase()}</strong>. Accept device into cleanroom custody.
                    </p>
                    <button
                      id="receive-at-bench-btn"
                      disabled={actionLoading}
                      onClick={() => handleReceiveAtShop(selectedOrder.id)}
                      className="btn-primary"
                      style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                    >
                      <span>✓ Verify Tamper Seal & Receive on Bench</span>
                    </button>
                  </div>
                )}

                {/* 4. AWAITING CUSTOMER APPROVAL */}
                {selectedOrder.current_status === 'quote_sent' && (
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: '#fef3c7', border: '1px solid #f59e0b', color: '#b45309' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                      ⏳ Quote Awaiting Customer Sign-off
                    </div>
                    <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                      Quote of <strong>₹{Number(selectedOrder.quote_amount).toLocaleString()}</strong> was transmitted to customer Sarah Jenkins. Bench work begins automatically once customer clicks 'Approve Quote & Fund Escrow'.
                    </div>
                  </div>
                )}

                {/* 5. START ACTIVE REPAIR (CUSTOMER APPROVED) */}
                {selectedOrder.current_status === 'quote_approved' && (
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: '#f0fdf4', border: '2px solid var(--emerald)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--emerald-dark)', marginBottom: '4px' }}>
                      🎉 Customer Approved Quote & Escrow Funded!
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary)', marginBottom: '12px' }}>
                      Escrow holding confirmed: <strong>₹{Number(selectedOrder.quote_amount).toLocaleString()}</strong>. Parts unsealed. Proceed with precision repair.
                    </div>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStartRepair(selectedOrder.id)}
                      className="btn-emerald"
                      style={{ width: '100%', padding: '12px', fontSize: '13px' }}
                    >
                      <Wrench size={16} />
                      <span>🔧 Start Active Repair on Workbench</span>
                    </button>
                  </div>
                )}

                {/* 6. COMPLETE REPAIR & PASS 12-POINT CLEANROOM QC */}
                {['in_repair', 'repair_in_progress'].includes(selectedOrder.current_status) && (
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: '#eff6ff', border: '1.5px solid var(--blue-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--secondary)' }}>
                        Stage 5: Cleanroom Precision Bench Testing
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: '#dbeafe', color: '#1e40af' }}>
                        ISO 14644-1 CLASS 7
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
                      Hardware bench work complete. Perform official 12-point cleanroom hardware diagnostic inspection before sealing anti-static tamper pouch.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        id="open-cleanroom-qc-btn"
                        disabled={actionLoading}
                        onClick={() => setQcModalOpen(true)}
                        className="btn-primary"
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '13px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <ShieldCheck size={18} />
                        <span>🔬 Open 12-Point Cleanroom QC Inspection Checklist</span>
                      </button>

                      <button
                        id="open-video-proof-btn"
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setVideoProofModalOpen(true)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          fontSize: '12px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                        }}
                      >
                        <Video size={16} />
                        <span>🎥 Record / Certify Cleanroom Video Proof Vault</span>
                      </button>

                      <button
                        disabled={actionLoading}
                        onClick={() => handlePassQA(selectedOrder.id)}
                        className="btn-outline"
                        style={{ width: '100%', padding: '8px', fontSize: '11px', color: '#475569' }}
                      >
                        <span>Quick-Certify Standard Benchmark Pass (Skip Custom Values)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 7. QA PASSED / DISPATCHED */}
                {['quality_check', 'repair_completed', 'out_for_delivery'].includes(selectedOrder.current_status) && (
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: '#f8fafc', border: '1.5px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 800, fontSize: '13px' }}>
                        <CheckCircle2 size={18} />
                        <span>12-Point Cleanroom QC Certified</span>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: '#d1fae5', color: '#065f46' }}>
                        12/12 PASSED
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                      <div><strong>Inspector:</strong> {selectedOrder.qc_report?.leadTechnician || 'Anand Verma'} ({selectedOrder.qc_report?.workbenchBay || 'Bay #4'})</div>
                      <div><strong>Tamper Seal:</strong> #{selectedOrder.qc_report?.pouchBarcode || selectedOrder.pouch_barcode || 'RB-POUCH-34075'}</div>
                      <div style={{ marginTop: '4px', color: '#059669' }}>Ready for courier doorstep handover. Escrow payout of <strong>₹{Number(selectedOrder.shop_payout || selectedOrder.quote_amount * 0.85).toLocaleString()}</strong> pending customer doorstep test.</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        type="button"
                        id="view-qc-report-btn"
                        onClick={() => setQcModalOpen(true)}
                        className="btn-outline"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '12px', fontWeight: 700, borderColor: '#10b981', color: '#059669', background: '#ecfdf5' }}
                      >
                        <span>Inspect / Edit 12-Point QC Matrix</span>
                      </button>

                      <button
                        type="button"
                        id="view-cert-video-proof-btn"
                        onClick={() => setVideoProofModalOpen(true)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          borderColor: '#0284c7',
                          color: '#0284c7',
                          background: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Video size={15} />
                        <span>🎥 {selectedOrder.video_proof_vault ? 'Inspect / Re-certify Video Proof Vault' : 'Attach Cleanroom Video Proof Vault'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 8. DELIVERED & ESCROW RELEASED */}
                {selectedOrder.current_status === 'delivery_confirmed' && (
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--emerald-light)', border: '1px solid var(--emerald-border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--emerald-dark)', marginBottom: '4px' }}>
                      ✓ Delivered & Escrow Payout Released
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary)' }}>
                      Customer tested device and confirmed delivery. Net earnings credited to workshop wallet: <strong>₹{Number(selectedOrder.shop_payout || selectedOrder.quote_amount * 0.85).toLocaleString()}</strong>.
                    </div>
                  </div>
                )}

                {/* Direct Customer Communicator (Live Socket.io Bench Link) */}
                <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px', marginTop: '12px' }}>
                  <BenchChatBox
                    orderId={selectedOrder.id}
                    chatType="customer_shop"
                    token={workshopToken}
                    currentUser={{
                      id: workshopUser?.id,
                      name: workshopUser?.name || 'Technician (You)',
                      role: 'shop_owner',
                      profile_pic_url: workshopUser?.profile_pic_url,
                    }}
                    title={`Direct Customer Communicator (${selectedOrder.customer_name || 'Device Owner'})`}
                    counterpartLabel={selectedOrder.customer_name || 'Customer'}
                    height="160px"
                    compact={true}
                    quickReplies={[
                      '🔬 Device unsealed under anti-static hood. Beginning diagnostic triage.',
                      '⚡ OEM components received and inspected. Commencing precision soldering.',
                      '🧪 12-point cleanroom hardware diagnostic complete. All benchmarks passed 100%.',
                      '📦 Device repacked in tamper-evident secure pouch. Handing to runner.'
                    ]}
                  />
                </div>

                {/* Bench Telemetry Audit Log */}
                <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px', marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '8px' }}>
                    PostgreSQL Immutable Custody Log
                  </div>
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: '#0e1726',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: '#93c5fd',
                    lineHeight: '1.6',
                    maxHeight: '130px',
                    overflowY: 'auto'
                  }}>
                    <div>• Registered: {new Date(selectedOrder.created_at).toLocaleString()}</div>
                    {selectedOrder.current_status && (
                      <div style={{ color: '#38bdf8' }}>• Status: {selectedOrder.current_status.toUpperCase()}</div>
                    )}
                    {selectedOrder.quote_amount && (
                      <div style={{ color: '#f59e0b' }}>• Quote: ₹{Number(selectedOrder.quote_amount).toLocaleString()}</div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select an order from the queue to open active bench station.
            </div>
          )}

        </div>
      )}

      {/* FINANCIALS & PAYOUT SETTLEMENTS VIEW */}
      {mainView === 'financials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 4 FINANCIAL KPI CARDS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            {/* Card 1: Available Wallet Balance */}
            <div style={{
              background: 'linear-gradient(135deg, #064e3b, #047857)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              color: '#ffffff',
              boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.3)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a7f3d0' }}>
                    Available Wallet Balance
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700 }}>
                    Ready to Payout
                  </span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '8px', color: '#ffffff' }}>
                  ₹{Number(financialsData?.summary?.available_balance ?? shopStats?.available_balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '12px', color: '#d1fae5', marginTop: '4px' }}>
                  Gross earnings minus pending/processed withdrawals
                </div>
              </div>

              <div style={{ marginTop: '18px' }}>
                <button
                  onClick={() => setWithdrawalModalOpen(true)}
                  disabled={(financialsData?.summary?.available_balance ?? shopStats?.available_balance ?? 0) < 100}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: '#ffffff',
                    color: '#065f46',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: (financialsData?.summary?.available_balance ?? shopStats?.available_balance ?? 0) >= 100 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    opacity: (financialsData?.summary?.available_balance ?? shopStats?.available_balance ?? 0) >= 100 ? 1 : 0.6,
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <ArrowUpRight size={16} />
                  <span>Request Bank Payout</span>
                </button>
              </div>
            </div>

            {/* Card 2: In-Escrow Funds */}
            <div style={{
              background: '#0f172a',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              color: '#ffffff',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                    In-Escrow Holding
                  </span>
                  <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    Locked in Active Jobs
                  </span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '8px', color: '#f59e0b' }}>
                  ₹{Number(financialsData?.summary?.in_escrow_holding ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Locked during transit/bench • Auto-released upon customer OTP delivery confirmation
                </div>
              </div>

              <div style={{ marginTop: '18px', padding: '8px 12px', background: 'rgba(30, 41, 59, 0.6)', borderRadius: 'var(--radius-sm)', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="#f59e0b" />
                <span>Escrow protected by RepairBee SafeVault</span>
              </div>
            </div>

            {/* Card 3: Total Lifetime Settled */}
            <div style={{
              background: '#0f172a',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              color: '#ffffff',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                    Lifetime Settled Earnings
                  </span>
                  <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    Gross Settled
                  </span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '8px', color: '#38bdf8' }}>
                  ₹{Number(financialsData?.summary?.total_earnings ?? shopStats?.total_earnings ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Net 85% workshop share across delivered repairs
                </div>
              </div>

              <div style={{ marginTop: '18px', padding: '8px 12px', background: 'rgba(30, 41, 59, 0.6)', borderRadius: 'var(--radius-sm)', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} color="#38bdf8" />
                <span>{financialsData?.recent_jobs?.filter(j => j.status === 'delivery_confirmed')?.length || 0} completed orders settled</span>
              </div>
            </div>

            {/* Card 4: Withdrawals / Escrow Commission */}
            <div style={{
              background: '#0f172a',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              color: '#ffffff',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                    Settlement Disbursals
                  </span>
                  <span style={{ background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                    15% Escrow Fee
                  </span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '8px', color: '#c084fc' }}>
                  ₹{Number(financialsData?.summary?.processed_withdrawals ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  {financialsData?.summary?.pending_withdrawals > 0 
                    ? `₹${Number(financialsData.summary.pending_withdrawals).toLocaleString()} pending clearance`
                    : 'All requested payouts settled'}
                </div>
              </div>

              <div style={{ marginTop: '18px', padding: '8px 12px', background: 'rgba(30, 41, 59, 0.6)', borderRadius: 'var(--radius-sm)', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} color="#c084fc" />
                <span>Platform escrow commission: 15%</span>
              </div>
            </div>
          </div>

          {/* DESIGNATED SETTLEMENT BANK ACCOUNT CARD */}
          <div style={{
            background: '#0f172a',
            borderRadius: 'var(--radius-xl)',
            padding: '24px 28px',
            border: '1px solid #334155',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: (financialsData?.summary?.bank_details?.bank_account_number || shopDetails?.bank_account_number) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: (financialsData?.summary?.bank_details?.bank_account_number || shopDetails?.bank_account_number) ? '1px solid #059669' : '1px solid #d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (financialsData?.summary?.bank_details?.bank_account_number || shopDetails?.bank_account_number) ? '#34d399' : '#f59e0b'
              }}>
                <Landmark size={24} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    Designated Settlement Bank Account
                  </h2>
                  {(financialsData?.summary?.bank_details?.bank_account_number || shopDetails?.bank_account_number) ? (
                    <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid #059669', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                      ✓ Verified NEFT / IMPS Route
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #d97706', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                      ⚠ Action Required: Link Bank
                    </span>
                  )}
                </div>

                {(financialsData?.summary?.bank_details?.bank_account_number || shopDetails?.bank_account_number) ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '10px', fontSize: '13px', color: '#cbd5e1' }}>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>Beneficiary: </span>
                      <strong>{financialsData?.summary?.bank_details?.bank_account_name || shopDetails?.bank_account_name}</strong>
                    </div>
                    <div>•</div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>Bank: </span>
                      <strong>{financialsData?.summary?.bank_details?.bank_name || shopDetails?.bank_name}</strong>
                    </div>
                    <div>•</div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>Account: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>
                        •••• •••• {(financialsData?.summary?.bank_details?.bank_account_number || shopDetails?.bank_account_number || '').slice(-4)}
                      </strong>
                    </div>
                    <div>•</div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>IFSC: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>
                        {financialsData?.summary?.bank_details?.bank_ifsc || shopDetails?.bank_ifsc}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
                    Link your workshop's current or savings bank account to receive automatic IMPS/NEFT payout disbursements.
                  </div>
                )}
              </div>
            </div>

            <div>
              <button
                onClick={() => setBankModalOpen(true)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: (financialsData?.summary?.bank_details?.bank_account_number || shopDetails?.bank_account_number) ? '1px solid #475569' : '1px solid #10b981',
                  background: (financialsData?.summary?.bank_details?.bank_account_number || shopDetails?.bank_account_number) ? '#1e293b' : 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CreditCard size={15} />
                <span>
                  {(financialsData?.summary?.bank_details?.bank_account_number || shopDetails?.bank_account_number)
                    ? 'Update Bank Account Details'
                    : 'Link Settlement Bank Account'}
                </span>
              </button>
            </div>
          </div>

          {/* DUAL-TAB FINANCIAL LEDGER */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {/* Ledger Tab Headers */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-default)',
              background: '#f8fafc',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setFinancialLedgerTab('withdrawals')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: financialLedgerTab === 'withdrawals' ? '1px solid var(--primary)' : '1px solid var(--border-default)',
                    background: financialLedgerTab === 'withdrawals' ? 'var(--primary)' : '#ffffff',
                    color: financialLedgerTab === 'withdrawals' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <History size={15} />
                  <span>Bank Withdrawal Requests</span>
                  <span style={{
                    background: financialLedgerTab === 'withdrawals' ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {financialsData?.withdrawals?.length || 0}
                  </span>
                </button>

                <button
                  onClick={() => setFinancialLedgerTab('orders')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: financialLedgerTab === 'orders' ? '1px solid var(--primary)' : '1px solid var(--border-default)',
                    background: financialLedgerTab === 'orders' ? 'var(--primary)' : '#ffffff',
                    color: financialLedgerTab === 'orders' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <FileSpreadsheet size={15} />
                  <span>Repair Order Payout Ledger</span>
                  <span style={{
                    background: financialLedgerTab === 'orders' ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {financialsData?.recent_jobs?.length || 0}
                  </span>
                </button>
              </div>

              <button
                onClick={loadFinancials}
                className="btn-outline"
                style={{ height: '34px', padding: '0 12px', fontSize: '12px' }}
              >
                <RefreshCw size={13} className={financialsLoading ? 'live-pulse' : ''} />
                <span style={{ marginLeft: '6px' }}>Refresh Ledger</span>
              </button>
            </div>

            {/* TAB 1: BANK WITHDRAWALS HISTORY */}
            {financialLedgerTab === 'withdrawals' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '12px 16px' }}>Request ID</th>
                      <th style={{ padding: '12px 16px' }}>Date & Time</th>
                      <th style={{ padding: '12px 16px' }}>Amount</th>
                      <th style={{ padding: '12px 16px' }}>Destination Bank</th>
                      <th style={{ padding: '12px 16px' }}>Clearance Status</th>
                      <th style={{ padding: '12px 16px' }}>UTR / Clearance Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialsData?.withdrawals && financialsData.withdrawals.length > 0 ? (
                      financialsData.withdrawals.map((w) => (
                        <tr key={w.id} style={{ borderBottom: '1px solid var(--border-default)', transition: 'background 0.15s ease' }}>
                          <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--secondary)' }}>
                            WD-#{w.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                            {new Date(w.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--secondary)', fontSize: '14px' }}>
                            ₹{Number(w.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>{w.bank_name || 'HDFC Bank'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {w.bank_account_number ? `••••${w.bank_account_number.slice(-4)}` : '••••'} • {w.bank_ifsc || '—'}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {w.status === 'processed' ? (
                              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid #10b981', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> Processed & Disbursed
                              </span>
                            ) : w.status === 'pending' ? (
                              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid #f59e0b', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} className="live-pulse" /> Pending Admin Clearance
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#e11d48', border: '1px solid #f43f5e', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                Failed / Rejected
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            {w.admin_note ? (
                              <span style={{ color: '#047857', fontWeight: 600 }}>{w.admin_note}</span>
                            ) : w.status === 'pending' ? (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Awaiting NEFT / IMPS dispatch</span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <History size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                          <div>No payout withdrawal requests found yet.</div>
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>
                            When you have settled earnings, click <strong>"Request Bank Payout"</strong> above to withdraw funds.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: REPAIR ORDER PAYOUT BREAKDOWN (15% Commission vs 85% Net) */}
            {financialLedgerTab === 'orders' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '12px 16px' }}>Order ID & Date</th>
                      <th style={{ padding: '12px 16px' }}>Customer & Device</th>
                      <th style={{ padding: '12px 16px' }}>Gross Quote</th>
                      <th style={{ padding: '12px 16px' }}>Platform Fee (15%)</th>
                      <th style={{ padding: '12px 16px' }}>Workshop Net Payout (85%)</th>
                      <th style={{ padding: '12px 16px' }}>Escrow Clearance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialsData?.recent_jobs && financialsData.recent_jobs.length > 0 ? (
                      financialsData.recent_jobs.map((job) => (
                        <tr key={job.order_id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--secondary)' }}>
                              #{job.order_id.slice(0, 8).toUpperCase()}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {new Date(job.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>{job.product_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Customer: {job.customer_name}</div>
                          </td>
                          <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--secondary)' }}>
                            ₹{Number(job.gross_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', color: '#e11d48' }}>
                            -₹{Number(job.platform_fee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#047857', fontSize: '14px' }}>
                            +₹{Number(job.net_payout).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {job.is_settled ? (
                              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid #10b981', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> Settled in Wallet Balance
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid #f59e0b', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <ShieldCheck size={12} /> Held in Escrow (Active)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No repair jobs found. Complete repair orders to generate settled earnings.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─── TAB 3: REPUTATION & VERIFIED CUSTOMER REVIEWS ─── */}
      {mainView === 'reputation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Scorecard & Platform Trust Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Overall Rating & Breakdown Card */}
            <div className="card" style={{ padding: '24px', background: '#0f172a', color: '#ffffff', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                  Technician Trust Score
                </span>
                <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                  Verified Escrow Rating
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#f59e0b', lineHeight: 1 }}>
                    {reviewsData?.shop?.avg_rating ? Number(reviewsData.shop.avg_rating).toFixed(1) : Number(shopDetails?.avg_rating || 5.0).toFixed(1)}
                  </div>
                  <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '6px' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={16} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    {reviewsData?.total || shopDetails?.total_ratings || 1} verified review{(reviewsData?.total || shopDetails?.total_ratings) === 1 ? '' : 's'}
                  </div>
                </div>

                {/* Rating Distribution Bars */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[5, 4, 3, 2, 1].map((starNum) => {
                    const total = reviewsData?.total || 1;
                    const count = reviewsData?.starDistribution?.[starNum] ?? (starNum === 5 ? (reviewsData?.total || 1) : 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={starNum} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                        <span style={{ width: '22px', color: '#94a3b8', fontWeight: 600 }}>{starNum}★</span>
                        <div style={{ flex: 1, height: '6px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: starNum >= 4 ? '#10b981' : starNum === 3 ? '#f59e0b' : '#ef4444', borderRadius: '4px' }} />
                        </div>
                        <span style={{ width: '24px', textAlign: 'right', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cleanroom Network Trust Badges Card */}
            <div className="card" style={{ padding: '24px', background: '#0f172a', color: '#ffffff', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '14px' }}>
                  Platform Accreditation & Badges
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#1e293b', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <ShieldCheck size={18} color="#10b981" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>Level 3 Cleanroom Certified</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>ESD-safe antistatic benches with optical alignment testing</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#1e293b', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <Award size={18} color="#f59e0b" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>Top-Rated Specialist</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Maintains &gt; 4.8★ rating across 100% genuine repair parts</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#1e293b', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    <Lock size={18} color="#38bdf8" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>100% Escrow Protection Record</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Zero contested refunds; 48-hr doorstep customer test approved</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Customer Reviews Feed */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--secondary)', margin: 0 }}>
                  Customer Reviews & Bench Feedback
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Verified reviews posted after doorstep delivery OTP test confirmation
                </p>
              </div>

              <button
                onClick={loadReviews}
                disabled={reviewsLoading}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} className={reviewsLoading ? 'animate-spin' : ''} />
                <span>Refresh Reviews</span>
              </button>
            </div>

            {reviewsLoading && !reviewsData ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading customer reviews...
              </div>
            ) : reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {reviewsData.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid var(--border-default)',
                      borderRadius: '12px',
                      padding: '18px 20px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #d97706, #b45309)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {(rev.reviewer_name || 'Customer')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)' }}>
                            {rev.reviewer_name || 'Verified Customer'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <span>{new Date(rev.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            {rev.product_name && (
                              <>
                                <span>•</span>
                                <span style={{ background: '#e2e8f0', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  Repaired: {rev.product_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={15}
                              fill={s <= rev.stars ? '#f59e0b' : 'none'}
                              color={s <= rev.stars ? '#f59e0b' : '#cbd5e1'}
                            />
                          ))}
                        </div>
                        <span
                          style={{
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            color: '#047857',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 700,
                          }}
                        >
                          ✓ Escrow Verified
                        </span>
                      </div>
                    </div>

                    {rev.review_text && (
                      <p
                        style={{
                          margin: '12px 0 0',
                          fontSize: '13px',
                          color: 'var(--secondary)',
                          lineHeight: '1.5',
                          background: '#ffffff',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        "{rev.review_text}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Star size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '15px', color: 'var(--secondary)', margin: '0 0 6px' }}>No Customer Reviews Yet</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
                  When customers confirm doorstep delivery and inspect their device, their ratings and feedback will appear here in real time.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODALS */}
      <BankDetailsModal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        shopDetails={financialsData?.summary?.bank_details || shopDetails}
        onUpdated={() => {
          loadFinancials();
          refreshShopDashboard();
        }}
      />

      <WithdrawalModal
        isOpen={withdrawalModalOpen}
        onClose={() => setWithdrawalModalOpen(false)}
        availableBalance={financialsData?.summary?.available_balance ?? shopStats?.available_balance ?? 0}
        bankDetails={financialsData?.summary?.bank_details || shopDetails}
        onWithdrawalRequested={() => {
          loadFinancials();
          refreshShopDashboard();
        }}
      />

      {/* 12-POINT CLEANROOM QC MODAL */}
      {selectedOrder && (
        <CleanroomQcModal
          isOpen={qcModalOpen}
          onClose={() => setQcModalOpen(false)}
          order={selectedOrder}
          onQcCertified={(updatedOrder) => {
            loadOrders();
            refreshShopDashboard();
            setSelectedOrder(prev => ({
              ...prev,
              ...updatedOrder,
              current_status: updatedOrder.current_status || 'repair_completed',
              qc_report: updatedOrder.qc_report || prev?.qc_report
            }));
            setStatusMsg('✓ 12-Point Cleanroom QC certified & tamper seal registered!');
          }}
        />
      )}

      {/* CLEANROOM VIDEO PROOF MODAL */}
      {selectedOrder && (
        <CleanroomVideoProofModal
          isOpen={videoProofModalOpen}
          onClose={() => setVideoProofModalOpen(false)}
          order={selectedOrder}
          onSuccess={(vault) => {
            loadOrders();
            refreshShopDashboard();
            setSelectedOrder(prev => ({
              ...prev,
              video_proof_vault: vault
            }));
            setStatusMsg('🎥 Cleanroom Repair Video Proof Vault certified & published with SHA-256 seal!');
          }}
        />
      )}
      </div>
    </div>
  );
}
