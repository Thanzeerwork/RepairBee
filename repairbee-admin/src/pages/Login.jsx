import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@repairbee.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.message || 'Login failed');
    }
  };

  const setQuickCreds = (em, pw) => {
    setEmail(em);
    setPassword(pw);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 30%, #182234 0%, #0b0f17 100%)',
      padding: '20px'
    }}>
      <div className="terminal-card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '32px',
        background: '#111827',
        border: '1px solid var(--border-highlight)',
        borderRadius: '10px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            marginBottom: '12px',
            boxShadow: '0 0 16px rgba(37, 99, 235, 0.4)'
          }}>
            🐝
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            RepairBee Operations Terminal
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Administrative clearance & dispatch terminal authentication
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 12px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid #f43f5e',
            borderRadius: '6px',
            color: '#fb7185',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Admin Identifier / Email
            </label>
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <Mail size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="terminal-input"
                style={{ width: '100%', paddingLeft: '32px' }}
                placeholder="admin@repairbee.com"
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Security Clearance Token / Password
            </label>
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <Lock size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="terminal-input"
                style={{ width: '100%', paddingLeft: '32px' }}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '6px', fontSize: '13px' }}
          >
            {loading ? 'Authenticating...' : 'Authorize Terminal Access →'}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div style={{
          marginTop: '24px',
          padding: '12px',
          background: '#0e1420',
          border: '1px solid #1e293b',
          borderRadius: '6px'
        }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Quick Demo Credentials:
          </div>
          <button
            type="button"
            onClick={() => setQuickCreds('admin@repairbee.com', 'Admin@123')}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px dashed #334155',
              padding: '6px 8px',
              borderRadius: '4px',
              color: '#38bdf8',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            admin@repairbee.com / Admin@123 (Super Admin)
          </button>
        </div>
      </div>
    </div>
  );
}
