import React, { useState } from 'react';
import { withdrawalsApi } from '../api/client';
import confetti from 'canvas-confetti';
import {
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  Lock
} from 'lucide-react';

export default function WithdrawalModal({
  isOpen,
  onClose,
  availableBalance = 0,
  bankDetails = {},
  onOpenBankModal,
  onWithdrawalSubmitted
}) {
  if (!isOpen) return null;

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const isBankLinked = !!(bankDetails?.bank_account_number && bankDetails?.bank_ifsc);

  const handleQuickAmount = (val) => {
    setError('');
    setAmount(String(Math.min(val, availableBalance)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isBankLinked) {
      setError('Please link your settlement bank account before requesting a withdrawal.');
      return;
    }

    if (numAmount < 100) {
      setError('Minimum withdrawal request is ₹100.');
      return;
    }

    if (numAmount > availableBalance) {
      setError(`Requested amount exceeds available balance (₹${availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}).`);
      return;
    }

    setLoading(true);
    try {
      await withdrawalsApi.requestWithdrawal({
        amount: numAmount
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSuccess(true);
      setTimeout(() => {
        if (onWithdrawalSubmitted) onWithdrawalSubmitted();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err?.message || 'Failed to submit withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <Wallet size={22} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>Request Bank Payout</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Instant IMPS / NEFT Settlement Registry</div>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Available Balance Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#059669', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                Available Wallet Balance
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#0f172a', marginTop: '2px' }}>
                ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              background: '#dcfce7',
              color: '#15803d',
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid #86efac'
            }}>
              ✓ Settled & Liquid
            </span>
          </div>

          {error && (
            <div style={{
              padding: '12px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#ef4444',
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

          {success && (
            <div style={{
              padding: '12px 14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#16a34a',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <CheckCircle2 size={16} />
              <span>🎉 Withdrawal requested! Payout transfer queued for admin clearance.</span>
            </div>
          )}

          {/* Amount Input */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              Withdrawal Amount (INR) *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                fontWeight: 800,
                color: '#64748b'
              }}>
                ₹
              </span>
              <input
                id="withdrawal-amount-input"
                type="number"
                min={100}
                max={availableBalance}
                step={50}
                value={amount}
                onChange={(e) => {
                  setError('');
                  setAmount(e.target.value);
                }}
                placeholder="Enter amount (min ₹100)"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 34px',
                  borderRadius: '10px',
                  border: numAmount > availableBalance ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '18px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  color: '#0f172a'
                }}
              />
            </div>

            {/* Quick Amount Chips */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {[500, 1000, 2500].filter(a => a <= availableBalance).map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  +₹{val}
                </button>
              ))}
              {availableBalance > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(availableBalance)}
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#059669',
                    cursor: 'pointer'
                  }}
                >
                  Withdraw All (₹{availableBalance.toLocaleString()})
                </button>
              )}
            </div>
          </div>

          {/* Linked Bank Details Preview */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
                Disbursement Destination
              </div>
              {isBankLinked && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenBankModal) onOpenBankModal();
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Change Account
                </button>
              )}
            </div>

            {isBankLinked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1e293b'
                }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    {bankDetails.bank_name || 'Bank Account'} •••••{bankDetails.bank_account_number?.slice(-4) || 'XXXX'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    IFSC: {bankDetails.bank_ifsc} • Beneficiary: {bankDetails.bank_account_name}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
                  ⚠️ No bank account registered for payout disbursements.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenBankModal) onOpenBankModal();
                  }}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Link Bank
                </button>
              </div>
            )}
          </div>

          {/* SLA Notice */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: '#64748b',
            marginBottom: '20px',
            lineHeight: '1.4'
          }}>
            <ShieldCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} />
            <span>
              Direct IMPS/NEFT transfers are cleared within 2-4 banking hours. RepairBee charges <strong>zero fees</strong> on partner workshop settlements.
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#475569',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              id="confirm-withdrawal-btn"
              type="submit"
              disabled={loading || !isBankLinked || availableBalance < 100 || numAmount < 100 || numAmount > availableBalance}
              style={{
                flex: 2,
                padding: '12px',
                background: (isBankLinked && numAmount >= 100 && numAmount <= availableBalance) ? '#10b981' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '14px',
                cursor: (isBankLinked && numAmount >= 100 && numAmount <= availableBalance) ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: (isBankLinked && numAmount >= 100 && numAmount <= availableBalance) ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none'
              }}
            >
              <ArrowUpRight size={18} />
              <span>{loading ? 'Submitting...' : 'Confirm Withdrawal Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
