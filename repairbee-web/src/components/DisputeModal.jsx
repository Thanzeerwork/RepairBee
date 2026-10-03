import React, { useState } from 'react';
import { disputesApi } from '../api/client';
import {
  AlertOctagon,
  X,
  Upload,
  ShieldCheck,
  CheckCircle2,
  Package,
  Lock,
  Camera,
  Trash2,
  Plus,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

const CLAIM_CATEGORIES = [
  {
    id: 'damaged_in_transit',
    title: '📦 Damaged in Transit',
    desc: 'Cracked screen, chassis dent, or packaging crush on doorstep arrival',
    presetReason: 'Device suffered physical damage during courier transit or doorstep unboxing'
  },
  {
    id: 'tamper_seal_broken',
    title: '🔒 Tamper Pouch Breached',
    desc: 'Security pouch seal was peeled, punctured, or barcode missing',
    presetReason: 'Anti-static tamper-evident pouch seal was compromised before delivery'
  },
  {
    id: 'faulty_repair',
    title: '⚡ Defective Component / QA Fault',
    desc: 'Screen flickering, unresponsive touch, battery drain, or original fault unsolved',
    presetReason: 'Delivered repair has component quality defects or did not resolve issue'
  },
  {
    id: 'wrong_quote',
    title: '💰 Escrow Pricing Dispute',
    desc: 'Charges differ from approved quotation without customer consent',
    presetReason: 'Discrepancy in final escrow billing vs approved cleanroom quotation'
  }
];

const POUCH_CONDITIONS = [
  { id: 'intact', label: '✅ Pouch Intact & Sealed', desc: 'Tamper tape unbroken' },
  { id: 'punctured_torn', label: '⚠️ Pouch Torn / Seal Voided', desc: 'Seal compromised or torn' },
  { id: 'no_pouch', label: '❌ No Tamper Pouch Provided', desc: 'Courier delivered unsealed' }
];

const DEMO_EVIDENCE_PHOTOS = [
  'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80'
];

export default function DisputeModal({ isOpen, onClose, orderId, orderTotal = 0, onDisputeRaised }) {
  const [claimType, setClaimType] = useState('damaged_in_transit');
  const [reason, setReason] = useState(CLAIM_CATEGORIES[0].presetReason);
  const [pouchCondition, setPouchCondition] = useState('punctured_torn');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState([]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSelectCategory = (cat) => {
    setClaimType(cat.id);
    setReason(cat.presetReason);
  };

  const handleAddDemoPhotos = () => {
    setEvidenceUrls(prev => Array.from(new Set([...prev, ...DEMO_EVIDENCE_PHOTOS])));
  };

  const handleAddCustomPhoto = (e) => {
    e.preventDefault();
    if (customPhotoUrl.trim()) {
      setEvidenceUrls(prev => [...prev, customPhotoUrl.trim()]);
      setCustomPhotoUrl('');
    }
  };

  const handleRemovePhoto = (index) => {
    setEvidenceUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await disputesApi.raiseDispute(orderId, {
        claim_type: claimType,
        reason,
        pouch_condition: pouchCondition,
        description: description.trim() || reason,
        evidence_urls: evidenceUrls,
        transit_damage_claim: {
          filed_at: new Date().toISOString(),
          pouch_condition: pouchCondition,
          evidence_count: evidenceUrls.length
        }
      });
      setSuccess(true);
      if (onDisputeRaised) onDisputeRaised();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to file dispute. Please try again.');
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
      zIndex: 10000,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '580px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        background: '#ffffff',
        position: 'relative',
        boxShadow: 'var(--shadow-xl)',
        borderRadius: '16px'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ecfdf5',
              color: '#059669',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: '20px', color: '#0f172a', fontWeight: 800, marginBottom: '8px' }}>
              Dispute Registered & Escrow Frozen
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', maxWidth: '420px', margin: '0 auto' }}>
              Your claim for <b>Order #{orderId?.slice(0, 8).toUpperCase()}</b> has been registered with RepairBee Arbitration Desk. Workshop payout is 100% frozen in escrow until formal mediation is executed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertOctagon size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '19px', color: '#0f172a', fontWeight: 800 }}>
                  File Escrow Dispute & Transit Claim
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Order #{orderId?.slice(0, 8).toUpperCase()} • Escrow Deposit: ₹{Number(orderTotal || 1850).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Escrow Guarantee Lock Alert */}
            <div style={{
              padding: '10px 14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: '#1e40af'
            }}>
              <Lock size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              <div>
                <strong>Zero Financial Risk:</strong> Filing this claim immediately locks all workshop payouts in the escrow vault. Funds will NOT be released until you are satisfied or arbitration settles the claim.
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '12px',
                fontWeight: 600
              }}>
                {error}
              </div>
            )}

            {/* 1. Claim Category */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'block' }}>
                1. Select Claim Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {CLAIM_CATEGORIES.map((cat) => {
                  const isSelected = claimType === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => handleSelectCategory(cat)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: isSelected ? '#fffdf7' : '#f8fafc',
                        border: isSelected ? '2px solid #d97706' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#b45309' : '#1e293b', marginBottom: '2px' }}>
                        {cat.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>
                        {cat.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Pouch Condition */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'block' }}>
                2. Doorstep Tamper Pouch Condition
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {POUCH_CONDITIONS.map((cond) => {
                  const isSelected = pouchCondition === cond.id;
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setPouchCondition(cond.id)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #059669' : '1px solid #e2e8f0',
                        background: isSelected ? '#ecfdf5' : '#f8fafc',
                        color: isSelected ? '#065f46' : '#475569',
                        fontSize: '11px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {cond.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Detailed Explanation */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'block' }}>
                3. Detailed Statement & Device Symptoms
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred upon doorstep delivery or when testing the device..."
                className="input-field"
                style={{ height: 'auto', padding: '10px 12px', fontSize: '12px', resize: 'vertical' }}
              />
            </div>

            {/* 4. Photographic Evidence Gallery */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                  4. Photographic Evidence ({evidenceUrls.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddDemoPhotos}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Sparkles size={12} color="#d97706" />
                  <span>+ Add Demo Damage Photos</span>
                </button>
              </div>

              {/* Photo Thumbnails */}
              {evidenceUrls.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }}>
                  {evidenceUrls.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={url}
                        alt={`Evidence ${idx + 1}`}
                        style={{
                          width: '74px',
                          height: '74px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          border: '1px solid #cbd5e1'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* URL Input Form */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="url"
                  placeholder="Paste damage evidence photo URL (https://...)"
                  value={customPhotoUrl}
                  onChange={(e) => setCustomPhotoUrl(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomPhoto}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add URL
                </button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-outline"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                {loading ? 'Registering Claim...' : 'Freeze Escrow & Submit Claim'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
