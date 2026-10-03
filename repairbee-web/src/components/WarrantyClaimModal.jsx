import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { warrantyApi } from '../api/client';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  X,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Wrench,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';

export default function WarrantyClaimModal({ isOpen, onClose, order, onClaimCreated }) {
  const navigate = useNavigate();

  const [reason, setReason] = useState('Screen touch unresponsive / ghost touches');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const presetReasons = [
    'Screen touch unresponsive / ghost touches',
    'Battery drains too quickly or stops charging',
    'Replaced hardware component loose or malfunctioning',
    'Original repair fault has reoccurred',
    'Sound / speaker distortion after reassembly',
    'Other unexpected hardware defect'
  ];

  const tierKey = order.warranty_tier || 'standard';
  const tierConfig = {
    diamond: {
      title: 'Diamond VIP Shield Re-Repair (180 Days)',
      badge: '💎 VIP Diamond Plan Active',
      badgeStyle: { background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' },
      iconGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      pledgeTitle: '₹0.00 VIP Express Re-Service & Accidental Drop Grace Pledge',
      pledgeDesc: 'Priority 2-hour courier pickup, dedicated cleanroom master bench, and 100% parts & labor covered under your Diamond VIP Shield.',
      submitBtnText: 'Confirm Diamond VIP Warranty Re-Repair'
    },
    gold: {
      title: 'Gold Shield Warranty Re-Repair (90 Days)',
      badge: '⭐ Gold Shield Plan Active',
      badgeStyle: { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' },
      iconGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      pledgeTitle: '₹0.00 Priority Cleanroom Re-Service Pledge',
      pledgeDesc: 'Priority workshop queue, zero-deductible courier pickup, and genuine OEM parts guarantee covered under your Gold Shield Plan.',
      submitBtnText: 'Confirm Gold Shield Warranty Re-Repair'
    },
    standard: {
      title: '1-Click 30-Day Warranty Re-Repair',
      badge: '🛡️ Standard 30-Day Plan',
      badgeStyle: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' },
      iconGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      pledgeTitle: '₹0.00 Free Courier Pickup & Cleanroom Re-Service Pledge',
      pledgeDesc: 'All genuine parts, bench labour, and tamper-evident courier transit are 100% covered under your RepairBee platform warranty. Zero payment required.',
      submitBtnText: 'Confirm Free 30-Day Warranty Re-Repair'
    }
  }[tierKey] || {
    title: '1-Click 30-Day Warranty Re-Repair',
    badge: '🛡️ Standard 30-Day Plan',
    badgeStyle: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' },
    iconGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    pledgeTitle: '₹0.00 Free Courier Pickup & Cleanroom Re-Service Pledge',
    pledgeDesc: 'All genuine parts, bench labour, and tamper-evident courier transit are 100% covered under your RepairBee platform warranty. Zero payment required.',
    submitBtnText: 'Confirm Free 30-Day Warranty Re-Repair'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await warrantyApi.claimWarranty(order.id, {
        issue_description: `${reason}: ${description || `Customer reported recurring fault under ${tierConfig.title}`}`
      });

      const newOrder = res?.data || res;
      setCreatedOrder(newOrder);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (onClaimCreated) onClaimCreated(newOrder);
    } catch (err) {
      setError(err?.message || 'Failed to submit warranty claim. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '28px',
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-muted)'
          }}
        >
          <X size={16} />
        </button>

        {/* Modal Content */}
        {!createdOrder ? (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: tierConfig.iconGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 6px 16px rgba(16, 185, 129, 0.3)'
              }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--secondary)', margin: 0 }}>
                    {tierConfig.title}
                  </h3>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', ...tierConfig.badgeStyle }}>
                    {tierConfig.badge}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Order #{order.id.slice(0, 8).toUpperCase()} • {order.product_name || 'Electronics Device'}
                </div>
              </div>
            </div>

            {/* Zero Cost Pledge Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              border: '1.5px solid #10b981',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <Sparkles size={20} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#065f46' }}>
                  {tierConfig.pledgeTitle}
                </div>
                <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px', lineHeight: '1.4' }}>
                  {tierConfig.pledgeDesc}
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'var(--rose-light)',
                border: '1px solid var(--rose-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '16px',
                color: 'var(--rose)',
                fontSize: '13px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Preset Faults */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '8px' }}>
                  Select Reoccurring Defect:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {presetReasons.map((pReason) => (
                    <label
                      key={pReason}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: reason === pReason ? 'var(--primary-light)' : '#f8fafc',
                        border: reason === pReason ? '1.5px solid var(--primary)' : '1px solid var(--border-default)',
                        fontSize: '12px',
                        fontWeight: reason === pReason ? 700 : 500,
                        color: reason === pReason ? 'var(--primary)' : 'var(--secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="warrantyReason"
                        value={pReason}
                        checked={reason === pReason}
                        onChange={(e) => setReason(e.target.value)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span>{pReason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Specific Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '6px' }}>
                  Specific Symptoms / Bench Notes (Optional):
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when the issue happens (e.g. screen turns black when charging, ghost touches along upper border)..."
                  rows={3}
                  className="input-field"
                  style={{ width: '100%', fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              {/* Transit & Workshop routing summary */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div><strong>Assigned Workshop:</strong> {order.shop_name || 'Fix It Electronics'} (Original Certified Bench)</div>
                <div><strong>Pickup Address:</strong> {order.pickup_address || 'Registered Doorstep Address'}</div>
                <div><strong>Tamper Seal Protocol:</strong> Express courier brings anti-static tamper pouch to your doorstep.</div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: tierConfig.iconGradient,
                  border: 'none',
                  boxShadow: '0 8px 18px rgba(16, 185, 129, 0.35)'
                }}
              >
                <ShieldCheck size={18} />
                <span>{loading ? 'Initiating Free Courier Dispatch...' : tierConfig.submitBtnText}</span>
              </button>
            </form>
          </div>
        ) : (
          /* Success Screen */
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ecfdf5',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '2px solid #10b981'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--secondary)', marginBottom: '6px' }}>
              Warranty Re-Repair Dispatched!
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px', lineHeight: '1.5' }}>
              Your free warranty re-repair order <strong>#{createdOrder.id?.slice(0, 8).toUpperCase()}</strong> has been initiated at <strong>₹0.00 cost</strong>. A certified courier has been assigned with a tamper-evident anti-static pouch.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              maxWidth: '380px',
              margin: '0 auto 24px',
              textAlign: 'left',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Re-Repair Order ID:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>#{createdOrder.id?.slice(0, 8).toUpperCase()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Warranty Pricing:</span>
                <strong style={{ color: '#059669' }}>₹0.00 (100% Free Rework)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Doorstep Pickup OTP:</span>
                <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>{createdOrder.pickup_otp}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={onClose}
                className="btn-outline"
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate(`/track/${createdOrder.id}`);
                }}
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Track Free Re-Repair Live</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
