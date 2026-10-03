import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Wrench,
  Store,
  AlertOctagon,
  CreditCard,
  Search,
  Bell,
  LogOut,
  Terminal,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Repair Orders', path: '/orders', icon: Wrench },
    { label: 'Shops & Partners', path: '/shops', icon: Store },
    { label: 'Disputes & Escrow', path: '/disputes', icon: AlertOctagon },
    { label: 'Payouts & Ledger', path: '/payouts', icon: CreditCard },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      {/* TOP NAVIGATION BAR */}
      <header style={{
        height: '52px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: '#0a0e16',
        borderBottom: '1px solid var(--border-default)',
        userSelect: 'none'
      }}>
        {/* Left Section: Brand Logo & Terminal Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            className="mobile-toggle"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(37, 99, 235, 0.4)'
            }}>
              <span style={{ fontSize: '15px' }}>🐝</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>RepairBee</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.04em' }}>ADMIN</span>
            </div>
          </div>

          <span style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 6px',
            borderRadius: '4px',
            background: '#161e2e',
            color: '#38bdf8',
            border: '1px solid #1e293b'
          }}>
            PROD:AP-SOUTH-1
          </span>
        </div>

        {/* Global Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: '420px', margin: '0 20px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search live orders, shops, customers... (⌘K)"
            style={{
              width: '100%',
              background: '#0e1420',
              border: '1px solid var(--border-highlight)',
              borderRadius: '5px',
              padding: '6px 36px 6px 32px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none'
            }}
          />
          <span style={{
            position: 'absolute',
            right: '8px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 4px',
            borderRadius: '3px',
            background: '#182234',
            color: 'var(--text-muted)',
            border: '1px solid #223147'
          }}>
            ⌘K
          </span>
        </div>

        {/* Right Section: Live Status Pill, Notifications, Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Live Cluster Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981'
            }} className="live-pulse"></span>
            <span style={{ color: '#34d399', fontWeight: 500 }}>Live DB Connected</span>
          </div>

          {/* Notifications */}
          <button style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            borderRadius: '5px',
            background: '#111827',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }} title="Notifications">
            <Bell size={16} />
          </button>

          {/* Admin Profile & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px', borderLeft: '1px solid var(--border-default)' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e293b, #334155)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: '#38bdf8',
              border: '1px solid #334155'
            }}>
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.name || 'Administrator'}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Super Admin
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* APP SHELL: SIDEBAR + CONTENT VIEW */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* SIDEBAR NAVIGATION */}
        <aside style={{
          width: '230px',
          background: '#0a0e16',
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px 12px',
          flexShrink: 0
        }}>
          <div>
            {/* Terminal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: '#111827',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '4px',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <Terminal size={16} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>Operations Desk</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Terminal v2.4</div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '5px',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 500,
                      background: isActive ? '#182234' : 'transparent',
                      color: isActive ? '#38bdf8' : 'var(--text-secondary)',
                      borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={16} style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }} />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Bottom Telemetry Card */}
          <div style={{
            padding: '12px',
            background: '#111827',
            border: '1px solid var(--border-default)',
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={16} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Live Database</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              PostgreSQL / Supabase connected. Real-time marketplace telemetry and escrow tracking.
            </div>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--bg-base)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
