import React, { useState, useEffect, useRef } from 'react';
import { repairsApi, chatApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BenchChatBox from './BenchChatBox';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  ShieldCheck,
  Lock,
  Wrench,
  HelpCircle,
  Clock,
  ChevronDown
} from 'lucide-react';

const QUICK_QUESTIONS = [
  {
    q: 'How does the Escrow Vault protect me?',
    a: 'Your repair payment is locked in our escrow vault and NOT released to the workshop until you physically test the repaired device at doorstep delivery and click "Test & Confirm Delivery".'
  },
  {
    q: 'What is covered under the 30-Day Warranty?',
    a: 'All repairs include our 30-day platform guarantee covering screen touch responsiveness, display pixels, battery performance, and motherboard components. If any issue arises, 1-click free re-repair is activated.'
  },
  {
    q: 'How does doorstep pickup work?',
    a: 'Our certified runner arrives at your pinned location, verifies the device condition, and seals it in a tamper-evident barcode pouch before transit to the cleanroom hub.'
  },
  {
    q: 'Can I speak to my workshop technician?',
    a: 'Yes! Select your active repair in this chat or visit your Order Tracking page to chat directly with the bench technician working on your device.'
  }
];

export default function LiveChatWidget() {
  const { isAuthenticated, user, token, quickLoginCustomer } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('general');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'agent',
      senderName: 'RepairBee Support Assistant',
      text: 'Hello! Welcome to RepairBee. How can we help you today with your device repair or escrow protection?',
      time: 'Just now'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Load customer active orders for bench chat tab
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await repairsApi.getMyOrders();
        const list = res?.data || (Array.isArray(res) ? res : []);
        setActiveOrders(list);
      } catch (err) {
        // quiet fallback
      }
    };
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen]);

  // When selected order changes, load chat history from backend
  useEffect(() => {
    const loadChat = async () => {
      if (selectedOrderId === 'general') {
        // default welcome
        return;
      }
      try {
        const res = await chatApi.getHistory(selectedOrderId, 'customer_shop');
        const list = res?.data || res?.messages || (Array.isArray(res) ? res : []);
        if (list.length > 0) {
          setMessages(list.map(m => ({
            id: m.id,
            sender: m.sender_role === 'customer' ? 'user' : 'agent',
            senderName: m.sender_name || (m.sender_role === 'customer' ? 'You' : 'Bench Technician'),
            text: m.message,
            time: m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
          })));
        } else {
          const matched = activeOrders.find(o => o.id === selectedOrderId);
          setMessages([
            {
              id: 'init',
              sender: 'agent',
              senderName: matched?.shop_name || 'Assigned Workshop',
              text: `Connected to bench channel for ${matched?.product_name || 'your device'}. Ask us any diagnostic or status question!`,
              time: 'Bench Log'
            }
          ]);
        }
      } catch (err) {
        console.warn('Could not fetch order chat in widget:', err?.message);
      }
    };
    if (isOpen && selectedOrderId !== 'general') {
      loadChat();
    }
  }, [selectedOrderId, isOpen]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal.trim();
    setInputVal('');

    const newMsg = {
      id: Date.now().toString(),
      sender: 'user',
      senderName: user?.name || 'You',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMsg]);

    // Send to backend API
    try {
      if (selectedOrderId !== 'general') {
        await chatApi.sendMessage(selectedOrderId, userText, 'customer_shop');
      } else {
        await chatApi.sendMessage('general', userText, 'customer_support');
      }
    } catch (err) {
      console.warn('Chat send note:', err?.message);
    }

    // Auto-respond intelligently
    setSending(true);
    setTimeout(() => {
      setSending(false);
      let replyText = 'Thank you for messaging RepairBee! A support specialist or bench technician has received your query and will assist you immediately.';
      
      const lower = userText.toLowerCase();
      if (lower.includes('escrow') || lower.includes('safe') || lower.includes('payment') || lower.includes('money')) {
        replyText = '🛡️ Your funds are 100% safeguarded in our banking Escrow Vault. We do not release payment to the technician until you test the device at doorstep delivery!';
      } else if (lower.includes('warranty') || lower.includes('guarantee')) {
        replyText = '✨ All repairs are covered by our 30-Day Platform Warranty. If any display, battery, or component issue occurs, you get free doorstep re-repair!';
      } else if (lower.includes('pickup') || lower.includes('runner') || lower.includes('courier')) {
        replyText = '🛵 Doorstep pickups are tracked via live GPS. Your device is placed in a tamper-evident barcode pouch with photo verification.';
      } else if (lower.includes('status') || lower.includes('track')) {
        replyText = '🔍 You can track your repair progress live on the "Track Order" page with real-time bench telemetry logs!';
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          senderName: selectedOrderId !== 'general' ? 'Bench Technician' : 'RepairBee Support',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 900);
  };

  const handleSelectQuestion = (item) => {
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      senderName: user?.name || 'You',
      text: item.q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const replyMsg = {
      id: (Date.now() + 1).toString(),
      sender: 'agent',
      senderName: 'RepairBee Support',
      text: item.a,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg, replyMsg]);
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#ffffff',
            border: '1px solid #334155',
            borderRadius: '9999px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.35)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: 700,
            fontSize: '13px'
          }}
          className="live-pulse"
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #d97706, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}>
            💬
          </div>
          <span>Live Support & Chat</span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
        </button>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div style={{
          width: '380px',
          maxWidth: 'calc(100vw - 32px)',
          height: '540px',
          background: '#ffffff',
          borderRadius: '18px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.22)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#ffffff',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '17px'
              }}>
                🐝
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                  RepairBee Live Support
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                  <span>Escrow & Bench Communicator</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Context Selector: General Support vs Active Repair Order */}
          <div style={{
            padding: '8px 14px',
            background: '#f8fafc',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px'
          }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Channel:</span>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                background: '#ffffff',
                fontWeight: 600,
                color: 'var(--secondary)',
                maxWidth: '240px'
              }}
            >
              <option value="general">💬 General Platform & Escrow Help</option>
              {activeOrders.map(o => (
                <option key={o.id} value={o.id}>
                  🔧 {o.product_name || 'Repair Order'} (#{o.id.substring(0, 8)})
                </option>
              ))}
            </select>
          </div>

          {selectedOrderId !== 'general' ? (
            <div style={{ flex: 1, padding: '10px', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
              <BenchChatBox
                orderId={selectedOrderId}
                chatType="customer_shop"
                token={token}
                currentUser={user}
                title={`Live Bench Link: ${activeOrders.find(o => o.id === selectedOrderId)?.product_name || 'Device'}`}
                counterpartLabel={activeOrders.find(o => o.id === selectedOrderId)?.shop_name || 'Bench Technician'}
                height="380px"
                compact={true}
              />
            </div>
          ) : (
            <>
              {/* Quick FAQ Pills (When on general chat) */}
              <div style={{
                padding: '8px 12px',
                background: '#fffdf5',
                borderBottom: '1px solid #fef3c7',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}>
                {QUICK_QUESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectQuestion(item)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #fde68a',
                      color: '#92400e',
                      padding: '4px 8px',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {item.q}
                  </button>
                ))}
              </div>

              {/* Messages Body */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#fafbfc'
              }}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%'
                    }}
                  >
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      marginBottom: '2px',
                      textAlign: m.sender === 'user' ? 'right' : 'left',
                      fontWeight: 600
                    }}>
                      {m.senderName} {m.time ? `• ${m.time}` : ''}
                    </div>
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      lineHeight: '1.4',
                      background: m.sender === 'user' ? 'var(--primary)' : '#ffffff',
                      color: m.sender === 'user' ? '#ffffff' : 'var(--secondary)',
                      border: m.sender === 'user' ? 'none' : '1px solid var(--border-default)',
                      boxShadow: 'var(--shadow-xs)'
                    }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div style={{ alignSelf: 'flex-start', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span className="live-pulse">Typing reply...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '10px 12px',
                  borderTop: '1px solid var(--border-default)',
                  background: '#ffffff',
                  display: 'flex',
                  gap: '8px'
                }}
              >
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ask anything about repairs or escrow..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  style={{
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: inputVal.trim() ? 'pointer' : 'default',
                    opacity: inputVal.trim() ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Send size={14} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
