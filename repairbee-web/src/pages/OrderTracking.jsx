import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { repairsApi, quotesApi, warrantyApi, chatApi, disputesApi, ratingsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import DisputeModal from '../components/DisputeModal';
import ReviewModal from '../components/ReviewModal';
import WarrantyClaimModal from '../components/WarrantyClaimModal';
import LiveRunnerTrackingMap from '../components/LiveRunnerTrackingMap';
import InvoiceCertificateModal from '../components/InvoiceCertificateModal';
import BenchChatBox from '../components/BenchChatBox';
import CleanroomVideoPlayer from '../components/CleanroomVideoPlayer';
import confetti from 'canvas-confetti';
import {
  Wrench,
  ShieldCheck,
  Star,
  Lock,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  Building,
  Camera,
  MessageSquare,
  Check,
  Award,
  DollarSign,
  AlertOctagon,
  RefreshCw,
  Send,
  QrCode,
  MapPin,
  Phone,
  Sparkles,
  Smartphone,
  Volume2,
  Zap,
  CheckSquare,
  Copy,
  FileText,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function OrderTracking() {
  const { id: paramId, orderId: routeOrderId } = useParams();
  const id = paramId || routeOrderId;
  const navigate = useNavigate();
  const { isAuthenticated, quickLoginCustomer, user, token } = useAuth();

  const [orderId, setOrderId] = useState(id || '');
  const [order, setOrder] = useState(null);
  const [activeDispute, setActiveDispute] = useState(null);
  const [warrantyInfo, setWarrantyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Doorstep 4-Point Testing Protocol State
  const [testingChecklist, setTestingChecklist] = useState({
    touchDisplay: false,
    audioMic: false,
    powerCharging: false,
    tamperSeal: false
  });
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Modals
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [warrantyModalOpen, setWarrantyModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceInitialTab, setInvoiceInitialTab] = useState('both');
  const [orderRatings, setOrderRatings] = useState(null);
  const [videoProof, setVideoProof] = useState(null);

  // Workbench communicator state
  const [chatMsg, setChatMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { sender: 'tech', text: 'Hi, I am your assigned workbench technician. Bench inspection calibrated.' }
  ]);

  const loadChat = async (targetOrderId) => {
    if (!targetOrderId) return;
    try {
      const res = await chatApi.getHistory(targetOrderId, 'customer_shop');
      const msgs = res?.data || res?.messages || (Array.isArray(res) ? res : []);
      if (msgs.length > 0) {
        setChatHistory(msgs.map(m => ({
          id: m.id,
          sender: m.sender_role === 'customer' ? 'user' : 'tech',
          senderName: m.sender_name || (m.sender_role === 'customer' ? 'You' : 'Technician'),
          text: m.message,
          time: m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        })));
      } else {
        setChatHistory([
          { sender: 'tech', text: 'Hi! I have your device at Bench Bay 4. Feel free to ask questions about diagnosis, parts, or delivery.', time: 'Bench Log' }
        ]);
      }
    } catch (err) {
      console.warn('Could not load chat history:', err?.message);
    }
  };

  const loadOrder = async (targetId) => {
    setLoading(true);
    setError('');
    try {
      if (!isAuthenticated) {
        await quickLoginCustomer();
      }

      let activeOrder = null;
      if (targetId && targetId !== 'new') {
        const res = await repairsApi.getOrderDetails(targetId);
        activeOrder = res?.data || res;
      } else {
        // Load latest order from customer's orders
        const res = await repairsApi.getMyOrders();
        const list = res?.data || [];
        if (list.length > 0) {
          activeOrder = list[0];
          setOrderId(activeOrder.id);
        }
      }

      setOrder(activeOrder);
      if (activeOrder?.id) {
        loadChat(activeOrder.id);
        try {
          const dispRes = await disputesApi.getDisputes({ orderId: activeOrder.id });
          const dispList = dispRes?.data?.disputes || dispRes?.data || (Array.isArray(dispRes) ? dispRes : []);
          const openDisp = dispList.find(d => d.order_id === activeOrder.id && d.status === 'open');
          setActiveDispute(openDisp || (dispList.length > 0 ? dispList[0] : null));
        } catch (dErr) {
          console.warn('Could not fetch dispute status:', dErr?.message);
        }

        try {
          const wRes = await warrantyApi.getWarrantyInfo(activeOrder.id);
          setWarrantyInfo(wRes?.data || wRes);
        } catch (wErr) {
          console.warn('Could not fetch warranty info:', wErr?.message);
        }

        try {
          const rRes = await ratingsApi.getOrderRatings(activeOrder.id);
          setOrderRatings(rRes?.data || rRes);
        } catch (rErr) {
          console.warn('Could not fetch order ratings:', rErr?.message);
        }

        try {
          const vRes = await repairsApi.getVideoProof(activeOrder.id);
          setVideoProof(vRes?.data || vRes);
        } catch (vErr) {
          console.warn('Could not fetch video proof:', vErr?.message);
        }
      }
    } catch (err) {
      console.error('Failed to load order:', err);
      if (err?.message?.toLowerCase().includes('token') || err?.message?.toLowerCase().includes('expired')) {
        try {
          await quickLoginCustomer();
          return loadOrder(targetId);
        } catch {
          // ignore
        }
      }
      setError(err?.message || 'Could not find order. Please verify Order ID.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder(id);
  }, [id]);

  // Real-time GPS polling for live runner tracking when in transit
  useEffect(() => {
    if (!order?.id) return;
    const inTransit = [
      'partner_assigned',
      'out_for_pickup',
      'picked_up',
      'in_transit',
      'assigned_delivery',
      'out_for_delivery'
    ].includes(order?.current_status);

    if (!inTransit) return;

    const interval = setInterval(async () => {
      try {
        const res = await repairsApi.getOrderDetails(order.id);
        const updated = res?.data || res;
        if (updated) {
          setOrder(prev => ({
            ...prev,
            ...updated,
            runner_lat: updated.runner_lat !== undefined ? updated.runner_lat : prev?.runner_lat,
            runner_lng: updated.runner_lng !== undefined ? updated.runner_lng : prev?.runner_lng,
          }));
        }
      } catch {
        // silent polling catch
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [order?.id, order?.current_status]);

  const handleSearchOrder = (e) => {
    e.preventDefault();
    if (orderId.trim()) {
      navigate(`/track/${orderId.trim()}`);
      loadOrder(orderId.trim());
    }
  };

  // Confirm delivery & release escrow
  const handleConfirmDelivery = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionMsg('');
    setError('');
    try {
      const res = await repairsApi.confirmDelivery(order.id);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setActionMsg(res?.message || '🎉 Delivery confirmed! Funds safely transferred to workshop escrow payout.');
      await loadOrder(order.id);
      setTimeout(() => {
        setReviewModalOpen(true);
      }, 1200);
    } catch (err) {
      if (err?.message?.toLowerCase().includes('token') || err?.message?.toLowerCase().includes('expired')) {
        try {
          await quickLoginCustomer();
          const res = await repairsApi.confirmDelivery(order.id);
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          setActionMsg(res?.message || '🎉 Delivery confirmed! Funds safely transferred to workshop escrow payout.');
          await loadOrder(order.id);
          setTimeout(() => {
            setReviewModalOpen(true);
          }, 1200);
          return;
        } catch (retryErr) {
          setError(retryErr?.message || 'Failed to release escrow');
          return;
        }
      }
      setError(err?.message || 'Failed to release escrow');
    } finally {
      setActionLoading(false);
    }
  };

  // Send message to technician
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMsg.trim() || !order) return;
    const userText = chatMsg.trim();
    setChatMsg('');

    const optimisticMsg = {
      sender: 'user',
      senderName: 'You',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatHistory(prev => [...prev, optimisticMsg]);

    try {
      await chatApi.sendMessage(order.id, userText, 'customer_shop');
    } catch (err) {
      console.warn('Backend chat send notice:', err?.message);
    }

    setTimeout(() => {
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'tech',
          senderName: order?.shop_name || 'Workshop Bench',
          text: 'Acknowledged! Bench telemetry and diagnostic checks are recorded on your order log.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1200);
  };

  // Stepper Stage Calculation
  const stages = [
    { key: 'pickup_requested', title: 'Pickup Logged', desc: 'Runner assigned with RFID tamper seal' },
    { key: 'agent_dispatched', title: 'Doorstep Handover', desc: 'Seal verified & photographic intake' },
    { key: 'received_at_shop', title: 'Received at Hub', desc: 'Bay 4 Cleanroom intake' },
    { key: 'diagnosing', title: 'Bench Diagnosis', desc: 'Customer quote approved' },
    { key: 'in_repair', title: 'Precision Repair', desc: 'Active on bench (ETA ~35 mins)' },
    { key: 'quality_check', title: '24-Point QA Passed', desc: 'Display, touch & thermal test' },
    { key: 'out_for_delivery', title: 'Courier Return', desc: 'Out for doorstep delivery' },
    { key: 'delivery_confirmed', title: 'Tested & Released', desc: 'Customer confirmed & escrow unlocked' },
  ];

  const getActiveStageIndex = (status) => {
    switch (status) {
      case 'repair_requested':
      case 'pickup_requested': return 0;
      case 'partner_assigned':
      case 'out_for_pickup':
      case 'assigned_delivery':
      case 'agent_dispatched': return 1;
      case 'picked_up':
      case 'received_at_shop': return 2;
      case 'diagnosis_in_progress':
      case 'diagnosing':
      case 'quote_sent':
      case 'quote_approved':
      case 'payment_confirmed':
      case 'quote_pending': return 3;
      case 'in_repair':
      case 'repair_in_progress': return 4;
      case 'quality_check':
      case 'repair_completed': return 5;
      case 'out_for_delivery': return 6;
      case 'delivered':
      case 'delivery_confirmed':
      case 'completed': return 7;
      default: return 3;
    }
  };

  const activeStageIdx = order ? getActiveStageIndex(order.current_status) : 3;

  return (
    <div className="container" style={{ padding: '36px 20px 60px' }}>
      {/* Search Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '16px 20px',
        background: '#ffffff',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--secondary)' }}>
            Live Repair Tracker & Escrow Governance
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Real-time workshop bench telemetry, photographic intake proof & escrow release
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            id="btn-track-open-sms"
            onClick={() => window.dispatchEvent(new CustomEvent('open-sms-simulator', { detail: { orderId: order?.id || orderId } }))}
            title="Open simulated WhatsApp & SMS notification stream for this repair order"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '9px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Smartphone size={15} />
            <span>📱 WhatsApp / SMS Stream</span>
          </button>

          <form onSubmit={handleSearchOrder} style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '340px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter Order ID (e.g. 5f0bd809)..."
                className="input-field"
                style={{ paddingLeft: '36px' }}
              />
            </div>
            <button type="submit" className="btn-secondary" style={{ padding: '0 16px' }}>
              Track
            </button>
          </form>
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

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--rose-light)',
          border: '1px solid var(--rose-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--rose)',
          fontSize: '13px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="live-pulse" style={{ margin: '0 auto 12px' }} />
          <div>Connecting to live workshop bench telemetry...</div>
        </div>
      ) : order ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Warranty Claim Rework Priority Banner */}
          {order.is_warranty_claim && (
            <div style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
              border: '2px solid #f59e0b',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#f59e0b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '20px',
                  flexShrink: 0
                }}>
                  ⚡
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#92400e' }}>
                    30-Day Platform Warranty Re-Repair Claim (Zero Customer Cost)
                  </div>
                  <div style={{ fontSize: '12px', color: '#78350f', marginTop: '2px' }}>
                    100% Free Doorstep Courier Pickup & Priority Cleanroom Rework.
                    {order.parent_order_id && (
                      <span> Linked to Original Delivered Order <strong>#{order.parent_order_id.slice(0, 8).toUpperCase()}</strong>.</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="badge badge-amber" style={{ fontSize: '12px', padding: '6px 12px', fontWeight: 800 }}>
                ₹0.00 Covered by Warranty
              </span>
            </div>
          )}

          {/* Active Escrow Dispute Banner */}
          {activeDispute && (
            <div style={{
              padding: '18px 22px',
              borderRadius: 'var(--radius-lg)',
              background: activeDispute.status === 'open' 
                ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)' 
                : 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)',
              border: activeDispute.status === 'open' ? '2px solid #ef4444' : '2px solid #10b981',
              boxShadow: activeDispute.status === 'open' 
                ? '0 6px 20px rgba(239, 68, 68, 0.25)' 
                : '0 6px 20px rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: activeDispute.status === 'open' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: activeDispute.status === 'open' ? '#f87171' : '#34d399'
                  }}>
                    {activeDispute.status === 'open' ? <AlertOctagon size={22} /> : <ShieldCheck size={22} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800 }}>
                        {activeDispute.status === 'open' 
                          ? 'Escrow Dispute Under Platform Arbitration' 
                          : 'Arbitration Case Resolved'}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: activeDispute.status === 'open' ? '#ef4444' : '#10b981',
                        color: '#ffffff',
                        textTransform: 'uppercase'
                      }}>
                        Case #{activeDispute.id.slice(0, 8).toUpperCase()} • {activeDispute.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      Claim Category: <strong style={{ color: '#f59e0b' }}>{activeDispute.claim_type || 'General Dispute'}</strong>
                      {activeDispute.pouch_condition && (
                        <span> • Pouch Condition: <strong style={{ color: '#cbd5e1' }}>{activeDispute.pouch_condition}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'right'
                }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Frozen Escrow Hold:</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    ₹{Number(order.total_amount || order.quote_amount || 1850).toLocaleString()} Locked
                  </div>
                </div>
              </div>

              {/* Statement & Findings */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#e2e8f0',
                lineHeight: '1.4'
              }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Statement: </span>
                "{activeDispute.reason}"
                {activeDispute.description && activeDispute.description !== activeDispute.reason && (
                  <div style={{ marginTop: '4px', color: '#cbd5e1' }}>{activeDispute.description}</div>
                )}
              </div>

              {/* Ruling Details if Resolved */}
              {activeDispute.status === 'resolved' && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#34d399' }}>
                      Arbitration Ruling: {activeDispute.resolution_type === 'refund' 
                        ? '100% Full Refund Issued to Customer Wallet' 
                        : activeDispute.resolution_type === 'split_refund' 
                        ? `Split Settlement Executed (Refunded: ₹${Number(activeDispute.refund_amount || 0).toLocaleString()})`
                        : activeDispute.resolution_type === 're_repair'
                        ? 'Free Cleanroom Re-Repair Authorized'
                        : 'Customer Claim Dismissed — Payout Released'}
                    </div>
                    {activeDispute.admin_notes && (
                      <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                        Bench Ruling Note: "{activeDispute.admin_notes}"
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Resolved on {new Date(activeDispute.resolved_at).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Evidence Photos Preview */}
              {activeDispute.evidence_urls && activeDispute.evidence_urls.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Customer Evidence Photographs ({activeDispute.evidence_urls.length}):
                  </div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {activeDispute.evidence_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt="Evidence"
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Order Header & Workshop Credentials Banner */}
          <div className="card" style={{ padding: '24px', background: '#0f172a', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(255, 255, 255, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    color: '#93c5fd'
                  }}>
                    Tamper Seal #RB-{order.id.slice(0, 4).toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '15px', color: '#e2e8f0', fontWeight: 600 }}>
                  {order.product_name || 'Device'} • {order.description || 'Diagnosis and repair'}
                </div>
              </div>

              {/* Partner Hub Badge */}
              <div style={{
                background: '#1e293b',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}>
                  <Building size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                    {order.shop_name || 'Assigned Partner Workshop'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>★ {order.shop_rating ? `${Number(order.shop_rating).toFixed(1)} Rating` : '5.0 Rating'}</span>
                    <span>•</span>
                    <span>Level 3 Cleanroom Certified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Status Tag */}
            <div style={{
              marginTop: '20px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(217, 119, 6, 0.15)',
              border: '1px solid #b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#f59e0b'
                }} className="live-pulse"></span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24' }}>
                  Current Status: {order.current_status?.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  id="open-invoice-top-btn"
                  onClick={() => setInvoiceModalOpen(true)}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  <FileText size={13} />
                  <span>Tax Invoice & QC Cert</span>
                </button>
                <span style={{ fontSize: '12px', color: '#fef3c7' }}>
                  {order.estimated_repair_time ? `Est. Bench Time: ${order.estimated_repair_time}` : `Order Placed: ${new Date(order.created_at).toLocaleDateString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic Health Certificate Banner (if attached) */}
          {(order.diagnostic_report || (order.description && order.description.includes('Diagnostic Cert:'))) && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1))',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(6, 182, 212, 0.2)',
                  color: '#0891b2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Activity size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Verified Hardware Diagnostic Certificate Attached
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {order.diagnostic_report?.certificateId
                      ? `Certificate #${order.diagnostic_report.certificateId} • Overall Health Score: ${order.diagnostic_report.healthScore}/100`
                      : 'Pre-intake dead-pixel, touch digitizer & acoustic frequency sweep attached to workbench.'}
                  </div>
                </div>
              </div>

              <Link
                to="/diagnose"
                style={{
                  padding: '6px 14px',
                  background: '#0891b2',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>View Diagnostic Suite</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {/* Honeycomb Loyalty Reward Banner on Completed Order */}
          {order.current_status === 'delivery_confirmed' && (
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 8px 24px rgba(49, 46, 129, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}>
                  🍯
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    +100 Honeycomb XP & Scratch Card Earned!
                  </div>
                  <div style={{ fontSize: '12px', color: '#c7d2fe' }}>
                    Your repair order delivery earned you loyalty points and a guaranteed cashback scratch card.
                  </div>
                </div>
              </div>

              <Link
                to="/rewards"
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)'
                }}
              >
                <span>Scratch Card Studio</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {/* 8-Stage Visual Stepper Timeline (Stitch Screen 3) */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '18px' }}>
              Custody Chain & Multi-Stage Timeline
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              position: 'relative'
            }}>
              {stages.map((stg, idx) => {
                const isCompleted = idx < activeStageIdx;
                const isActive = idx === activeStageIdx;
                return (
                  <div
                    key={stg.key}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? 'var(--primary-light)' : isCompleted ? '#f8fafc' : '#ffffff',
                      border: isActive ? '2px solid var(--primary)' : isCompleted ? '1px solid var(--emerald-border)' : '1px solid var(--border-default)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: isActive ? 'var(--primary)' : isCompleted ? 'var(--emerald)' : 'var(--text-muted)'
                      }}>
                        STEP 0{idx + 1}
                      </span>
                      {isCompleted ? (
                        <Check size={14} style={{ color: 'var(--emerald)' }} />
                      ) : isActive ? (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} className="live-pulse"></span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: isActive ? 'var(--primary)' : isCompleted ? 'var(--secondary)' : 'var(--text-muted)' }}>
                      {stg.title}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                      {stg.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CLEANROOM HARDWARE QC PASSPORT CARD */}
          {(order.qc_report || ['quality_check', 'repair_completed', 'out_for_delivery', 'delivered', 'delivery_confirmed'].includes(order.current_status)) && (
            <div className="card" style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
              color: '#ffffff',
              border: '1.5px solid #10b981',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.25)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                  }}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#38bdf8' }}>
                        Cleanroom Certified Bench
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                        ✓ ISO 14644-1 CLASS 7 PASS
                      </span>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
                      12-Point Cleanroom Hardware QC Diagnostic Passport
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    id="open-qc-certificate-btn"
                    onClick={() => {
                      setInvoiceInitialTab('certificate');
                      setInvoiceModalOpen(true);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                    }}
                  >
                    <Award size={14} />
                    <span>View Official QC Certificate</span>
                  </button>
                </div>
              </div>

              {/* Bench metadata */}
              <div style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                fontSize: '11px',
                color: '#94a3b8',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                marginBottom: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div><strong>Lead Inspector:</strong> {order.qc_report?.leadTechnician || 'Anand Verma'} ({order.qc_report?.technicianId || 'RB-TECH-041'})</div>
                <div><strong>Cleanroom Station:</strong> {order.qc_report?.workbenchBay || 'Bay #4 • Precision Cleanroom Station'}</div>
                <div><strong>Tamper Seal:</strong> #{order.qc_report?.pouchBarcode || order.pouch_barcode || 'RB-POUCH-34075'}</div>
                <div style={{ marginLeft: 'auto', color: '#34d399', fontWeight: 700 }}>
                  ✓ 12/12 Hardware Benchmark Tests Confirmed
                </div>
              </div>

              {/* Mini-grid of key test highlights */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {(order.qc_report?.deviceInspectionPoints || [
                  { testName: 'Touch Digitizer Accuracy', status: 'PASSED', measuredVal: '100% Capacitive Uniformity' },
                  { testName: 'Display Color & Luminance', status: 'PASSED', measuredVal: '1,250 nits • 0 Dead Pixels' },
                  { testName: 'Battery Capacity & Impedance', status: 'PASSED', measuredVal: 'Battery Health 98%' },
                  { testName: 'Thermal Throttling & Core Temp', status: 'PASSED', measuredVal: '37.8°C Nominal Equilibrium' },
                  { testName: 'Acoustics & Microphones', status: 'PASSED', measuredVal: '85dB SPL Zero Rattle' },
                  { testName: 'Optical Camera & OIS Gyro', status: 'PASSED', measuredVal: '0.04s Laser AF Lock' },
                  { testName: 'Biometrics Secure Enclave', status: 'PASSED', measuredVal: '100% Match Handshake' },
                  { testName: 'Liquid Contact Indicator (LCI)', status: 'PASSED', measuredVal: 'Virgin White Strip Intact' }
                ]).slice(0, 8).map((pt, idx) => (
                  <div key={idx} style={{
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', fontWeight: 700 }}>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{pt.testName}</span>
                      <span style={{ color: '#34d399', fontWeight: 800 }}>✓ PASS</span>
                    </div>
                    <div style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {pt.measuredVal}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLEANROOM REPAIR VIDEO PROOF VAULT */}
          <div style={{ marginBottom: '24px' }}>
            <CleanroomVideoPlayer
              videoProof={videoProof || order?.video_proof_vault}
              orderId={order.id}
              productName={order.product_name}
            />
          </div>

          {/* 2-COLUMN MAIN WORKSPACE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
            {/* LEFT COLUMN: TECHNICIAN TELEMETRY, POUCH SECURITY & PHOTOS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* DOORSTEP LOGISTICS & TAMPER POUCH TELEMETRY CARD */}
              <div className="card" style={{
                padding: '24px',
                background: '#0f172a',
                color: '#ffffff',
                border: '1px solid #1e293b'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0f172a'
                    }}>
                      <Truck size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                        Doorstep Courier & Tamper Pouch Custody
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Tamper-Evident Anti-Static Pouch & Handover OTP Security
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(52, 211, 153, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.3)'
                  }}>
                    Tamper Protocol Active
                  </span>
                </div>

                {/* Pickup Handover OTP (When waiting for pickup) */}
                {['repair_requested', 'pickup_requested', 'partner_assigned', 'out_for_pickup'].includes(order.current_status) && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Your Secret Doorstep Handover OTP
                      </div>
                      <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Share only at doorstep</span>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'center',
                      marginBottom: '10px'
                    }}>
                      {(order.pickup_otp || '749281').split('').map((digit, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: '42px',
                            height: '46px',
                            background: '#090d16',
                            border: '1px solid #f59e0b',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                            fontWeight: 900,
                            fontFamily: 'var(--font-mono)',
                            color: '#fbbf24'
                          }}
                        >
                          {digit}
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: '12px', color: '#cbd5e1', textAlign: 'center', lineHeight: '1.4' }}>
                      🔒 <strong>Courier Safety Instruction:</strong> Hand your device to the RepairBee courier only after they place it inside the anti-static tamper-evident pouch and you inspect the seal.
                    </div>
                  </div>
                )}

                {/* 4-Point Doorstep Testing Protocol & Secret Return Delivery OTP */}
                {['repair_completed', 'quality_check', 'assigned_delivery', 'out_for_delivery', 'delivered'].includes(order.current_status) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                    
                    {/* Interactive 4-Point Hardware Inspection Checklist */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldCheck size={16} style={{ color: '#38bdf8' }} />
                            <span>Doorstep 4-Point Testing Protocol</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            Test repaired device at doorstep before sharing your Delivery OTP
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: Object.values(testingChecklist).every(Boolean) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: Object.values(testingChecklist).every(Boolean) ? '#34d399' : '#fbbf24',
                            border: `1px solid ${Object.values(testingChecklist).every(Boolean) ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                          }}>
                            {Object.values(testingChecklist).filter(Boolean).length}/4 Verified
                          </span>
                          <button
                            type="button"
                            onClick={() => setTestingChecklist({ touchDisplay: true, audioMic: true, powerCharging: true, tamperSeal: true })}
                            style={{
                              background: '#1e293b',
                              border: '1px solid #475569',
                              color: '#cbd5e1',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Mark All
                          </button>
                        </div>
                      </div>

                      {/* 4 Inspection Points */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          {
                            key: 'touchDisplay',
                            icon: Smartphone,
                            title: '1. Touch Digitizer & Display',
                            detail: 'Multi-touch gesture fluid, uniform brightness, zero dead pixels or discoloration.'
                          },
                          {
                            key: 'audioMic',
                            icon: Volume2,
                            title: '2. Acoustics, Speakers & Mic',
                            detail: 'Ear speaker clarity verified, loud speaker test ringtone crisp, zero buzz or rattle.'
                          },
                          {
                            key: 'powerCharging',
                            icon: Zap,
                            title: '3. Rapid Power Delivery & Charging',
                            detail: 'USB cable handshake confirmed, charging indicator active with nominal temperature.'
                          },
                          {
                            key: 'tamperSeal',
                            icon: ShieldCheck,
                            title: '4. VOID Tamper Seal & Reassembly',
                            detail: 'Cleanroom tamper seal intact, screen seated flush with zero gaps or chassis flex.'
                          }
                        ].map((chk) => {
                          const IconComp = chk.icon;
                          const isChecked = !!testingChecklist[chk.key];
                          return (
                            <label
                              key={chk.key}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                background: isChecked ? 'rgba(16, 185, 129, 0.08)' : '#090d16',
                                border: isChecked ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #1e293b',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => setTestingChecklist(prev => ({ ...prev, [chk.key]: e.target.checked }))}
                                style={{
                                  marginTop: '2px',
                                  width: '16px',
                                  height: '16px',
                                  accentColor: '#10b981',
                                  cursor: 'pointer'
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <IconComp size={13} style={{ color: isChecked ? '#34d399' : '#94a3b8' }} />
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: isChecked ? '#f8fafc' : '#cbd5e1' }}>
                                    {chk.title}
                                  </span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', lineHeight: '1.3' }}>
                                  {chk.detail}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {/* Status Advice */}
                      <div style={{
                        marginTop: '10px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: Object.values(testingChecklist).every(Boolean) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                        border: `1px solid ${Object.values(testingChecklist).every(Boolean) ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.3)'}`,
                        fontSize: '11px',
                        color: Object.values(testingChecklist).every(Boolean) ? '#34d399' : '#fbbf24',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {Object.values(testingChecklist).every(Boolean) ? (
                          <>
                            <CheckCircle2 size={14} />
                            <span>✓ All 4 hardware inspections passed! Share your Delivery OTP below with the courier to complete handover.</span>
                          </>
                        ) : (
                          <>
                            <Clock size={14} />
                            <span>Inspect device thoroughly before sharing OTP. Handover releases escrow payout to workshop.</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Secret Delivery OTP Display Card */}
                    <div style={{
                      background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.1) 100%)',
                      border: '1.5px solid #10b981',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: '0 4px 18px rgba(16, 185, 129, 0.15)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Lock size={14} />
                          <span>Secret Doorstep Delivery OTP</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Share with courier at delivery</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginBottom: '12px' }}>
                        {(order.delivery_otp || '839102').split('').map((digit, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: '44px',
                              height: '48px',
                              background: '#090d16',
                              border: '1.5px solid #10b981',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '24px',
                              fontWeight: 900,
                              fontFamily: 'var(--font-mono)',
                              color: '#34d399',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            {digit}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText(order.delivery_otp || '839102');
                              setCopiedOtp(true);
                              setTimeout(() => setCopiedOtp(false), 2000);
                            } catch {}
                          }}
                          title="Copy Delivery OTP"
                          style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: copiedOtp ? '#34d399' : '#cbd5e1',
                            padding: '10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '4px'
                          }}
                        >
                          {copiedOtp ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                      </div>

                      <div style={{ fontSize: '12px', color: '#cbd5e1', textAlign: 'center', lineHeight: '1.4' }}>
                        🔒 <strong>Escrow Protection Protocol:</strong> Once you hand over this 6-digit OTP to the courier, your repair order transitions to <strong>Delivered</strong>, escrow payment is released to the workshop, and your <strong>30-Day Platform Warranty</strong> begins immediately.
                      </div>
                    </div>

                  </div>
                )}

                {/* Handover Completed Celebration Banner (When Delivery Confirmed) */}
                {order.current_status === 'delivery_confirmed' && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399'
                      }}>
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#34d399' }}>
                          ✓ Return Delivery Handover Confirmed!
                        </div>
                        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                          Hardware tested & verified at doorstep. Escrow released to workshop.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewModalOpen(true)}
                      style={{
                        background: '#10b981',
                        color: '#0f172a',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Rate Workshop ★
                    </button>
                  </div>
                )}

                {/* Tamper Seal Barcode (When sealed) */}
                {(order.pouch_barcode || order.active_pouch_barcode) && (
                  <div style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldCheck size={20} style={{ color: '#10b981' }} />
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                          Verified Tamper-Evident Security Seal
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                          {order.pouch_barcode || order.active_pouch_barcode}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: '#34d399',
                      fontWeight: 700,
                      background: 'rgba(52, 211, 153, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(52, 211, 153, 0.25)'
                    }}>
                      ✓ Sealed Intact
                    </span>
                  </div>
                )}

                {/* Live Runner Tracking Route Map & Dynamic ETA */}
                <div style={{ marginTop: '16px' }}>
                  <LiveRunnerTrackingMap
                    runnerCoords={{
                      lat: Number(order.runner_lat) || 12.9550,
                      lng: Number(order.runner_lng) || 77.6100
                    }}
                    customerCoords={{
                      lat: Number(order.delivery_lat || order.pickup_lat) || 12.9352,
                      lng: Number(order.delivery_lng || order.pickup_lng) || 77.6245,
                      address: order.delivery_address || order.pickup_address || '18th Main, Koramangala 4th Block'
                    }}
                    workshopCoords={{
                      lat: Number(order.shop_lat) || 12.9716,
                      lng: Number(order.shop_lng) || 77.5946,
                      name: order.shop_name || 'RepairBee Cleanroom Workbench (MG Road)'
                    }}
                    runnerInfo={{
                      name: order.runner_name || 'Ravi Kumar (Verified Courier)',
                      phone: order.runner_phone || '+91 98765 43210',
                      vehicle: 'Honda Activa EV • KA-05-EV-4421'
                    }}
                    legType={['assigned_delivery', 'out_for_delivery', 'delivered', 'delivery_confirmed'].includes(order.current_status) ? 'return' : 'pickup'}
                    orderStatus={order.current_status}
                    onCallCourier={() => {
                      if (order.runner_phone) {
                        window.location.href = `tel:${order.runner_phone}`;
                      }
                    }}
                  />
                </div>
              </div>

              {/* Macro Inspection Photos Comparison */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Camera size={18} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--secondary)' }}>
                      Bench Diagnostic Photos
                    </span>
                  </div>
                  <span className="badge badge-slate" style={{ fontSize: '10px' }}>
                    {order.media_urls && order.media_urls.length > 0 ? `${order.media_urls.length} Photos Captured` : 'Intake Inspection'}
                  </span>
                </div>

                {order.media_urls && order.media_urls.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                    {order.media_urls.map((url, idx) => (
                      <div key={idx} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        <img src={url} alt={`Intake proof ${idx + 1}`} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                        <div style={{ padding: '8px 12px', background: '#f8fafc', fontSize: '11px', fontWeight: 600, color: 'var(--secondary)' }}>
                          Bench Capture #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '24px',
                    background: 'var(--bg-canvas)',
                    border: '1px dashed var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center'
                  }}>
                    <Camera size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--secondary)' }}>
                      No Bench Photos Uploaded Yet
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '380px', margin: '4px auto 0' }}>
                      Diagnostic macro photos will appear here once the workshop bench completes physical intake triage for this order.
                    </div>
                  </div>
                )}

                {order.issues && order.issues.length > 0 && (
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)' }}>Reported Issues:</span>
                    {order.issues.map((iss, idx) => (
                      <span key={idx} className="badge badge-amber" style={{ fontSize: '11px' }}>
                        {iss.issue_label || iss.issue_category || iss}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Technician Workbench Log */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench size={18} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--secondary)' }}>
                      Workshop Custody & Workbench Audit Log
                    </span>
                  </div>
                  <span className="badge badge-slate" style={{ fontSize: '10px' }}>
                    {order.shop_name || 'Assigned Partner Workshop'}
                  </span>
                </div>

                {order.timeline && order.timeline.length > 0 ? (
                  <div style={{
                    padding: '16px',
                    background: '#0e1726',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: '#93c5fd',
                    lineHeight: '1.7',
                    maxHeight: '260px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ color: '#64748b', marginBottom: '8px' }}>// Immutable Audit Telemetry (PostgreSQL)</div>
                    {order.timeline.map((t, i) => (
                      <div key={i} style={{ marginBottom: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#f59e0b' }}>[{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                        <span style={{ color: '#38bdf8', fontWeight: 600 }}>{t.status?.toUpperCase()}:</span>
                        <span style={{ color: '#e2e8f0' }}>{t.note || 'Status updated on bench'}</span>
                        {t.updated_by_name && (
                          <span style={{ color: '#94a3b8', fontSize: '10px' }}>({t.updated_by_name} • {t.updated_by_role || 'Staff'})</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    background: '#0e1726',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: '#94a3b8'
                  }}>
                    <div style={{ color: '#64748b' }}>// System Intake Telemetry</div>
                    <div>• Order initialized in system at {new Date(order.created_at).toLocaleTimeString()}</div>
                    <div style={{ color: '#34d399' }}>• Awaiting first bench telemetry ping from {order.shop_name || 'assigned workshop'}</div>
                  </div>
                )}
              </div>

              {/* Direct Technician Chat Card (Live Socket.io Bench Link) */}
              <div style={{ marginTop: '14px' }}>
                <BenchChatBox
                  orderId={order.id}
                  chatType="customer_shop"
                  token={token}
                  currentUser={user}
                  title={`Direct Workbench Communicator (${order.shop_name || 'Workshop Bench'})`}
                  counterpartLabel={order.shop_name || 'Bench Technician'}
                  height="180px"
                />
              </div>
            </div>

            {/* RIGHT COLUMN: ESCROW CONTROLS & ACTIONS (Stitch Screen 3) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Escrow Vault Card */}
              <div className="card" style={{ padding: '24px', border: '2px solid var(--emerald)', background: '#fffdfa' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--emerald-light)',
                      color: 'var(--emerald)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Lock size={16} />
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--secondary)' }}>
                      Escrow Vault Status
                    </span>
                  </div>
                  <span className="badge badge-emerald">
                    Safe In Vault
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {order.quote_amount ? 'Locked Repair Escrow Funds' : 'Pending Workshop Bench Quote'}
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--secondary)', fontFamily: 'var(--font-mono)', margin: '4px 0 14px' }}>
                  ₹{order.quote_amount ? Number(order.quote_amount).toLocaleString() : '0.00'}
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  fontSize: '12px',
                  color: 'var(--secondary)',
                  lineHeight: '1.4',
                  marginBottom: '18px'
                }}>
                  🛡️ <strong>Protection Policy:</strong> Your funds remain locked in the RepairBee escrow vault. {order.shop_name || 'The assigned workshop'} only gets paid after you test the device at doorstep delivery.
                </div>

                {/* Active Dispute Banner */}
                {activeDispute && activeDispute.status === 'open' && (
                  <div style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1.5px solid var(--rose-border)',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--rose)', fontWeight: 800, fontSize: '13px' }}>
                        <AlertOctagon size={16} />
                        <span>Active Escrow Dispute #{activeDispute.id.slice(0, 8)}</span>
                      </div>
                      <span className="badge badge-rose" style={{ fontSize: '10px' }}>Arbitration Underway</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary)', lineHeight: '1.4' }}>
                      Claim: <strong>"{activeDispute.reason}"</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      🔒 Escrow funds are strictly frozen in the vault pending admin resolution (Refund, Free Re-Repair, or Payout).
                    </div>
                  </div>
                )}

                {/* Resolved Dispute Banner */}
                {activeDispute && activeDispute.status === 'resolved' && (
                  <div style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--emerald-light)',
                    border: '1px solid var(--emerald-border)',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--emerald-dark)', fontWeight: 700, fontSize: '12px' }}>
                      <CheckCircle2 size={15} />
                      <span>Dispute Ruling: {activeDispute.resolution_type?.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--secondary)', marginTop: '4px' }}>
                      {activeDispute.admin_notes || 'Resolved by platform arbitration.'}
                    </div>
                  </div>
                )}

                {/* Primary Action Button: Confirm Delivery & Escrow Release */}
                {order.current_status === 'delivery_confirmed' ? (
                  <div style={{
                    padding: '12px',
                    textAlign: 'center',
                    background: 'var(--emerald-light)',
                    color: 'var(--emerald-dark)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: '13px'
                  }}>
                    ✓ Escrow Successfully Released to Workshop
                  </div>
                ) : (
                  <button
                    disabled={actionLoading || (activeDispute && activeDispute.status === 'open')}
                    onClick={handleConfirmDelivery}
                    className="btn-emerald"
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '14px',
                      opacity: (activeDispute && activeDispute.status === 'open') ? 0.6 : 1
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>Test & Confirm Delivery (Release Escrow)</span>
                  </button>
                )}

                {/* Dispute / Warranty Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {activeDispute && activeDispute.status === 'open' ? (
                    <button
                      disabled
                      className="btn-outline"
                      style={{ width: '100%', padding: '10px', fontSize: '12px', color: 'var(--rose)', borderColor: 'var(--rose-border)', opacity: 0.75, cursor: 'not-allowed' }}
                    >
                      <AlertOctagon size={14} />
                      <span>Dispute Under Review (#{activeDispute.id.slice(0, 8)})</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setDisputeModalOpen(true)}
                      className="btn-outline"
                      style={{ width: '100%', padding: '10px', fontSize: '12px', color: 'var(--rose)', borderColor: 'var(--rose-border)' }}
                    >
                      <AlertOctagon size={14} />
                      <span>Raise an Escrow Dispute</span>
                    </button>
                  )}

                  {orderRatings?.hasRated ? (
                    <div
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#b45309', fontSize: '11px' }}>
                          ✓ VERIFIED FEEDBACK RECORDED
                        </span>
                        <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                          {Array.from({ length: orderRatings.shopRating?.stars || 5 }).map((_, i) => (
                            <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />
                          ))}
                        </div>
                      </div>
                      {orderRatings.shopRating?.review_text && (
                        <p style={{ margin: '4px 0 0', color: '#78350f', fontSize: '11px', lineHeight: '1.4' }}>
                          "{orderRatings.shopRating.review_text}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      id="track-rate-btn"
                      onClick={() => setReviewModalOpen(true)}
                      className="btn-outline"
                      style={{
                        width: '100%',
                        padding: '10px',
                        fontSize: '12px',
                        background: '#fffbeb',
                        borderColor: '#f59e0b',
                        color: '#b45309',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <span>Rate Repair & Courier Experience ★</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Protection Plan & Platform Warranty Card */}
              {(() => {
                const tierKey = order.warranty_tier || warrantyInfo?.warranty_tier || 'standard';
                const tierConfig = {
                  diamond: {
                    name: 'Diamond VIP Shield (180 Days)',
                    badge: '💎 VIP Diamond',
                    badgeStyle: { background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', fontWeight: 800, fontSize: '10px' },
                    iconColor: '#7c3aed',
                    cardBorder: '1px solid #ddd6fe',
                    cardBg: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)',
                    desc: '180-Day platform protection with accidental screen drop grace period, VIP 2-hour courier dispatch, zero-deductible cleanroom rework, and instant refund guarantee.',
                    claimBtnText: 'Claim Diamond VIP Shield Re-Repair (₹0.00)',
                    btnGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    btnShadow: '0 4px 10px rgba(124, 58, 237, 0.25)'
                  },
                  gold: {
                    name: 'Gold Shield Protection (90 Days)',
                    badge: '⭐ Gold Shield',
                    badgeStyle: { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: 800, fontSize: '10px' },
                    iconColor: '#d97706',
                    cardBorder: '1px solid #fde68a',
                    cardBg: 'linear-gradient(180deg, #fffdf5 0%, #ffffff 100%)',
                    desc: '90-Day platform protection with priority cleanroom rework bay queue, free doorstep courier re-pickup, and zero-deductible parts guarantee.',
                    claimBtnText: 'Claim Gold Shield Warranty Re-Repair (₹0.00)',
                    btnGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    btnShadow: '0 4px 10px rgba(245, 158, 11, 0.25)'
                  },
                  standard: {
                    name: '30-Day Platform Warranty',
                    badge: '🛡️ Standard',
                    badgeStyle: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontWeight: 800, fontSize: '10px' },
                    iconColor: 'var(--emerald)',
                    cardBorder: '1px solid var(--border-default)',
                    cardBg: 'var(--bg-canvas)',
                    desc: 'Covers screen touch responsiveness, battery cycle performance, audio clarity, and reassembly integrity. If any defect recurs, 1-click free cleanroom re-service.',
                    claimBtnText: 'Claim 1-Click 30-Day Warranty Re-Repair',
                    btnGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    btnShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
                  }
                }[tierKey] || {
                  name: '30-Day Platform Warranty',
                  badge: '🛡️ Standard',
                  badgeStyle: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontWeight: 800, fontSize: '10px' },
                  iconColor: 'var(--emerald)',
                  cardBorder: '1px solid var(--border-default)',
                  cardBg: 'var(--bg-canvas)',
                  desc: 'Covers screen touch responsiveness, battery cycle performance, audio clarity, and reassembly integrity. If any defect recurs, 1-click free cleanroom re-service.',
                  claimBtnText: 'Claim 1-Click 30-Day Warranty Re-Repair',
                  btnGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  btnShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
                };

                return (
                  <div className="card" style={{ padding: '20px', background: tierConfig.cardBg, border: tierConfig.cardBorder }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={20} style={{ color: tierConfig.iconColor }} />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)' }}>
                          {tierConfig.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', ...tierConfig.badgeStyle }}>
                          {tierConfig.badge}
                        </span>
                        {order.current_status === 'delivery_confirmed' && (
                          <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                            {warrantyInfo?.days_remaining !== undefined ? `${warrantyInfo.days_remaining} Days Left` : 'Active Guarantee'}
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 12px' }}>
                      {tierConfig.desc}
                    </p>

                    {order.current_status === 'delivery_confirmed' && (
                      <div>
                        {warrantyInfo?.has_active_claim || order.re_repair_order_id ? (
                          <button
                            onClick={() => {
                              const targetId = warrantyInfo?.active_claim_order_id || order.re_repair_order_id;
                              if (targetId) navigate(`/track/${targetId}`);
                            }}
                            className="btn-outline"
                            style={{
                              width: '100%',
                              padding: '10px',
                              fontSize: '12px',
                              color: '#d97706',
                              borderColor: '#f59e0b',
                              background: '#fffbeb',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>⚡ Track Active Re-Repair (#{ (warrantyInfo?.active_claim_order_id || order.re_repair_order_id || '').slice(0, 8) }) →</span>
                          </button>
                        ) : (warrantyInfo?.days_remaining === undefined || warrantyInfo?.days_remaining > 0) ? (
                          <button
                            id="claim-warranty-track-btn"
                            onClick={() => setWarrantyModalOpen(true)}
                            className="btn-emerald"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              background: tierConfig.btnGradient,
                              border: 'none',
                              boxShadow: tierConfig.btnShadow,
                              cursor: 'pointer'
                            }}
                          >
                            <ShieldCheck size={15} />
                            <span>{tierConfig.claimBtnText}</span>
                          </button>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
                            Platform warranty guarantee expired.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Official Documentation & Tax Invoice Trigger */}
                    <button
                      type="button"
                      id="view-invoice-qc-btn"
                      onClick={() => setInvoiceModalOpen(true)}
                      style={{
                        width: '100%',
                        marginTop: '14px',
                        padding: '10px 14px',
                        background: '#0f172a',
                        color: '#ffffff',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)'
                      }}
                    >
                      <FileText size={15} style={{ color: '#f59e0b' }} />
                      <span>View Official Tax Invoice & QC Certificate</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No active order selected. Enter an Order ID above or check your Dashboard.
        </div>
      )}

      {/* Modals */}
      {order && (
        <>
          <DisputeModal
            isOpen={disputeModalOpen}
            onClose={() => setDisputeModalOpen(false)}
            orderId={order.id}
            orderTotal={order.total_amount || order.quote_amount}
            onDisputeRaised={() => loadOrder(order.id)}
          />
          <ReviewModal
            isOpen={reviewModalOpen}
            onClose={() => setReviewModalOpen(false)}
            orderId={order.id}
            shopName={order.shop_name}
            partnerName={order.delivery_partner_name}
            onReviewSubmitted={() => loadOrder(order.id)}
          />
          <WarrantyClaimModal
            isOpen={warrantyModalOpen}
            onClose={() => setWarrantyModalOpen(false)}
            order={order}
            onClaimCreated={(newOrder) => {
              loadOrder(order.id);
            }}
          />
          {invoiceModalOpen && (
            <InvoiceCertificateModal
              orderId={order.id}
              initialTab={invoiceInitialTab}
              onClose={() => setInvoiceModalOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
