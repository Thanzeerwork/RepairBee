import React, { useState } from 'react';
import { workshopApi } from '../api/client';
import { Building2, ShieldCheck, CheckCircle2, AlertCircle, X, CreditCard } from 'lucide-react';

export default function BankDetailsModal({ isOpen, onClose, currentDetails, onBankUpdated }) {
  if (!isOpen) return null;

  const [bankName, setBankName] = useState(currentDetails?.bank_name || 'HDFC Bank');
  const [accountName, setAccountName] = useState(currentDetails?.bank_account_name || 'Fix It Electronics Cleanroom');
  const [accountNumber, setAccountNumber] = useState(currentDetails?.bank_account_number || '');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState(currentDetails?.bank_account_number || '');
  const [ifsc, setIfsc] = useState(currentDetails?.bank_ifsc || 'HDFC0001234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!accountName.trim() || !bankName.trim() || !accountNumber.trim() || !ifsc.trim()) {
      setError('Please fill out all required bank account fields.');
      return;
    }

    if (accountNumber.trim() !== confirmAccountNumber.trim()) {
      setError('Account numbers do not match. Please verify.');
      return;
    }

    if (ifsc.trim().length < 8) {
      setError('Please enter a valid Bank IFSC code (e.g. HDFC0001234).');
      return;
    }

    setLoading(true);
    try {
      await workshopApi.updateProfile({
        bank_account_name: accountName.trim(),
        bank_name: bankName.trim(),
        bank_account_number: accountNumber.trim(),
        bank_ifsc: ifsc.trim().toUpperCase()
      });

      setSuccess(true);
      setTimeout(() => {
        if (onBankUpdated) onBankUpdated();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err?.message || 'Failed to save bank account details.');
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
        {/* Modal Header */}
        <div style={{
          background: '#0f172a',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>Settlement Bank Account</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Direct IMPS & NEFT Workshop Payout Registry</div>
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

        {/* Modal Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
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
              <span>✓ Bank details updated and verified successfully!</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Account Holder Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Account Beneficiary Name *
              </label>
              <input
                id="bank-account-name-input"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Fix It Electronics Cleanroom Pvt Ltd"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Bank Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Bank Name *
              </label>
              <input
                id="bank-name-input"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Account Number & Confirm Account Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Account Number *
                </label>
                <input
                  id="bank-account-number-input"
                  type="password"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter Account No."
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Confirm Account Number *
                </label>
                <input
                  id="bank-confirm-account-number-input"
                  type="text"
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value)}
                  placeholder="Re-enter Account No."
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>
            </div>

            {/* IFSC Code */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Bank IFSC Code (11 Characters) *
              </label>
              <input
                id="bank-ifsc-input"
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                maxLength={11}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase'
                }}
              />
            </div>

            {/* Verification Guarantee Alert */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <ShieldCheck size={18} style={{ color: '#10b981', marginTop: '2px' }} />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                <strong>Zero-Fee Direct Settlements:</strong> Payout withdrawals are disbursed directly to this registered bank account via instant IMPS / RTGS upon admin clearance.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
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
              id="save-bank-details-btn"
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '12px',
                background: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CreditCard size={16} />
              <span>{loading ? 'Verifying & Saving...' : 'Save & Link Bank Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
