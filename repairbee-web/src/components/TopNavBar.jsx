import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Search,
  Wrench,
  User,
  LogOut,
  Calendar,
  Layers,
  Menu,
  X,
  PhoneCall,
  ShieldAlert,
  Truck,
  Activity
} from 'lucide-react';
import NotificationCenter from './NotificationCenter';

export default function TopNavBar() {
  const { user, isAuthenticated, logout, quickLoginCustomer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-default)',
      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
    }}>
      {/* Top Banner Reassurance */}
      <div style={{
        background: '#0f172a',
        color: '#f8fafc',
        fontSize: '11px',
        padding: '5px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontWeight: 500
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
          <span style={{
            background: 'rgba(217, 119, 6, 0.2)',
            color: '#fbbf24',
            padding: '1px 6px',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '10px'
          }}>
            ESCROW SECURED
          </span>
          <span>Zero Upfront Risk: Repair shops are only paid after you inspect and test your device.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: '#94a3b8' }}>
          <Link
            to="/workshop"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#38bdf8',
              textDecoration: 'none',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Certified Cleanroom Technician Workbench"
          >
            <Wrench size={12} />
            <span>Workshop Bench</span>
          </Link>
          <Link
            to="/runner"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#34d399',
              textDecoration: 'none',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid rgba(52, 211, 153, 0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Courier Runner Dispatch & Tamper Logistics"
          >
            <Truck size={12} />
            <span>Runner Dispatch</span>
          </Link>
          <Link
            to="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#fbbf24',
              textDecoration: 'none',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(251, 191, 36, 0.12)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Admin & Dispute Arbitration Operations Console"
          >
            <ShieldAlert size={12} />
            <span>Ops Console</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PhoneCall size={12} />
            <span>Support: 1800-REPAIR-BEE</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="container" style={{
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #d97706, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)'
          }}>
            <span style={{ fontSize: '20px' }}>🐝</span>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--secondary)', letterSpacing: '-0.02em', lineHeight: '1.1' }}>
              RepairBee
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Doorstep Escrow Repair
            </div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: location.pathname === '/' ? 700 : 500,
              color: location.pathname === '/' ? 'var(--primary)' : 'var(--secondary)',
              transition: 'color 0.15s ease'
            }}
          >
            Services
          </Link>
          <Link
            to="/book"
            style={{
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: location.pathname === '/book' ? 700 : 500,
              color: location.pathname === '/book' ? 'var(--primary)' : 'var(--secondary)',
              transition: 'color 0.15s ease'
            }}
          >
            Instant Estimator
          </Link>
          <Link
            to="/diagnose"
            style={{
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: location.pathname === '/diagnose' ? 700 : 500,
              color: location.pathname === '/diagnose' ? 'var(--primary)' : 'var(--secondary)',
              transition: 'color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Activity size={14} style={{ color: '#0891b2' }} />
            <span>Diagnostics</span>
            <span style={{
              fontSize: '9px',
              fontWeight: 800,
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#0891b2',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              padding: '1px 5px',
              borderRadius: '4px'
            }}>
              FREE
            </span>
          </Link>
          <Link
            to="/track"
            style={{
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: location.pathname.startsWith('/track') ? 700 : 500,
              color: location.pathname.startsWith('/track') ? 'var(--primary)' : 'var(--secondary)',
              transition: 'color 0.15s ease'
            }}
          >
            Track Order
          </Link>
          <Link
            to="/rewards"
            style={{
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: location.pathname === '/rewards' ? 700 : 500,
              color: location.pathname === '/rewards' ? 'var(--primary)' : 'var(--secondary)',
              transition: 'color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span>🍯</span>
            <span>Rewards</span>
            <span style={{
              fontSize: '9px',
              fontWeight: 800,
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#d97706',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '1px 5px',
              borderRadius: '4px'
            }}>
              HONEY
            </span>
          </Link>
          {isAuthenticated && (
            <Link
              to="/dashboard"
              style={{
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: location.pathname === '/dashboard' ? 700 : 500,
                color: location.pathname === '/dashboard' ? 'var(--primary)' : 'var(--secondary)',
                transition: 'color 0.15s ease'
              }}
            >
              My Dashboard
            </Link>
          )}
        </nav>

        {/* Right CTA / Auth Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-sms-simulator'))}
            title="Open WhatsApp & SMS Notification Gateway Simulator"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🟢</span>
            <span>SMS & WhatsApp</span>
          </button>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <NotificationCenter variant="customer" />
              <Link
                to="/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--secondary-light)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {user?.name ? user.name[0].toUpperCase() : 'C'}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--secondary)' }}>
                  {user?.name || 'Customer'}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="btn-outline"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => quickLoginCustomer()}
                className="btn-outline"
                style={{ padding: '8px 14px', fontSize: '13px' }}
                title="Quick Demo Customer Login"
              >
                Demo Login
              </button>
              <Link
                to="/login"
                style={{
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--secondary)',
                  padding: '8px 12px'
                }}
              >
                Sign In
              </Link>
            </div>
          )}

          <Link to="/book" className="btn-primary" style={{ padding: '10px 18px', fontSize: '13px' }}>
            <Calendar size={15} />
            <span>Book Repair</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
