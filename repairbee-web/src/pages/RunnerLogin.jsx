import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRunnerAuth } from '../context/RunnerAuthContext';
import {
  Truck,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  QrCode,
  CheckCircle2,
  Navigation,
  PackageCheck
} from 'lucide-react';

export default function RunnerLogin() {
  const navigate = useNavigate();
  const { loginRunner, quickLoginRunner } = useRunnerAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginRunner(email, password);
      if (res.success) {
        navigate('/runner', { replace: true });
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err?.message || 'Courier login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCourier = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await quickLoginRunner();
      if (res.success) {
        navigate('/runner', { replace: true });
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('Quick courier login failed. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      background: 'radial-gradient(circle at 50% 20%, #1e293b 0%, #0b1120 100%)',
      color: '#ffffff'
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        
        {/* Terminal Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)',
            marginBottom: '1rem'
          }}>
            <Truck size={32} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.5px' }}>
              RepairBee
            </span>
            <span style={{
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#f59e0b',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Runner Terminal
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            Tamper-Proof Pouch Logistics & Doorstep Handover Dispatch
          </p>
        </div>

        {/* 1-Click Quick Demo Access Card */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '1.5rem',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Instant Courier Demo Access
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Ravi Kumar • KA-05-EV-4421</span>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: '1.4' }}>
            Sign in directly with certified delivery partner credentials (<code style={{ color: '#fbbf24' }}>partner@repairbee.com</code>) to access the active barcode scanner and run dispatch queue.
          </p>
          <button
            type="button"
            onClick={handleQuickCourier}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: '#f59e0b',
              color: '#0f172a',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}
          >
            <PackageCheck size={16} />
            <span>Launch Courier Terminal as Ravi Kumar</span>
          </button>
        </div>

        {/* Traditional Credentials Form */}
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              color: '#fca5a5',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Courier Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@repairbee.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Terminal Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginTop: '8px',
                transition: 'background 0.2s'
              }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Courier Dispatch'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>
              ← Return to Customer Portal
            </Link>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
              GPS Telemetry Active
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
