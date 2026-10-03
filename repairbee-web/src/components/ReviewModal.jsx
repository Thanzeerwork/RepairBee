import React, { useState } from 'react';
import { ratingsApi } from '../api/client';
import { Star, X, CheckCircle2, Wrench, Truck, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ReviewModal({
  isOpen,
  onClose,
  orderId,
  shopName,
  partnerName,
  onReviewSubmitted,
}) {
  // Workshop ratings state
  const [shopStars, setShopStars] = useState(5);
  const [shopHover, setShopHover] = useState(0);
  const [shopComment, setShopComment] = useState('');
  const [selectedShopTags, setSelectedShopTags] = useState(['Flawless Repair', 'Cleanroom Certified']);

  // Courier partner ratings state
  const [partnerStars, setPartnerStars] = useState(5);
  const [partnerHover, setPartnerHover] = useState(0);
  const [selectedPartnerTags, setSelectedPartnerTags] = useState(['Intact Tamper Seal', 'On-Time Doorstep']);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const shopTagsOptions = [
    'Flawless Repair',
    'Original Parts',
    'Fast 2-Hour Turnaround',
    'Cleanroom Certified',
    'Dust-Free Seal',
    'Fair Pricing',
  ];

  const partnerTagsOptions = [
    'Intact Tamper Seal',
    'On-Time Doorstep',
    'Polite Courier',
    'Smooth OTP Handover',
  ];

  const toggleShopTag = (tag) => {
    setSelectedShopTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const togglePartnerTag = (tag) => {
    setSelectedPartnerTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const shopReviewFull = [
        shopComment.trim(),
        selectedShopTags.length > 0 ? `Highlights: ${selectedShopTags.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' • ') || 'Verified cleanroom repair. Excellent service and flawless functionality!';

      // 1. Submit Shop Rating
      await ratingsApi.rateShop(orderId, {
        stars: shopStars,
        review_text: shopReviewFull,
      });

      // 2. Submit Partner Rating (gracefully handle if partner not assigned)
      try {
        const partnerReviewFull = selectedPartnerTags.join(', ') || 'Smooth and prompt delivery.';
        await ratingsApi.ratePartner(orderId, {
          stars: partnerStars,
          review_text: partnerReviewFull,
        });
      } catch (pErr) {
        console.warn('Partner rating skipped or already rated:', pErr.message);
      }

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setSuccess(true);
      if (onReviewSubmitted) onReviewSubmitted();

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2200);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit review';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          background: '#ffffff',
          borderRadius: '16px',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '36px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--secondary)', marginBottom: '8px' }}>
              Feedback Verified & Recorded!
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 16px' }}>
              Your rating has updated the workshop's live trust reputation and verified escrow completion.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(217, 119, 6, 0.1)',
                color: '#d97706',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <ShieldCheck size={14} />
              <span>✓ Verified Escrow Review</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    background: 'rgba(217, 119, 6, 0.15)',
                    color: '#d97706',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  ESCROW COMPLETED
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Order #{orderId?.substring(0, 8)}</span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--secondary)', margin: 0 }}>
                Rate Your Repair & Delivery
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Your verified evaluation helps protect customers and rewards top technicians.
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '13px',
                  borderRadius: '8px',
                }}
              >
                {error}
              </div>
            )}

            {/* ─── SECTION 1: WORKSHOP RATING ─── */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Wrench size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)' }}>
                    {shopName || 'Fix It Electronics'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Cleanroom Diagnostics & Hardware Repair
                  </div>
                </div>
              </div>

              {/* Star selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (shopHover || shopStars) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setShopStars(star)}
                      onMouseEnter={() => setShopHover(star)}
                      onMouseLeave={() => setShopHover(0)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        color: active ? '#f59e0b' : '#cbd5e1',
                        transform: active ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.1s ease',
                      }}
                    >
                      <Star size={26} fill={active ? '#f59e0b' : 'none'} />
                    </button>
                  );
                })}
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginLeft: '4px' }}>
                  {shopStars === 5
                    ? '5.0 ★ Exceptional'
                    : shopStars === 4
                    ? '4.0 ★ Very Good'
                    : shopStars === 3
                    ? '3.0 ★ Average'
                    : `${shopStars}.0 ★ Need Improvement`}
                </span>
              </div>

              {/* Quick tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {shopTagsOptions.map((tag) => {
                  const isSelected = selectedShopTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleShopTag(tag)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: isSelected ? '1px solid #d97706' : '1px solid #cbd5e1',
                        background: isSelected ? 'rgba(217, 119, 6, 0.12)' : '#ffffff',
                        color: isSelected ? '#b45309' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                    </button>
                  );
                })}
              </div>

              {/* Review text */}
              <textarea
                rows={2}
                value={shopComment}
                onChange={(e) => setShopComment(e.target.value)}
                placeholder="Share specific details about screen calibration, battery life, or cleanliness..."
                className="input-field"
                style={{ width: '100%', height: 'auto', padding: '10px', fontSize: '13px', resize: 'vertical' }}
              />
            </div>

            {/* ─── SECTION 2: RUNNER / COURIER RATING ─── */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Truck size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)' }}>
                    {partnerName || 'Doorstep Courier Partner'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Tamper-Pouch Transit & Doorstep Inspection Testing
                  </div>
                </div>
              </div>

              {/* Courier star selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (partnerHover || partnerStars) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setPartnerStars(star)}
                      onMouseEnter={() => setPartnerHover(star)}
                      onMouseLeave={() => setPartnerHover(0)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        color: active ? '#f59e0b' : '#cbd5e1',
                        transform: active ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.1s ease',
                      }}
                    >
                      <Star size={24} fill={active ? '#f59e0b' : 'none'} />
                    </button>
                  );
                })}
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b', marginLeft: '4px' }}>
                  {partnerStars === 5 ? '5.0 ★ Excellent Handling' : `${partnerStars}.0 ★`}
                </span>
              </div>

              {/* Quick courier tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {partnerTagsOptions.map((tag) => {
                  const isSelected = selectedPartnerTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => togglePartnerTag(tag)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: isSelected ? '1px solid #10b981' : '1px solid #cbd5e1',
                        background: isSelected ? '#ecfdf5' : '#ffffff',
                        color: isSelected ? '#047857' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button type="button" onClick={onClose} className="btn-outline" style={{ padding: '8px 16px' }}>
                Decide Later
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={16} />
                <span>{loading ? 'Submitting...' : 'Post Verified Review'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
