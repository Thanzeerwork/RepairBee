import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/client';
import { Bell, X, Check, CheckCheck, Filter, Package, DollarSign, Shield, AlertTriangle, Clock } from 'lucide-react';

const POLL_INTERVAL = 30000; // 30 seconds

const CATEGORY_MAP = {
  all: { label: 'All', icon: null },
  order: { label: 'Orders', icon: Package },
  payment: { label: 'Payments', icon: DollarSign },
  warranty: { label: 'Warranty', icon: Shield },
  dispute: { label: 'Disputes', icon: AlertTriangle },
};

const NOTIF_ICONS = {
  order: '📦',
  payment: '💰',
  warranty: '🛡️',
  dispute: '⚖️',
  general: '🔔',
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function NotificationCenter({ variant = 'customer' }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  const getApi = useCallback(() => {
    if (variant === 'workshop') return {
      fetch: notificationsApi.getWorkshopNotifications,
      markRead: notificationsApi.markWorkshopAsRead,
      markAllRead: notificationsApi.markAllWorkshopAsRead,
    };
    if (variant === 'runner') return {
      fetch: notificationsApi.getRunnerNotifications,
      markRead: notificationsApi.markRunnerAsRead,
      markAllRead: notificationsApi.markAllRunnerAsRead,
    };
    return {
      fetch: notificationsApi.getNotifications,
      markRead: notificationsApi.markAsRead,
      markAllRead: notificationsApi.markAllAsRead,
    };
  }, [variant]);

  const fetchNotifications = useCallback(async () => {
    try {
      const api = getApi();
      const res = await api.fetch({ limit: 30, page: 1 });
      const data = res?.data || res;
      const items = data?.data || data?.notifications || data || [];
      setNotifications(Array.isArray(items) ? items : []);
      const unread = data?.unread_count ?? items.filter?.(n => !n.is_read)?.length ?? 0;
      setUnreadCount(typeof unread === 'number' ? unread : 0);
    } catch (err) {
      // Silent fail for notification polling
    }
  }, [getApi]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && bellRef.current && !bellRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notif) => {
    if (notif.is_read) return;
    try {
      const api = getApi();
      await api.markRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      const api = getApi();
      await api.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {}
  };

  const handleNotificationClick = (notif) => {
    handleMarkAsRead(notif);
    if (notif.reference_id) {
      if (variant === 'workshop') {
        // Stay on workshop portal
        setIsOpen(false);
      } else if (variant === 'runner') {
        setIsOpen(false);
      } else {
        setIsOpen(false);
        navigate(`/track/${notif.reference_id}`);
      }
    } else {
      setIsOpen(false);
    }
  };

  const filteredNotifications = activeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeFilter);

  const accentColor = variant === 'workshop' ? '#059669' : variant === 'runner' ? '#7c3aed' : '#d97706';

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        ref={bellRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        style={{
          position: 'relative',
          background: isOpen ? `${accentColor}15` : 'transparent',
          border: `1px solid ${isOpen ? accentColor : 'transparent'}`,
          borderRadius: '10px',
          padding: '7px 9px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${accentColor}10`; e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = isOpen ? `${accentColor}15` : 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
        title="Notification Center"
        id="notification-bell-btn"
      >
        <Bell size={19} color={isOpen ? accentColor : '#64748b'} strokeWidth={2.2} style={{ pointerEvents: 'none' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: '#ef4444',
            color: '#fff',
            fontSize: unreadCount > 9 ? '9px' : '10px',
            fontWeight: 800,
            minWidth: '18px',
            height: '18px',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)',
            animation: 'notifPulse 2s ease-in-out infinite',
            lineHeight: 1,
            pointerEvents: 'none',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out Panel rendered directly into body via React Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              zIndex: 99998,
              animation: 'fadeIn 0.15s ease-out',
            }}
          />
          {/* Panel */}
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '400px',
              maxWidth: '100vw',
              background: '#ffffff',
              boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.25)',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            id="notification-panel"
          >
            {/* Header */}
            <div style={{
              padding: '18px 20px 14px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}03)`,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={18} color={accentColor} />
                  Notifications
                  {unreadCount > 0 && (
                    <span style={{
                      background: accentColor,
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}>
                      {unreadCount} new
                    </span>
                  )}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: accentColor,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${accentColor}10`}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    id="mark-all-read-btn"
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                >
                  <X size={16} color="#64748b" />
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div style={{
              padding: '10px 20px',
              display: 'flex',
              gap: '6px',
              borderBottom: '1px solid #f1f5f9',
              overflowX: 'auto',
            }}>
              {Object.entries(CATEGORY_MAP).map(([key, { label, icon: Icon }]) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  style={{
                    background: activeFilter === key ? accentColor : '#f8fafc',
                    color: activeFilter === key ? '#fff' : '#64748b',
                    border: `1px solid ${activeFilter === key ? accentColor : '#e2e8f0'}`,
                    borderRadius: '16px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {Icon && <Icon size={12} />}
                  {label}
                </button>
              ))}
            </div>

            {/* Notification List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 12px',
            }}>
              {filteredNotifications.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '280px',
                  gap: '12px',
                  color: '#94a3b8',
                }}>
                  <div style={{ fontSize: '48px' }}>🎉</div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#64748b' }}>You're all caught up!</p>
                  <p style={{ margin: 0, fontSize: '12px', maxWidth: '220px', textAlign: 'center', lineHeight: 1.5 }}>
                    No new notifications. We'll alert you when something important happens.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif, index) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: notif.is_read ? 'transparent' : `${accentColor}06`,
                      borderLeft: notif.is_read ? '3px solid transparent' : `3px solid ${accentColor}`,
                      marginBottom: '4px',
                      transition: 'all 0.15s ease',
                      animation: `slideInNotif 0.3s ease-out ${index * 0.04}s both`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? 'transparent' : `${accentColor}06`}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: notif.is_read ? '#f1f5f9' : `${accentColor}12`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0,
                    }}>
                      {NOTIF_ICONS[notif.type] || NOTIF_ICONS.general}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}>
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          fontWeight: notif.is_read ? 500 : 700,
                          color: '#0f172a',
                          lineHeight: 1.3,
                        }}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: accentColor,
                            flexShrink: 0,
                            marginTop: '4px',
                            boxShadow: `0 0 6px ${accentColor}60`,
                          }} />
                        )}
                      </div>
                      <p style={{
                        margin: '4px 0 0',
                        fontSize: '12px',
                        color: '#64748b',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {notif.body}
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '6px',
                      }}>
                        <Clock size={11} color="#94a3b8" />
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                          {timeAgo(notif.created_at)}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          color: accentColor,
                          fontWeight: 600,
                          background: `${accentColor}10`,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          textTransform: 'capitalize',
                        }}>
                          {notif.type || 'general'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes notifPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInNotif {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
