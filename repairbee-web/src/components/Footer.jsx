import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Award, Clock, HeartHandshake } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ background: '#0b1320', color: '#cbd5e1', borderTop: '1px solid #1e293b', marginTop: '60px' }}>
      {/* 4 Trust Pillars Bar */}
      <div style={{ borderBottom: '1px solid #1e293b', padding: '36px 0', background: '#0e1726' }}>
        <div className="container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px'
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(217, 119, 6, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              flexShrink: 0
            }}>
              <Lock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px', marginBottom: '4px' }}>
                Bank-Grade Escrow Vault
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                Funds are held safely in trust. Repair shops only receive payout after you test and approve delivery.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px', marginBottom: '4px' }}>
                30-Day Platform Warranty
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                Full parts and workmanship warranty on all repairs. Hassle-free re-repairs or 100% money-back refund.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(37, 99, 235, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              flexShrink: 0
            }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px', marginBottom: '4px' }}>
                Free Doorstep Runner Pickup
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                Tamper-evident barcode sealed pouches with live courier GPS tracking from your doorstep to the workshop.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(168, 85, 247, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
              flexShrink: 0
            }}>
              <Award size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px', marginBottom: '4px' }}>
                Verified Partner Network
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                ISO-certified cleanroom benches, Level 3 micro-soldering labs, and background-checked technicians.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container" style={{ padding: '48px 20px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '32px', marginBottom: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '17px'
              }}>
                🐝
              </div>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>RepairBee</span>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '340px', lineHeight: '1.6' }}>
              RepairBee is India's leading on-demand electronics repair marketplace with built-in customer escrow protection. Reliable diagnostics, certified partner workshops, and transparent pricing.
            </p>
          </div>

          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Services</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <li><Link to="/book" style={{ color: '#94a3b8', textDecoration: 'none' }}>iPhone Screen Replacement</Link></li>
              <li><Link to="/book" style={{ color: '#94a3b8', textDecoration: 'none' }}>Android & Samsung Repairs</Link></li>
              <li><Link to="/book" style={{ color: '#94a3b8', textDecoration: 'none' }}>MacBook Battery & Keyboard</Link></li>
              <li><Link to="/book" style={{ color: '#94a3b8', textDecoration: 'none' }}>Water Damage Restoration</Link></li>
              <li><Link to="/book" style={{ color: '#94a3b8', textDecoration: 'none' }}>Logic Board Micro-Soldering</Link></li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Platform</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <li><Link to="/track" style={{ color: '#94a3b8', textDecoration: 'none' }}>Track Your Repair</Link></li>
              <li><Link to="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none' }}>Customer Portal</Link></li>
              <li><Link to="/workshop/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Partner Workshop Portal</Link></li>
              <li><Link to="/runner/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Courier Runner Terminal</Link></li>
              <li><Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Escrow Guarantee Terms</Link></li>
              <li><Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>30-Day Warranty Policy</Link></li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Support & Trust</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>
              <div>Hotline: 1800-REPAIR-BEE</div>
              <div>Email: support@repairbee.com</div>
              <div style={{ marginTop: '10px', color: '#38bdf8', fontWeight: 600 }}>Operating Hours: 08:00 AM - 10:00 PM IST</div>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid #1e293b',
          paddingTop: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#64748b'
        }}>
          <div>© 2026 RepairBee Technologies Pvt Ltd. All rights reserved. Escrow held with verified banking partners.</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>ISO 9001:2015 Certified</span>
            <span>•</span>
            <span>256-Bit SSL Encrypted</span>
            <span>•</span>
            <span>Zero Upfront Risk</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
