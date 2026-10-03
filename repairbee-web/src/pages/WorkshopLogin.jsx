import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useWorkshopAuth } from '../context/WorkshopAuthContext';
import {
  Wrench,
  Building,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function WorkshopLogin() {
  const navigate = useNavigate();
  const { loginWorkshop, quickLoginWorkshop } = useWorkshopAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginWorkshop(email, password);
      if (res.success) {
        navigate('/workshop', { replace: true });
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickWorkshop = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await quickLoginWorkshop();
      if (res.success) {
        navigate('/workshop', { replace: true });
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('Quick login failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      background: 'radial-gradient(ellipse at top, #fef3c7 0%, #ffffff 60%)'
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #d97706, #f59e0b)',
            color: '#ffffff',
            boxShadow: '0 8px 16px rgba(217, 119, 6, 0.25)',
            marginBottom: '1rem'
          }}>
            <Wrench size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary)', letterSpacing: '-0.02em', margin: 0 }}>
            Workshop Workbench
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Authorized Cleanroom Technician & Partner Terminal
          </p>
        </div>

        {/* 1-Click Demo Login Banner */}
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={16} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              One-Click Workshop Demo
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.4 }}>
            Instant bench access as <strong>Fix It Electronics</strong> (Bangalore Hub, Level 3 Cleanroom Certified).
          </p>
          <button
            type="button"
            onClick={handleQuickWorkshop}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.65rem',
              background: 'linear-gradient(135deg, #d97706, #f59e0b)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>Log in as Fix It Electronics</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Form Card */}
        <div className="card" style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              color: '#dc2626',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '1.25rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.4rem' }}>
                Workshop Partner Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shopowner@repairbee.com"
                  className="input-field"
                  style={{ paddingLeft: '38px', height: '42px', fontSize: '0.9rem' }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.4rem' }}>
                Security Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  style={{ paddingLeft: '38px', height: '42px', fontSize: '0.9rem' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', height: '44px', fontSize: '0.95rem' }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Workbench'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Are you a device owner?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              Go to Customer Portal
            </Link>
          </div>
        </div>

        {/* Security Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <ShieldCheck size={16} style={{ color: 'var(--emerald)' }} />
          <span>AES-256 Encrypted Cleanroom Custody Network</span>
        </div>
      </div>
    </div>
  );
}
