import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { outboundMessagesApi, repairsApi } from '../api/client';
import confetti from 'canvas-confetti';
import {
  MessageSquare,
  Smartphone,
  Send,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Volume2,
  VolumeX,
  X,
  Minimize2,
  Maximize2,
  ShieldCheck,
  Clock,
  Sparkles,
  Phone,
  CheckCheck,
  ChevronRight,
  Radio,
  Sliders,
  Bell
} from 'lucide-react';

// Web Audio API notification chime generator
const playNotificationChime = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch {
    // Audio context not allowed before user gesture
  }
};

export default function WhatsAppSmsSimulator({ initialOrderId = null, isOpen: controlledIsOpen, onClose: controlledOnClose }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'whatsapp', 'sms'
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Data states
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId || '');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('RUNNER_ARRIVING_PICKUP');
  const [selectedChannel, setSelectedChannel] = useState('both'); // 'both', 'whatsapp', 'sms'
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(null);
  const [recentDispatchedId, setRecentDispatchedId] = useState(null);

  const messagesEndRef = useRef(null);
  const prevMessagesCountRef = useRef(0);

  // Sync controlled state if provided
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  // Global window event listener to open simulator from anywhere
  useEffect(() => {
    const handleOpenEvent = (e) => {
      setIsOpen(true);
      setIsMinimized(false);
      if (e.detail?.orderId) {
        setSelectedOrderId(e.detail.orderId);
      }
    };
    window.addEventListener('open-sms-simulator', handleOpenEvent);
    return () => window.removeEventListener('open-sms-simulator', handleOpenEvent);
  }, []);

  // Load available templates & recent orders on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [templRes, ordersRes] = await Promise.all([
          outboundMessagesApi.getTemplates(),
          repairsApi.getOrders().catch(() => ({ data: [] }))
        ]);

        if (templRes.data?.data?.templates) {
          setTemplates(templRes.data.data.templates);
        }

        const orderList = ordersRes.data?.data || ordersRes.data || [];
        setOrders(orderList);

        if (!selectedOrderId && orderList.length > 0) {
          setSelectedOrderId(orderList[0].id);
        } else if (initialOrderId) {
          setSelectedOrderId(initialOrderId);
        }
      } catch (err) {
        console.warn('Simulator initial load error:', err);
      }
    };

    fetchInitialData();
  }, [initialOrderId]);

  // Fetch messages for selected order or general stream
  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await outboundMessagesApi.getOutboundMessages({
        orderId: selectedOrderId || undefined,
        limit: 50
      });

      const newMsgs = res.data?.data?.messages || [];
      
      // If new messages arrived and sound is enabled, chime!
      if (newMsgs.length > prevMessagesCountRef.current && prevMessagesCountRef.current > 0 && soundEnabled) {
        playNotificationChime();
      }
      prevMessagesCountRef.current = newMsgs.length;
      setMessages(newMsgs);
    } catch (err) {
      console.warn('Failed to fetch outbound messages:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Poll for new messages every 5 seconds when simulator is open
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      if (isOpen && !isMinimized) {
        fetchMessages(true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedOrderId, isOpen, isMinimized]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Dispatch simulated notification
  const handleDispatch = async () => {
    if (!selectedOrderId || !selectedTemplateKey) return;
    setDispatching(true);
    try {
      const res = await outboundMessagesApi.simulateDispatch({
        orderId: selectedOrderId,
        templateKey: selectedTemplateKey,
        channel: selectedChannel
      });

      if (soundEnabled) {
        playNotificationChime();
      }

      // Confetti burst for milestone dispatches
      if (['DELIVERY_OTP_ALERT', 'ORDER_COMPLETED_WARRANTY', 'REPAIR_COMPLETED_QC'].includes(selectedTemplateKey)) {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
      }

      const dispatched = res.data?.data?.dispatched || [];
      if (dispatched.length > 0) {
        setRecentDispatchedId(dispatched[0].id);
        setTimeout(() => setRecentDispatchedId(null), 3000);
      }

      await fetchMessages(true);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Dispatch simulation failed');
    } finally {
      setDispatching(false);
    }
  };

  const handleCopyOtp = (otp) => {
    navigator.clipboard.writeText(otp);
    setCopiedOtp(otp);
    setTimeout(() => setCopiedOtp(null), 2500);
  };

  const filteredMessages = messages.filter(m => {
    if (activeTab === 'whatsapp') return m.channel === 'whatsapp';
    if (activeTab === 'sms') return m.channel === 'sms';
    return true;
  });

  const selectedOrderObj = orders.find(o => o.id === selectedOrderId);

  // If controlled onClose provided
  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button (visible when closed) */}
      {!isOpen && (
        <button
          id="btn-open-sms-simulator"
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 12px 30px rgba(16, 185, 129, 0.45)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 700,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(8px)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
        >
          <div style={{ position: 'relative' }}>
            <Smartphone size={18} />
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 8px #34d399'
              }}
            />
          </div>
          <span>WhatsApp & SMS Simulator</span>
          {messages.length > 0 && (
            <span
              style={{
                background: '#ffffff',
                color: '#065f46',
                borderRadius: '9999px',
                padding: '2px 7px',
                fontSize: '0.72rem',
                fontWeight: 800
              }}
            >
              {messages.length}
            </span>
          )}
        </button>
      )}

      {/* Simulator Modal Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isMinimized ? '16px' : '20px',
            right: '20px',
            width: isMinimized ? '340px' : 'min(94vw, 520px)',
            height: isMinimized ? '56px' : 'min(90vh, 760px)',
            background: '#090d16',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.15)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'height 0.25s ease, width 0.25s ease',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              padding: '12px 18px',
              background: '#0f172a',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}
              >
                <Smartphone size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#f8fafc', fontWeight: 700 }}>
                    WhatsApp & SMS Gateway
                  </h4>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 6px #10b981'
                    }}
                  />
                </div>
                {!isMinimized && (
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>
                    Live Carrier & Meta Cloud Webhook Simulator
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Sound Toggle */}
              {!isMinimized && (
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Mute notification chimes' : 'Enable notification chimes'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: soundEnabled ? '#34d399' : '#64748b',
                    padding: '6px',
                    cursor: 'pointer',
                    borderRadius: '6px'
                  }}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              )}

              {/* Minimize Toggle */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand simulator' : 'Minimize'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>

              {/* Close Button */}
              <button
                onClick={handleClose}
                title="Close simulator"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Top Controls: Target Order & Channel Selector */}
              <div
                style={{
                  padding: '12px 16px',
                  background: '#090d16',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Order Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, minWidth: '45px' }}>
                    Order:
                  </span>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#131b2e',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {orders.length === 0 ? (
                      <option value="">No Active Orders Found</option>
                    ) : (
                      orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          #{o.order_number || o.id.slice(0, 8).toUpperCase()} • {o.brand || ''} {o.model || o.product_name || 'Device'} ({o.current_status || 'active'})
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    onClick={() => fetchMessages()}
                    disabled={loading}
                    title="Refresh Message Feed"
                    style={{
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                  </button>
                </div>

                {/* Event Simulation Row */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={selectedTemplateKey}
                    onChange={(e) => setSelectedTemplateKey(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#131b2e',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#38bdf8',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {templates.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.category ? `[${t.category}] ` : ''}{t.whatsappTitle || t.key}
                      </option>
                    ))}
                  </select>

                  <button
                    id="btn-simulate-dispatch"
                    onClick={handleDispatch}
                    disabled={dispatching || !selectedOrderId}
                    style={{
                      background: dispatching
                        ? '#334155'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: dispatching || !selectedOrderId ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    {dispatching ? (
                      <RefreshCw size={13} className="spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    <span>{dispatching ? 'Sending...' : '⚡ Buzz Phone'}</span>
                  </button>
                </div>

                {/* Channel Filter Tabs */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  {[
                    { key: 'all', label: 'All Channels', icon: MessageSquare },
                    { key: 'whatsapp', label: 'WhatsApp', icon: Smartphone, color: '#25D366' },
                    { key: 'sms', label: 'SMS / iMessage', icon: MessageSquare, color: '#38bdf8' }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                          flex: 1,
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isActive ? '#1e293b' : 'transparent',
                          color: isActive ? (tab.color || '#f8fafc') : '#94a3b8',
                          fontSize: '0.72rem',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <Icon size={12} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone Device Screen Preview */}
              <div
                style={{
                  flex: 1,
                  background: activeTab === 'whatsapp' ? '#0b141a' : '#020617',
                  overflowY: 'auto',
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  backgroundImage:
                    activeTab === 'whatsapp'
                      ? 'radial-gradient(#1f2c34 1px, transparent 1px)'
                      : 'none',
                  backgroundSize: '16px 16px'
                }}
              >
                {/* Phone Status Notice Banner */}
                <div
                  style={{
                    alignSelf: 'center',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.7rem',
                    color: '#94a3b8'
                  }}
                >
                  <ShieldCheck size={12} color="#10b981" />
                  <span>
                    Simulated Carrier Handset • Recipient: {selectedOrderObj?.customer_name || 'Customer'}
                  </span>
                </div>

                {filteredMessages.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '240px',
                      color: '#64748b',
                      textAlign: 'center',
                      padding: '20px'
                    }}
                  >
                    <Smartphone size={36} style={{ marginBottom: '10px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>
                      No Outbound Notifications Yet
                    </p>
                    <p style={{ margin: '6px 0 14px', fontSize: '0.75rem' }}>
                      Click <b>"⚡ Buzz Phone"</b> above to test courier arrivals, OTPs, or escrow quote alerts!
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isWhatsApp = msg.channel === 'whatsapp';
                    const buttons = Array.isArray(msg.action_buttons)
                      ? msg.action_buttons
                      : typeof msg.action_buttons === 'string'
                      ? JSON.parse(msg.action_buttons || '[]')
                      : [];

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          maxWidth: '92%',
                          alignSelf: 'flex-start',
                          animation: 'fadeIn 0.25s ease-out'
                        }}
                      >
                        {/* Channel Badge Pill */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginBottom: '4px',
                            fontSize: '0.66rem',
                            color: isWhatsApp ? '#25D366' : '#38bdf8',
                            fontWeight: 700,
                            paddingLeft: '4px'
                          }}
                        >
                          {isWhatsApp ? (
                            <>
                              <span>🟢 WhatsApp Official</span>
                              <span style={{ color: '#64748b' }}>• RepairBee Verified</span>
                            </>
                          ) : (
                            <>
                              <span>💬 SMS Carrier</span>
                              <span style={{ color: '#64748b' }}>• Sender ID: RB-REPAIR</span>
                            </>
                          )}
                        </div>

                        {/* Bubble Container */}
                        <div
                          style={{
                            background: isWhatsApp ? '#005c4b' : '#1e293b',
                            color: '#e2e8f0',
                            borderRadius: '14px',
                            borderTopLeftRadius: '2px',
                            padding: '12px 14px',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                            position: 'relative',
                            border: isWhatsApp
                              ? '1px solid rgba(37, 211, 102, 0.2)'
                              : '1px solid rgba(255, 255, 255, 0.08)'
                          }}
                        >
                          {/* Title / Header */}
                          <div
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              color: '#ffffff',
                              marginBottom: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>{msg.title}</span>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontWeight: 400
                              }}
                            >
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          {/* Body with formatting */}
                          <div
                            style={{
                              fontSize: '0.8rem',
                              lineHeight: '1.45',
                              color: isWhatsApp ? '#e9edef' : '#cbd5e1',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}
                          >
                            {msg.body}
                          </div>

                          {/* Action Buttons inside message */}
                          {buttons.length > 0 && (
                            <div
                              style={{
                                marginTop: '10px',
                                paddingTop: '8px',
                                borderTop: isWhatsApp
                                  ? '1px solid rgba(255, 255, 255, 0.12)'
                                  : '1px solid rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}
                            >
                              {buttons.map((btn, bIdx) => {
                                if (btn.action === 'copy_otp' && btn.otp) {
                                  const isCopied = copiedOtp === btn.otp;
                                  return (
                                    <button
                                      key={bIdx}
                                      onClick={() => handleCopyOtp(btn.otp)}
                                      style={{
                                        background: isCopied ? '#059669' : 'rgba(255, 255, 255, 0.12)',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '7px 10px',
                                        borderRadius: '8px',
                                        fontSize: '0.76rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'background 0.15s ease'
                                      }}
                                    >
                                      {isCopied ? <Check size={13} /> : <Copy size={13} />}
                                      <span>{isCopied ? 'OTP Copied to Clipboard!' : `${btn.label} (${btn.otp})`}</span>
                                    </button>
                                  );
                                }

                                if (btn.url) {
                                  return (
                                    <button
                                      key={bIdx}
                                      onClick={() => {
                                        if (btn.url.startsWith('http') || btn.url.startsWith('tel:')) {
                                          window.open(btn.url, '_blank');
                                        } else {
                                          navigate(btn.url);
                                          handleClose();
                                        }
                                      }}
                                      style={{
                                        background: isWhatsApp
                                          ? 'rgba(37, 211, 102, 0.15)'
                                          : 'rgba(56, 189, 248, 0.15)',
                                        color: isWhatsApp ? '#34d399' : '#38bdf8',
                                        border: isWhatsApp
                                          ? '1px solid rgba(37, 211, 102, 0.3)'
                                          : '1px solid rgba(56, 189, 248, 0.3)',
                                        padding: '7px 10px',
                                        borderRadius: '8px',
                                        fontSize: '0.76rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      <ExternalLink size={13} />
                                      <span>{btn.label}</span>
                                    </button>
                                  );
                                }

                                return null;
                              })}
                            </div>
                          )}

                          {/* Message Footer Status ticks */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '4px',
                              marginTop: '6px',
                              fontSize: '0.68rem',
                              color: 'rgba(255, 255, 255, 0.5)'
                            }}
                          >
                            <span>Delivered</span>
                            <CheckCheck size={13} color={isWhatsApp ? '#53bdeb' : '#38bdf8'} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Quick Test Strip */}
              <div
                style={{
                  padding: '10px 14px',
                  background: '#090d16',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: '#94a3b8'
                }}
              >
                <span>Channel: <b>{selectedChannel.toUpperCase()}</b></span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['both', 'whatsapp', 'sms'].map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setSelectedChannel(ch)}
                      style={{
                        background: selectedChannel === ch ? '#2563eb' : '#1e293b',
                        color: '#f8fafc',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
