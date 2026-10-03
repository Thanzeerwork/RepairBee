import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { repairsApi, quotesApi, disputesApi, usersApi, paymentsApi, warrantyApi, promosApi, referralsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import DisputeModal from '../components/DisputeModal';
import WarrantyClaimModal from '../components/WarrantyClaimModal';
import InvoiceCertificateModal from '../components/InvoiceCertificateModal';
import ReviewModal from '../components/ReviewModal';
import LocationPickerMap from '../components/LocationPickerMap';
import confetti from 'canvas-confetti';
import {
  Wrench,
  ShieldCheck,
  Star,
  Lock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  MapPin,
  FileText,
  ChevronRight,
  Plus,
  RefreshCw,
  Award,
  AlertOctagon,
  Trash2,
  Share2,
  Copy,
  Gift,
  Wallet,
  Tag,
  Sparkles,
  ArrowUpRight,
  Check,
  Home,
  Briefcase,
  Navigation,
  Compass
} from 'lucide-react';

const WARRANTY_TIERS = {
  standard: {
    id: 'standard',
    name: 'Standard 30-Day Platform Warranty',
    shortName: '30-Day Warranty',
    badge: '🛡️ Standard (30d)',
    days: 30,
    price: 0,
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    desc: '30-day comprehensive rework cover & free doorstep pickup'
  },
  gold: {
    id: 'gold',
    name: 'Gold Shield Protection (90 Days)',
    shortName: 'Gold Shield',
    badge: '⭐ Gold Shield (90d)',
    days: 90,
    price: 299,
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    desc: '90 days / 3 months extended cover, priority queue & zero-deductible courier'
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond VIP Shield (180 Days)',
    shortName: 'Diamond VIP',
    badge: '💎 Diamond VIP (180d)',
    days: 180,
    price: 599,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    desc: '180 days / 6 months all-risk cover, accidental drop grace & instant refund option'
  }
};

export default function CustomerDashboard() {
  const { user, isAuthenticated, quickLoginCustomer } = useAuth();

  const [orders, setOrders] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'referrals', 'wallet', 'disputes', 'addresses'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  // Selected Order for Dispute & Warranty Modals
  const [selectedDisputeOrderId, setSelectedDisputeOrderId] = useState(null);
  const [selectedWarrantyOrder, setSelectedWarrantyOrder] = useState(null);
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState(null);
  const [selectedInvoiceTab, setSelectedInvoiceTab] = useState('both');
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);

  // New Address state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('Bangalore');
  const [newPincode, setNewPincode] = useState('560001');
  const [newLabel, setNewLabel] = useState('home'); // 'home', 'office', 'other'
  const [newCoords, setNewCoords] = useState({ lat: 12.9716, lng: 77.5946 });
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);

  // Referral & Wallet states
  const [walletBalance, setWalletBalance] = useState(0);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('1000');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({ total_referrals: 0, completed: 0, total_rewards: 0, referrals: [] });
  const [copiedCode, setCopiedCode] = useState(false);

  // Pending Quote Promo, Warranty Plan & Wallet checkout
  const [quotePromoInput, setQuotePromoInput] = useState('');
  const [quoteAppliedPromo, setQuoteAppliedPromo] = useState(null);
  const [quotePromoLoading, setQuotePromoLoading] = useState(false);
  const [quotePromoError, setQuotePromoError] = useState('');
  const [selectedQuoteWarrantyTier, setSelectedQuoteWarrantyTier] = useState(null);
  const [useWalletForQuote, setUseWalletForQuote] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    setActionError('');
    try {
      if (!isAuthenticated) {
        await quickLoginCustomer();
      }

      let [ordersRes, disputesRes, addrRes, walletRes, refCodeRes, refStatsRes] = await Promise.allSettled([
        repairsApi.getMyOrders(),
        disputesApi.getDisputes(),
        usersApi.getAddresses(),
        paymentsApi.getWallet(),
        referralsApi.getMyCode(),
        referralsApi.getStats(),
      ]);

      const hasAuthError = [ordersRes, disputesRes, addrRes].some(
        r => r.status === 'rejected' && (
          r.reason?.message?.toLowerCase().includes('token') ||
          r.reason?.message?.toLowerCase().includes('expired') ||
          r.reason?.statusCode === 401
        )
      );

      if (hasAuthError) {
        await quickLoginCustomer();
        [ordersRes, disputesRes, addrRes, walletRes, refCodeRes, refStatsRes] = await Promise.allSettled([
          repairsApi.getMyOrders(),
          disputesApi.getDisputes(),
          usersApi.getAddresses(),
          paymentsApi.getWallet(),
          referralsApi.getMyCode(),
          referralsApi.getStats(),
        ]);
      }

      if (ordersRes.status === 'fulfilled') {
        const list = ordersRes.value?.data || [];
        setOrders(Array.isArray(list) ? list : []);
      }
      if (disputesRes.status === 'fulfilled') {
        const list = disputesRes.value?.data || [];
        setDisputes(Array.isArray(list) ? list : []);
      }
      if (addrRes.status === 'fulfilled') {
        const list = addrRes.value?.data || [];
        setAddresses(Array.isArray(list) ? list : []);
      }
      if (walletRes.status === 'fulfilled') {
        const bal = walletRes.value?.data?.balance !== undefined ? walletRes.value.data.balance : walletRes.value?.balance;
        if (bal !== undefined) setWalletBalance(Number(bal));
      }
      if (refCodeRes.status === 'fulfilled') {
        const c = refCodeRes.value?.data?.referral_code || refCodeRes.value?.referral_code;
        if (c) setReferralCode(c);
      }
      if (refStatsRes.status === 'fulfilled') {
        const s = refStatsRes.value?.data || refStatsRes.value;
        if (s) setReferralStats(s);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      if (err?.message?.toLowerCase().includes('token') || err?.message?.toLowerCase().includes('expired')) {
        try {
          await quickLoginCustomer();
          return loadDashboardData();
        } catch {
          // ignore
        }
      }
      setActionError(err?.message || 'Error fetching records from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Top Up Wallet Balance
  const handleTopUpWallet = async () => {
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt < 10) {
      setActionError('Minimum top-up amount is ₹10');
      return;
    }
    setTopUpLoading(true);
    setActionError('');
    try {
      await paymentsApi.topUpWallet(amt);
      confetti({ particleCount: 70, spread: 60 });
      setActionMsg(`₹${amt.toLocaleString()} added to your RepairBee Wallet!`);
      setShowTopUpModal(false);
      await loadDashboardData();
    } catch (err) {
      setActionError(err?.message || 'Wallet top-up failed');
    } finally {
      setTopUpLoading(false);
    }
  };

  // Apply Promo on Quote
  const handleApplyQuotePromo = async (code, orderAmount) => {
    const targetCode = (code || quotePromoInput || '').trim().toUpperCase();
    if (!targetCode) return;
    setQuotePromoLoading(true);
    setQuotePromoError('');
    try {
      const res = await promosApi.validatePromo(targetCode, orderAmount);
      const data = res.data || res;
      setQuoteAppliedPromo({
        code: data.promo?.code || targetCode,
        discount: data.discount_amount || 0,
        promo: data.promo
      });
      setQuotePromoInput(data.promo?.code || targetCode);
      confetti({ particleCount: 50, spread: 50 });
    } catch (err) {
      setQuotePromoError(err?.message || 'Invalid promo code for this order amount');
      setQuoteAppliedPromo(null);
    } finally {
      setQuotePromoLoading(false);
    }
  };

  // Copy Referral Link
  const handleCopyReferral = () => {
    if (!referralCode) return;
    const url = `${window.location.origin}/book?ref=${referralCode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Approve Quote & Fund Escrow
  const handleApproveQuote = async (orderId, targetWarrantyTier) => {
    setActionLoading(true);
    setActionMsg('');
    setActionError('');
    try {
      const activeTier = targetWarrantyTier || selectedQuoteWarrantyTier || pendingQuoteOrder?.warranty_tier || 'standard';
      const payload = {
        promo_code: quoteAppliedPromo?.code || undefined,
        use_wallet: useWalletForQuote && walletBalance > 0,
        warranty_tier: activeTier
      };
      const res = await quotesApi.approveQuote(orderId, payload);
      const data = res.data || res;
      confetti({ particleCount: 80, spread: 60 });
      if (data.paid_via_wallet) {
        setActionMsg(`Quote approved! ₹${Number(data.total_amount || 0).toLocaleString()} paid from Wallet and held in Escrow.`);
      } else {
        setActionMsg(`Quote approved! ₹${Number(data.total_amount || 0).toLocaleString()} locked into escrow vault.`);
      }
      setQuoteAppliedPromo(null);
      setSelectedQuoteWarrantyTier(null);
      await loadDashboardData();
    } catch (err) {
      if (err?.message?.toLowerCase().includes('token') || err?.message?.toLowerCase().includes('expired')) {
        try {
          await quickLoginCustomer();
          const activeTier = targetWarrantyTier || selectedQuoteWarrantyTier || pendingQuoteOrder?.warranty_tier || 'standard';
          const payload = {
            promo_code: quoteAppliedPromo?.code || undefined,
            use_wallet: useWalletForQuote && walletBalance > 0,
            warranty_tier: activeTier
          };
          const res = await quotesApi.approveQuote(orderId, payload);
          const data = res.data || res;
          confetti({ particleCount: 80, spread: 60 });
          if (data.paid_via_wallet) {
            setActionMsg(`Quote approved! ₹${Number(data.total_amount || 0).toLocaleString()} paid from Wallet and held in Escrow.`);
          } else {
            setActionMsg(`Quote approved! ₹${Number(data.total_amount || 0).toLocaleString()} locked into escrow vault.`);
          }
          setQuoteAppliedPromo(null);
          setSelectedQuoteWarrantyTier(null);
          await loadDashboardData();
          return;
        } catch (retryErr) {
          setActionError(retryErr?.message || 'Failed to approve quote');
          return;
        }
      }
      setActionError(err?.message || 'Failed to approve quote');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Quote
  const handleRejectQuote = async (orderId) => {
    setActionLoading(true);
    setActionMsg('');
    try {
      await quotesApi.rejectQuote(orderId, 'Customer declined quote range');
      setActionMsg(`Quote rejected. Device return transit initiated.`);
      await loadDashboardData();
    } catch (err) {
      if (err?.message?.toLowerCase().includes('token') || err?.message?.toLowerCase().includes('expired')) {
        try {
          await quickLoginCustomer();
          await quotesApi.rejectQuote(orderId, 'Customer declined quote range');
          setActionMsg(`Quote rejected. Device return transit initiated.`);
          await loadDashboardData();
          return;
        } catch (retryErr) {
          setActionError(retryErr?.message || 'Failed to reject quote');
          return;
        }
      }
      setActionError(err?.message || 'Failed to reject quote');
    } finally {
      setActionLoading(false);
    }
  };

  // Claim Warranty
  const handleClaimWarranty = async (orderId) => {
    setActionLoading(true);
    setActionMsg('');
    try {
      await warrantyApi.claimWarranty(orderId, {
        issue_description: '30-Day Platform Warranty: Free rework requested by customer'
      });
      confetti({ particleCount: 70, spread: 50 });
      setActionMsg(`Warranty claim registered! Free doorstep pickup scheduled for rework.`);
      await loadDashboardData();
    } catch (err) {
      if (err?.message?.toLowerCase().includes('token') || err?.message?.toLowerCase().includes('expired')) {
        try {
          await quickLoginCustomer();
          await warrantyApi.claimWarranty(orderId, {
            issue_description: '30-Day Platform Warranty: Free rework requested by customer'
          });
          confetti({ particleCount: 70, spread: 50 });
          setActionMsg(`Warranty claim registered! Free doorstep pickup scheduled for rework.`);
          await loadDashboardData();
          return;
        } catch (retryErr) {
          setActionError(retryErr?.message || 'Failed to claim warranty');
          return;
        }
      }
      setActionError(err?.message || 'Failed to claim warranty');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Address with GPS Pin & Label
  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newStreet || newStreet.trim().length < 3) {
      setActionError('Please enter a street address.');
      return;
    }
    setAddressSaving(true);
    setActionError('');
    const addressPayload = {
      address_line: newStreet.trim(),
      city: newCity.trim() || 'Bangalore',
      pincode: newPincode.trim() || '560001',
      state: 'Karnataka',
      label: newLabel || 'home',
      lat: newCoords?.lat ? parseFloat(newCoords.lat) : undefined,
      lng: newCoords?.lng ? parseFloat(newCoords.lng) : undefined,
      is_default: addresses.length === 0 || newIsDefault
    };

    try {
      await usersApi.addAddress(addressPayload);
      setNewStreet('');
      setNewLabel('home');
      setNewIsDefault(false);
      setShowAddAddress(false);
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
      setActionMsg('New doorstep address saved with pinpoint GPS coordinates!');
      await loadDashboardData();
    } catch (err) {
      if (err?.message?.toLowerCase().includes('token') || err?.message?.toLowerCase().includes('expired')) {
        try {
          await quickLoginCustomer();
          await usersApi.addAddress(addressPayload);
          setNewStreet('');
          setNewLabel('home');
          setNewIsDefault(false);
          setShowAddAddress(false);
          setActionMsg('New doorstep address saved with pinpoint GPS coordinates!');
          await loadDashboardData();
          return;
        } catch (retryErr) {
          setActionError(retryErr?.message || 'Failed to save address');
          return;
        }
      }
      setActionError(err?.message || 'Failed to save address');
    } finally {
      setAddressSaving(false);
    }
  };

  // Set Default Primary Address
  const handleSetDefaultAddress = async (addressId) => {
    setSettingDefaultId(addressId);
    setActionError('');
    try {
      await usersApi.setDefaultAddress(addressId);
      setActionMsg('Primary delivery address updated successfully!');
      await loadDashboardData();
    } catch (err) {
      setActionError(err?.message || 'Failed to set primary address');
    } finally {
      setSettingDefaultId(null);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to remove this saved address?')) return;
    setDeletingAddressId(addressId);
    setActionError('');
    try {
      await usersApi.deleteAddress(addressId);
      setActionMsg('Address removed from your profile.');
      await loadDashboardData();
    } catch (err) {
      setActionError(err?.message || 'Failed to delete address');
    } finally {
      setDeletingAddressId(null);
    }
  };

  // Computed metrics from real live backend data
  const activeOrders = orders.filter(o => o.current_status !== 'delivery_confirmed' && o.current_status !== 'completed');
  const completedOrders = orders.filter(o => o.current_status === 'delivery_confirmed' || o.current_status === 'completed');
  const totalEscrowLocked = activeOrders.reduce((sum, o) => sum + Number(o.quote_amount || 0), 0);
  const activeWarranties = orders.filter(o => o.warranty_days > 0 && (o.current_status === 'delivery_confirmed' || o.current_status === 'completed'));
  const pendingQuoteOrder = orders.find(o => 
    o.current_status === 'quote_sent' ||
    o.current_status === 'quote_provided' || 
    o.current_status === 'diagnostic_completed' || 
    (o.quote_amount && Number(o.quote_amount) > 0 && o.current_status === 'quote_pending')
  );

  return (
    <div className="container" style={{ padding: '36px 20px 60px' }}>
      {/* Customer Header Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '26px', color: 'var(--secondary)' }}>
              Welcome back, {user?.name || 'Customer'} 👋
            </h1>
            <span className="badge badge-amber" style={{ fontSize: '11px' }}>
              VIP Customer
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Account: {user?.email || 'customer@repairbee.com'} • {user?.phone || '+91 98765 43210'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadDashboardData} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} className={loading ? 'live-pulse' : ''} />
            <span>Sync Live DB</span>
          </button>
          <Link to="/book" className="btn-primary" style={{ padding: '10px 18px', fontSize: '13px' }}>
            <Plus size={16} />
            <span>Book New Repair</span>
          </Link>
        </div>
      </div>

      {actionMsg && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--emerald-light)',
          border: '1px solid var(--emerald-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--emerald-dark)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {actionError && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--rose-light)',
          border: '1px solid var(--rose-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--rose)',
          fontSize: '13px',
          marginBottom: '20px'
        }}>
          {actionError}
        </div>
      )}

      {/* 4 TOP KPI SUMMARY CARDS (Stitch Screen 4) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Active Repairs
            </span>
            <span className="badge badge-amber" style={{ fontSize: '10px' }}>
              Live
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
            {activeOrders.length} In Progress
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            ₹{totalEscrowLocked.toLocaleString()} locked in escrow vault
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Fixed & Delivered
            </span>
            <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
              Completed
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
            {completedOrders.length} Devices
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            100% verified repair quality
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Active Warranties
            </span>
            <span className="badge badge-blue" style={{ fontSize: '10px' }}>
              Protected
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb', fontFamily: 'var(--font-mono)' }}>
            {activeWarranties.length} Active
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Multi-tier device protection guarantee
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Escrow Protection
            </span>
            <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
              Secured
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
            100% Safe
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Bank-grade holding vault
          </div>
        </div>
      </div>

      {/* URGENT ACTION ALERT: SHOP QUOTE AWAITING APPROVAL (DISPLAY ONLY WHEN REAL QUOTE EXISTS) */}
      {pendingQuoteOrder && (() => {
        const rawQuote = Number(pendingQuoteOrder.quote_amount || 0);
        const activeTierKey = selectedQuoteWarrantyTier || pendingQuoteOrder.warranty_tier || 'standard';
        const activePlan = WARRANTY_TIERS[activeTierKey] || WARRANTY_TIERS.standard;
        const warrantyAmount = activePlan.price;
        const promoDiscount = quoteAppliedPromo ? Number(quoteAppliedPromo.discount || 0) : Number(pendingQuoteOrder.discount_amount || 0);
        const netQuote = Math.max(0, rawQuote + warrantyAmount - promoDiscount);
        const willUseWallet = useWalletForQuote && walletBalance > 0;
        const walletDeduction = willUseWallet ? Math.min(walletBalance, netQuote) : 0;
        const remainingToPay = Math.max(0, netQuote - walletDeduction);

        return (
          <div style={{
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
            border: '1.5px solid #f59e0b',
            boxShadow: '0 4px 14px rgba(217, 119, 6, 0.1)',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#92400e' }}>
                    Workshop Inspection Ready: Quote Awaiting Your Approval
                  </div>
                  <div style={{ fontSize: '13px', color: '#78350f', marginTop: '3px' }}>
                    {pendingQuoteOrder.shop_name || 'Workshop'} completed bench diagnostic on <strong>{pendingQuoteOrder.product_name || 'Device'} (Order #{pendingQuoteOrder.id.slice(0, 8)})</strong>.
                  </div>
                  <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px' }}>
                    🔒 Zero payment releases until doorstep testing. Funds will be held strictly in your Escrow Vault.
                  </div>
                </div>
              </div>

              {/* Price Breakdown Pill */}
              <div style={{ background: '#ffffff', padding: '12px 18px', borderRadius: '10px', border: '1px solid #fde68a', textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bench Repair Quote</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#92400e', fontFamily: 'var(--font-mono)' }}>
                  ₹{rawQuote.toLocaleString()}
                </div>
                {warrantyAmount > 0 ? (
                  <div style={{ fontSize: '11px', color: activePlan.color, fontWeight: 700 }}>
                    +₹{warrantyAmount.toLocaleString()} ({activePlan.shortName})
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                    Included: 30-Day Platform Warranty (₹0)
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--emerald)', fontWeight: 700 }}>
                    -₹{promoDiscount.toLocaleString()} ({quoteAppliedPromo?.code || 'Promo'} Applied)
                  </div>
                )}
                {walletDeduction > 0 && (
                  <div style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 700 }}>
                    -₹{walletDeduction.toLocaleString()} (Paid from Wallet)
                  </div>
                )}
                <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: '6px', paddingTop: '4px', fontSize: '12px', fontWeight: 800, color: 'var(--secondary)' }}>
                  Due into Escrow: ₹{remainingToPay.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Protection Plan Selector */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed #fcd34d' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400e', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={15} style={{ color: '#d97706' }} />
                  Choose Device Protection & Extended Warranty Plan:
                </span>
                <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                  You can upgrade tier anytime before locking escrow
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                {Object.values(WARRANTY_TIERS).map((plan) => {
                  const isSelected = activeTierKey === plan.id;
                  return (
                    <div
                      key={plan.id}
                      id={`quote-plan-${plan.id}`}
                      onClick={() => setSelectedQuoteWarrantyTier(plan.id)}
                      style={{
                        cursor: 'pointer',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                        border: isSelected ? `2px solid ${plan.color}` : '1.5px solid #fde68a',
                        boxShadow: isSelected ? `0 4px 12px ${plan.color}25` : 'none',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '10px',
                          background: plan.color,
                          color: '#ffffff',
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '1px 7px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          ✓ ACTIVE TIER
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--secondary)' }}>
                          {plan.badge}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: plan.price > 0 ? plan.color : '#059669', fontFamily: 'var(--font-mono)' }}>
                          {plan.price === 0 ? 'FREE' : `+₹${plan.price}`}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                        {plan.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Coupon and Wallet options */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #fcd34d', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', alignItems: 'center' }}>
              {/* Promo code field */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={13} />
                  <span>Apply Promo Code:</span>
                </div>
                {quoteAppliedPromo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--emerald)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--emerald)' }}>
                      ✓ {quoteAppliedPromo.code} (-₹{quoteAppliedPromo.discount})
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuoteAppliedPromo(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: '11px', marginLeft: 'auto' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="FIRSTFIX or SAVE20"
                        value={quotePromoInput}
                        onChange={(e) => setQuotePromoInput(e.target.value.toUpperCase())}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d97706', fontSize: '12px', textTransform: 'uppercase', width: '150px' }}
                      />
                      <button
                        type="button"
                        disabled={quotePromoLoading || !quotePromoInput.trim()}
                        onClick={() => handleApplyQuotePromo(quotePromoInput, rawQuote)}
                        className="btn-outline"
                        style={{ padding: '6px 12px', fontSize: '11px', background: '#ffffff' }}
                      >
                        {quotePromoLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {quotePromoError && <div style={{ fontSize: '11px', color: 'var(--rose)', marginTop: '4px' }}>{quotePromoError}</div>}
                  </div>
                )}
              </div>

              {/* Wallet checkout toggle */}
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--secondary)' }}>
                  <input
                    type="checkbox"
                    checked={useWalletForQuote}
                    onChange={(e) => setUseWalletForQuote(e.target.checked)}
                    disabled={walletBalance <= 0}
                  />
                  <span>Apply Wallet Balance (₹{walletBalance.toLocaleString()} available)</span>
                </label>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '24px', marginTop: '2px' }}>
                  {walletBalance > 0
                    ? `Deducts ₹${walletDeduction.toLocaleString()} directly from wallet`
                    : 'Wallet empty — add funds in the Escrow & Wallet tab'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center', marginTop: '16px' }}>
              <button
                disabled={actionLoading}
                onClick={() => handleRejectQuote(pendingQuoteOrder.id)}
                className="btn-outline"
                style={{ fontSize: '13px', padding: '8px 14px', background: '#ffffff' }}
              >
                Reject Quote
              </button>
              <button
                id="approve-quote-btn"
                disabled={actionLoading}
                onClick={() => handleApproveQuote(pendingQuoteOrder.id, activeTierKey)}
                className="btn-primary"
                style={{ fontSize: '13px', padding: '10px 22px' }}
              >
                <Lock size={15} />
                <span>
                  {actionLoading ? 'Processing...' : `Approve & Fund Escrow (₹${remainingToPay.toLocaleString()})`}
                </span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* TABS NAVIGATION */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '2px solid var(--border-default)',
        marginBottom: '24px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'orders', label: `My Repairs & Warranties (${orders.length})` },
          { id: 'referrals', label: '🎁 Refer & Earn (Get ₹100)' },
          { id: 'wallet', label: `Escrow & Wallet (₹${walletBalance.toLocaleString()})` },
          { id: 'disputes', label: `Disputes Resolution (${disputes.length})` },
          { id: 'addresses', label: `Saved Addresses (${addresses.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT 1: ORDERS & WARRANTIES */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No orders found in your account. Click "Book New Repair" to get started!
            </div>
          ) : (
            orders.map((ord) => {
              const isCompleted = ord.current_status === 'delivery_confirmed' || ord.current_status === 'completed';
              const activeReRepair = orders.find(child => 
                child.parent_order_id === ord.id && 
                !['delivery_confirmed', 'completed', 'cancelled'].includes(child.current_status)
              );
              const tierKey = ord.warranty_tier || 'standard';
              const tierConfig = WARRANTY_TIERS[tierKey] || WARRANTY_TIERS.standard;
              const warrantyDays = ord.warranty_days ? Number(ord.warranty_days) : tierConfig.days;
              const isWarrantyActive = ord.warranty_expires_at ? new Date(ord.warranty_expires_at) > new Date() : true;
              const daysRemaining = ord.warranty_expires_at
                ? Math.max(0, Math.ceil((new Date(ord.warranty_expires_at) - new Date()) / (1000 * 60 * 60 * 24)))
                : warrantyDays;

              return (
                <div key={ord.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-default)', paddingBottom: '14px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--secondary)' }}>
                          Order #{ord.id.slice(0, 8)}
                        </span>
                        <span
                          id={`warranty-badge-${ord.id.slice(0, 8)}`}
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: tierConfig.bgColor,
                            color: tierConfig.color,
                            border: `1px solid ${tierConfig.borderColor}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          {tierConfig.badge}
                        </span>
                        {ord.is_warranty_claim && (
                          <span className="badge badge-amber" style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', border: '1px solid #f59e0b' }}>
                            ⚡ Warranty Claim Rework
                          </span>
                        )}
                        {(ord.qc_report || ['quality_check', 'repair_completed', 'out_for_delivery', 'delivered', 'delivery_confirmed'].includes(ord.current_status)) && (
                          <span
                            id={`qc-badge-${ord.id.slice(0, 8)}`}
                            onClick={() => {
                              setSelectedInvoiceTab('certificate');
                              setSelectedInvoiceOrderId(ord.id);
                            }}
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Click to view 12-Point Cleanroom Hardware QC Certificate"
                          >
                            <ShieldCheck size={11} style={{ color: '#10b981' }} />
                            <span>✓ 12-Point QC Certified</span>
                          </span>
                        )}
                        <span className={isCompleted ? 'badge badge-emerald' : 'badge badge-amber'}>
                          {ord.current_status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--secondary)', marginTop: '4px' }}>
                        {ord.product_name || 'Device'} • {ord.description}
                      </div>
                      {ord.is_warranty_claim && ord.parent_order_id && (
                        <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px', fontWeight: 600 }}>
                          ↳ Free rework under {tierConfig.shortName} (Linked to Order #{ord.parent_order_id.slice(0, 8)})
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Escrow Quote</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: ord.is_warranty_claim ? '#059669' : 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                        {ord.is_warranty_claim ? '₹0.00 (Warranty)' : `₹${Number(ord.quote_amount || 0).toLocaleString()}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-muted)', alignItems: 'center' }}>
                      <div>
                        Partner Shop: <strong style={{ color: 'var(--secondary)' }}>{ord.shop_name || 'Fix It Electronics'}</strong>
                      </div>
                      {isCompleted && (
                        daysRemaining > 0 ? (
                          <div style={{ color: tierConfig.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={14} />
                            <span>{tierConfig.badge}: {daysRemaining} Days Left</span>
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={14} />
                            <span>{tierConfig.shortName} Expired</span>
                          </div>
                        )
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link to={`/track/${ord.id}`} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                        Track Live Status →
                      </Link>

                      <button
                        type="button"
                        id={`invoice-btn-${ord.id.slice(0, 8)}`}
                        onClick={() => setSelectedInvoiceOrderId(ord.id)}
                        className="btn-outline"
                        style={{
                          padding: '8px 12px',
                          fontSize: '12px',
                          color: '#0284c7',
                          borderColor: '#38bdf8',
                          background: 'rgba(2, 132, 199, 0.05)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <FileText size={14} />
                        <span>Invoice & QC Cert</span>
                      </button>

                      {isCompleted && (
                        activeReRepair ? (
                          <Link
                            to={`/track/${activeReRepair.id}`}
                            className="btn-outline"
                            style={{
                              padding: '8px 14px',
                              fontSize: '12px',
                              color: '#d97706',
                              borderColor: '#f59e0b',
                              background: '#fffbeb',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                          >
                            <span>⚡ Re-Repair in Progress (#{activeReRepair.id.slice(0, 8)}) →</span>
                          </Link>
                        ) : daysRemaining > 0 ? (
                          <button
                            id={`claim-warranty-btn-${ord.id.slice(0, 8)}`}
                            onClick={() => setSelectedWarrantyOrder(ord)}
                            className="btn-outline"
                            style={{
                              padding: '8px 14px',
                              fontSize: '12px',
                              color: tierConfig.color,
                              borderColor: tierConfig.borderColor,
                              background: tierConfig.bgColor,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <ShieldCheck size={14} />
                            <span>Claim {tierConfig.shortName}</span>
                          </button>
                        ) : null
                      )}

                      {isCompleted && (
                        <button
                          id={`rate-service-btn-${ord.id.slice(0, 8)}`}
                          onClick={() => setSelectedReviewOrder(ord)}
                          className="btn-outline"
                          style={{
                            padding: '8px 14px',
                            fontSize: '12px',
                            color: '#b45309',
                            borderColor: '#f59e0b',
                            background: '#fffbeb',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Star size={14} fill="#f59e0b" color="#f59e0b" />
                          <span>Rate Service</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedDisputeOrderId(ord.id)}
                        className="btn-outline"
                        style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--rose)', borderColor: 'var(--rose-border)' }}
                      >
                        File Dispute
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: REFER & EARN */}
      {activeTab === 'referrals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Honeycomb Loyalty Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #f59e0b 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 8px 24px rgba(217, 119, 6, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                🍯
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
                  HONEYCOMB REWARDS & SCRATCH CARDS
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>
                  Unlock Up to 2.0x Double Cashback & VIP Courier Priority
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                  Scratch your interactive honeycomb cards, view your tier level, and track your referral tree!
                </div>
              </div>
            </div>
            <Link
              to="/rewards"
              style={{
                background: '#090d16',
                color: '#fbbf24',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                borderRadius: '8px',
                padding: '10px 20px',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              <span>Open Rewards Studio</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>

          {/* Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ maxWidth: '620px', position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, marginBottom: '16px' }}>
                <Gift size={15} style={{ color: '#fbbf24' }} />
                <span>RepairBee Referral Program</span>
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, lineHeight: '1.25', marginBottom: '10px' }}>
                Give ₹100 Off, Earn ₹50 Wallet Cash
              </h2>
              <p style={{ fontSize: '14px', color: '#c7d2fe', lineHeight: '1.6', marginBottom: '24px' }}>
                Share your unique invite code with friends who need phone, laptop, or appliance repairs. When they complete doorstep delivery, they save ₹100 and you get ₹50 credited straight to your RepairBee Wallet!
              </p>

              {/* Referral Code Box */}
              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '8px 12px 8px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)'
              }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Your Exclusive Referral Code
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--secondary)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
                    {referralCode || 'GENERATING...'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    id="copy-referral-btn"
                    onClick={handleCopyReferral}
                    className="btn-primary"
                    style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedCode ? 'Link Copied!' : 'Copy Invite Link'}</span>
                  </button>
                  <button
                    id="whatsapp-share-btn"
                    onClick={() => {
                      const shareText = `Fix your phone, laptop, or gadget on RepairBee with 100% Escrow Protection! Use my referral code *${referralCode}* to get ₹100 OFF your doorstep repair: ${window.location.origin}/book?ref=${referralCode}`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
                    }}
                    style={{
                      background: '#25D366',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Share2 size={16} />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Friends Invited</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--secondary)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {referralStats.total_referrals || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Invited via your personal link</div>
            </div>

            <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--emerald)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Repairs Completed</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {referralStats.completed || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Delivered & QC tested devices</div>
            </div>

            <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--amber)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Wallet Cash Earned</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#d97706', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                ₹{Number(referralStats.total_rewards || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Credited to your RepairBee Wallet</div>
            </div>
          </div>

          {/* 3-Step "How It Works" Guide */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '18px' }}>
              How the Referral Program Works
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div style={{ padding: '18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}>
                  1
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '4px' }}>
                  Share Your Link
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Send your referral code or WhatsApp invite link to friends, family, or colleagues.
                </div>
              </div>

              <div style={{ padding: '18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}>
                  2
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '4px' }}>
                  Friend Gets ₹100 Off
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  They book doorstep pickup with zero upfront cost and get ₹100 discounted from their bench quote.
                </div>
              </div>

              <div style={{ padding: '18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}>
                  3
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '4px' }}>
                  You Earn ₹50 Cash
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Once their repair is delivered and test approved, ₹50 drops straight into your wallet for future repairs!
                </div>
              </div>
            </div>
          </div>

          {/* Referral Activity Table */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '14px' }}>
              Referral Invites & Reward History
            </div>
            {(!referralStats.referrals || referralStats.referrals.length === 0) ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No friends have used your code yet. Share your code to start earning wallet credits!
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>Friend</th>
                    <th style={{ padding: '10px' }}>Date Invited</th>
                    <th style={{ padding: '10px' }}>Their Discount</th>
                    <th style={{ padding: '10px' }}>Your Reward</th>
                    <th style={{ padding: '10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referralStats.referrals.map((ref) => (
                    <tr key={ref.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>{ref.referee_name || 'Friend'}</td>
                      <td style={{ padding: '12px 10px' }}>{new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ padding: '12px 10px', color: 'var(--emerald)', fontWeight: 600 }}>₹{ref.referee_discount_amount} OFF</td>
                      <td style={{ padding: '12px 10px', color: '#4f46e5', fontWeight: 700 }}>+₹{ref.referrer_reward_amount}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge ${ref.status === 'completed' ? 'badge-emerald' : 'badge-amber'}`}>
                          {ref.status === 'completed' ? '✓ Completed' : '⌛ In Progress'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: ESCROW VAULT & LEDGER */}
      {activeTab === 'wallet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card" style={{ padding: '24px', background: '#0f172a', color: '#ffffff' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>
                Escrow Vault Holding
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)', margin: '6px 0' }}>
                ₹{totalEscrowLocked.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} />
                <span>Locked in platform trust account until delivery approval</span>
              </div>
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Available Wallet Balance
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--secondary)', fontFamily: 'var(--font-mono)', margin: '6px 0' }}>
                ₹{Number(walletBalance).toLocaleString('en-IN')}
              </div>
              <button
                id="add-funds-btn"
                onClick={() => setShowTopUpModal(true)}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>+ Add Funds via UPI / Netbanking</span>
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '14px' }}>
              Escrow Ledger & Transaction Audit Trail
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px' }}>Date</th>
                  <th style={{ padding: '10px' }}>Transaction Type</th>
                  <th style={{ padding: '10px' }}>Order Reference</th>
                  <th style={{ padding: '10px' }}>Amount</th>
                  <th style={{ padding: '10px' }}>Escrow Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No transactions recorded. All repair requests and escrow holds will be audited here.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => {
                    const dateStr = ord.created_at ? new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
                    const isCompleted = ord.current_status === 'delivery_confirmed' || ord.current_status === 'completed';
                    const hasQuote = ord.quote_amount && Number(ord.quote_amount) > 0;
                    return (
                      <tr key={ord.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 10px' }}>{dateStr}</td>
                        <td style={{ padding: '12px 10px', fontWeight: 600 }}>
                          {ord.is_warranty_claim ? 'Warranty Rework' : hasQuote ? 'Escrow Lock' : 'Diagnostic Intake'}
                        </td>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                          <Link to={`/track/${ord.id}`} style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: 700 }}>
                            #{ord.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 700, color: hasQuote ? 'var(--secondary)' : 'var(--emerald)' }}>
                          {hasQuote ? `₹${Number(ord.quote_amount).toLocaleString()}` : '₹0.00 (Diagnostic)'}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span className={isCompleted ? 'badge badge-emerald' : hasQuote ? 'badge badge-amber' : 'badge badge-slate'}>
                            {isCompleted ? 'Released to Shop' : hasQuote ? 'Safe In Vault' : '₹0 Upfront'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: DISPUTES RESOLUTION CENTER */}
      {activeTab === 'disputes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', color: 'var(--secondary)' }}>Customer Disputes & Arbitration Log</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Every dispute freezes the workshop's escrow release until verified resolution.
              </p>
            </div>
            {orders.length > 0 && (
              <button
                onClick={() => setSelectedDisputeOrderId(orders[0].id)}
                className="btn-primary"
                style={{ fontSize: '12px', padding: '8px 14px', background: 'var(--rose)' }}
              >
                + File New Dispute
              </button>
            )}
          </div>

          {disputes.length === 0 ? (
            <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              ✓ No disputes filed. All previous repairs completed satisfactorily.
            </div>
          ) : (
            disputes.map((d) => (
              <div key={d.id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--rose)' }}>
                      Case #{d.id.slice(0, 8)}
                    </span>
                    <h4 style={{ fontSize: '15px', color: 'var(--secondary)', marginTop: '2px' }}>
                      "{d.reason}"
                    </h4>
                  </div>
                  <span className={d.status === 'resolved' ? 'badge badge-emerald' : 'badge badge-rose'}>
                    {d.status?.toUpperCase()}
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '12px' }}>
                  {d.description}
                </p>

                {d.status === 'resolved' && (
                  <div style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--emerald-light)',
                    border: '1px solid var(--emerald-border)',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--emerald-dark)', marginBottom: '2px' }}>
                      ✓ Platform Resolution: {d.resolution_type?.toUpperCase()}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {d.admin_notes || 'Resolved by administrator.'}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT 4: SAVED ADDRESSES */}
      {activeTab === 'addresses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--secondary)' }}>
                Saved Pickup & Delivery Addresses
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Precision building entrances & GPS coordinates for zero-hassle courier doorsteps
              </p>
            </div>
            <button
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="btn-primary"
              style={{ fontSize: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              <span>{showAddAddress ? 'Close Form' : 'Add New Address'}</span>
            </button>
          </div>

          {showAddAddress && (
            <form
              onSubmit={handleAddAddress}
              className="card"
              style={{
                padding: '24px',
                border: '1.5px solid var(--primary)',
                background: '#ffffff',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} style={{ color: 'var(--primary)' }} />
                    <span>Register Pinpoint Doorstep Location</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Select an address tag and drop a pin on your building gate for runner courier routing
                  </div>
                </div>

                {/* Address Label Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {[
                    { id: 'home', label: 'Home', icon: Home },
                    { id: 'office', label: 'Work / Office', icon: Briefcase },
                    { id: 'other', label: 'Other', icon: MapPin },
                  ].map((t) => {
                    const isSel = newLabel === t.id;
                    const IconComp = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewLabel(t.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: isSel ? 700 : 500,
                          background: isSel ? 'var(--secondary)' : '#f1f5f9',
                          color: isSel ? '#ffffff' : 'var(--secondary)',
                          border: isSel ? '1px solid var(--secondary)' : '1px solid var(--border-default)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <IconComp size={13} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Street Address Input */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'block' }}>
                  Street Address & Flat / Building Details <span style={{ color: 'var(--rose)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Flat/Door No., Wing, Building Name, Street / Layout..."
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              {/* City and PIN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'block' }}>
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="City (e.g. Bangalore)..."
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px', display: 'block' }}>
                    PIN Code <span style={{ color: 'var(--rose)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="6-digit PIN Code (e.g. 560001)..."
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Interactive Location Map Pin Picker */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)' }}>
                    Drop Pin on Map (Exact Doorstep Location)
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Coordinates: <strong>{newCoords?.lat?.toFixed(4)}, {newCoords?.lng?.toFixed(4)}</strong>
                  </span>
                </div>
                <LocationPickerMap
                  coordinates={newCoords}
                  onChange={setNewCoords}
                  onAddressHint={(hint) => {
                    if (!newStreet) setNewStreet(`Near ${hint}`);
                  }}
                  height={220}
                />
              </div>

              {/* Default Address Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <input
                  id="chk-make-default"
                  type="checkbox"
                  checked={newIsDefault || addresses.length === 0}
                  onChange={(e) => setNewIsDefault(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="chk-make-default" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--secondary)', cursor: 'pointer' }}>
                  ⭐ Set as my primary default delivery address
                </label>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddAddress(false)}
                  className="btn-outline"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addressSaving}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={14} />
                  <span>{addressSaving ? 'Saving Address...' : 'Save Address & Pin'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Saved Addresses List Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
            {addresses.length === 0 ? (
              <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: 'var(--text-muted)' }}>
                  <MapPin size={24} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '4px' }}>
                  No saved addresses yet
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 16px' }}>
                  Register your doorstep address and pin your exact building entrance for lightning-fast courier pickups.
                </p>
                <button onClick={() => setShowAddAddress(true)} className="btn-primary" style={{ fontSize: '12px', padding: '8px 16px' }}>
                  + Add First Address
                </button>
              </div>
            ) : (
              addresses.map((addr) => {
                const isDefault = !!addr.is_default;
                const labelIcon = addr.label === 'office' ? Briefcase : addr.label === 'other' ? MapPin : Home;
                const LabelIconComponent = labelIcon;
                const displayLabel = addr.label === 'office' ? 'Work / Office' : addr.label === 'other' ? 'Other Location' : 'Home';
                const hasGps = addr.lat && addr.lng;

                return (
                  <div
                    key={addr.id}
                    className="card"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                      borderRadius: 'var(--radius-lg)',
                      border: isDefault ? '2px solid var(--primary)' : '1px solid var(--border-default)',
                      background: isDefault ? 'linear-gradient(180deg, #fffdf8 0%, #ffffff 100%)' : '#ffffff',
                      boxShadow: isDefault ? '0 4px 16px rgba(245, 158, 11, 0.12)' : 'var(--shadow-sm)',
                      position: 'relative'
                    }}
                  >
                    <div>
                      {/* Card Header: Label Pill & Default Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          background: isDefault ? 'rgba(245, 158, 11, 0.12)' : '#f1f5f9',
                          color: isDefault ? '#b45309' : 'var(--secondary)',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          <LabelIconComponent size={12} />
                          <span>{displayLabel}</span>
                        </div>

                        {isDefault ? (
                          <span className="badge badge-amber" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Star size={11} fill="currentColor" />
                            <span>Primary Default</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Saved Location
                          </span>
                        )}
                      </div>

                      {/* Address Lines */}
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)', lineHeight: '1.4' }}>
                        {addr.address_line}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {addr.city}, {addr.state || 'Karnataka'} {addr.pincode ? `– ${addr.pincode}` : ''}
                      </div>

                      {/* GPS Badge */}
                      {hasGps ? (
                        <div style={{
                          marginTop: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          color: '#047857',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600
                        }}>
                          <CheckCircle2 size={12} />
                          <span>GPS Pin: {Number(addr.lat).toFixed(4)}°, {Number(addr.lng).toFixed(4)}°</span>
                        </div>
                      ) : (
                        <div style={{
                          marginTop: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: '#f8fafc',
                          color: 'var(--text-muted)',
                          fontSize: '11px'
                        }}>
                          <MapPin size={11} />
                          <span>Standard Street Address</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-default)',
                      marginTop: '4px'
                    }}>
                      {!isDefault ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          disabled={settingDefaultId === addr.id}
                          className="btn-outline"
                          style={{
                            fontSize: '11px',
                            padding: '5px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <Star size={12} />
                          <span>{settingDefaultId === addr.id ? 'Setting...' : 'Set as Primary'}</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={12} /> Default for all courier pickups
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        disabled={deletingAddressId === addr.id}
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fca5a5',
                          borderRadius: 'var(--radius-md)',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Trash2 size={12} />
                        <span>{deletingAddressId === addr.id ? 'Removing...' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {selectedDisputeOrderId && (
        <DisputeModal
          isOpen={!!selectedDisputeOrderId}
          onClose={() => setSelectedDisputeOrderId(null)}
          orderId={selectedDisputeOrderId}
          onDisputeRaised={() => {
            loadDashboardData();
            setActiveTab('disputes');
          }}
        />
      )}

      {/* 30-Day Warranty Claim Modal */}
      {selectedWarrantyOrder && (
        <WarrantyClaimModal
          isOpen={!!selectedWarrantyOrder}
          onClose={() => setSelectedWarrantyOrder(null)}
          order={selectedWarrantyOrder}
          onClaimCreated={async () => {
            await loadDashboardData();
          }}
        />
      )}

      {/* Tax Invoice & Cleanroom QC Certificate Modal */}
      {selectedInvoiceOrderId && (
        <InvoiceCertificateModal
          orderId={selectedInvoiceOrderId}
          initialTab={selectedInvoiceTab}
          onClose={() => {
            setSelectedInvoiceOrderId(null);
            setSelectedInvoiceTab('both');
          }}
        />
      )}

      {/* Verified Review & Rating Modal */}
      {selectedReviewOrder && (
        <ReviewModal
          isOpen={!!selectedReviewOrder}
          onClose={() => setSelectedReviewOrder(null)}
          orderId={selectedReviewOrder?.id}
          shopName={selectedReviewOrder?.shop_name}
          partnerName={selectedReviewOrder?.delivery_partner_name}
          onReviewSubmitted={async () => {
            await loadDashboardData();
          }}
        />
      )}

      {/* Wallet Top-Up Modal */}
      {showTopUpModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '28px', background: '#ffffff', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--secondary)', margin: 0 }}>
                  Add Funds to Wallet
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
              Top up your digital wallet via UPI, Debit/Credit Card or Netbanking. Funds can be used instantly to approve and secure bench repair escrow quotes.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--secondary)', display: 'block', marginBottom: '6px' }}>
                Top-Up Amount (₹)
              </label>
              <input
                id="topup-amount-input"
                type="number"
                min="10"
                step="100"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  fontSize: '18px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {['500', '1000', '2500', '5000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTopUpAmount(preset)}
                  style={{
                    flex: 1,
                    minWidth: '70px',
                    padding: '8px',
                    borderRadius: '6px',
                    border: topUpAmount === preset ? '1.5px solid var(--primary)' : '1px solid var(--border-default)',
                    background: topUpAmount === preset ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-canvas)',
                    color: topUpAmount === preset ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  +₹{Number(preset).toLocaleString()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="btn-outline"
                style={{ padding: '10px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                id="confirm-topup-btn"
                type="button"
                disabled={topUpLoading}
                onClick={handleTopUpWallet}
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '13px' }}
              >
                {topUpLoading ? 'Processing...' : `Confirm Top-Up (₹${Number(topUpAmount || 0).toLocaleString()})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
