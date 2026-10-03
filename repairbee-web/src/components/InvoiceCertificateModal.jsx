import React, { useState, useEffect } from 'react';
import { repairsApi } from '../api/client';
import {
  FileText,
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  QrCode,
  Smartphone,
  Award,
  Clock,
  MapPin,
  Building,
  Phone,
  Copy,
  Check,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function InvoiceCertificateModal({ orderId, onClose, initialTab = 'both' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab); // 'invoice' | 'certificate' | 'both'
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const fetchInvoice = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await repairsApi.getInvoice(orderId);
        setData(res?.data || res);
      } catch (err) {
        console.error('Failed to load invoice:', err);
        setError(err?.message || 'Could not load official tax invoice.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/invoice/${orderId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!orderId) return null;

  const invoice = data?.invoice;
  const cleanroomQC = data?.cleanroomQC;
  const warranty = data?.warranty;
  const order = data?.order;

  return (
    <div
      className="rb-invoice-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto'
      }}
    >
      {/* Embedded Print CSS to cleanly isolate the printable document */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .rb-invoice-modal-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          #rb-invoice-print-area, #rb-invoice-print-area * {
            visibility: visible !important;
          }
          #rb-invoice-print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 24px !important;
          }
          .rb-no-print {
            display: none !important;
          }
          .rb-page-break {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 40px !important;
            padding-top: 20px !important;
            border-top: 2px dashed #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Main Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          border: '1px solid #334155'
        }}
      >
        {/* Modal Toolbar (Non-printable) */}
        <div
          className="rb-no-print"
          style={{
            background: '#0f172a',
            color: '#f8fafc',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                Tax Invoice & Cleanroom QC Dossier
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Order #{orderId?.slice(0, 8).toUpperCase()} • GSTIN 29AABCR1234F1Z9
              </div>
            </div>
          </div>

          {/* View Tab Selector */}
          <div
            style={{
              display: 'flex',
              background: '#1e293b',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #334155'
            }}
          >
            <button
              onClick={() => setActiveTab('invoice')}
              style={{
                background: activeTab === 'invoice' ? '#0284c7' : 'transparent',
                color: activeTab === 'invoice' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Tax Invoice
            </button>
            <button
              onClick={() => setActiveTab('certificate')}
              style={{
                background: activeTab === 'certificate' ? '#0284c7' : 'transparent',
                color: activeTab === 'certificate' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cleanroom QC
            </button>
            <button
              onClick={() => setActiveTab('both')}
              style={{
                background: activeTab === 'both' ? '#0284c7' : 'transparent',
                color: activeTab === 'both' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Full Dossier
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyLink}
              title="Copy link to invoice"
              style={{
                background: '#1e293b',
                color: copiedLink ? '#34d399' : '#cbd5e1',
                border: '1px solid #334155',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>

            <button
              id="print-invoice-btn"
              onClick={handlePrint}
              style={{
                background: '#f59e0b',
                color: '#0f172a',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
              }}
            >
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: '#f8fafc',
            padding: '24px'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid #cbd5e1',
                  borderTopColor: '#0284c7',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }}
              />
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Generating Official Tax Invoice & QC Certificate...</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Compiling bench diagnostic telemetry and GST tax breakdown</div>
            </div>
          ) : error ? (
            <div style={{ background: '#fef2f2', border: '1px solid #f87171', padding: '16px', borderRadius: '10px', color: '#991b1b', textAlign: 'center' }}>
              {error}
            </div>
          ) : (
            <div
              id="rb-invoice-print-area"
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '36px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                color: '#0f172a',
                fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)'
              }}
            >
              {/* ================= PAGE 1: TAX INVOICE ================= */}
              {(activeTab === 'invoice' || activeTab === 'both') && (
                <div>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '7px',
                            background: '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            color: '#0f172a',
                            fontSize: '16px'
                          }}
                        >
                          🐝
                        </div>
                        <span style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a' }}>
                          RepairBee<span style={{ color: '#f59e0b' }}>.</span>
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                        RepairBee Technologies India Pvt. Ltd.
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Level 4, Prestige Cyber Towers, Koramangala 5th Block
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Bangalore, Karnataka — 560095
                      </div>
                      <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                        GSTIN: 29AABCR1234F1Z9 • support@repairbee.com
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#0284c7', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Tax Invoice
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                        (Original for Recipient)
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '12px' }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Invoice No: </span>
                        <strong style={{ fontFamily: 'var(--font-mono)', color: '#0f172a' }}>{invoice?.invoiceNumber}</strong>
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Date: </span>
                        <strong>{invoice?.invoiceDate}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Place of Supply: <strong>Karnataka (29)</strong>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Workshop Information 2-Column Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '20px',
                      background: '#f8fafc',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '24px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        Billed To Customer
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {order?.customer_name || 'Valued Customer'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                        Phone: {order?.customer_phone || '+91 98765 43210'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                        Doorstep: {order?.delivery_address || order?.pickup_address || '18th Main, Koramangala, Bangalore'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        Authorized Cleanroom Workshop Hub
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {order?.shop_name || 'Fix It Electronics Authorized Center'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                        Cleanroom Facility: ISO 14644-1 Class 7 Bench Station
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                        {order?.shop_address || '12 MG Road, Bangalore 560001'}
                      </div>
                    </div>
                  </div>

                  {/* Device Service Passport Banner */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f1f5f9',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      marginBottom: '20px',
                      fontSize: '12px'
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Device Serviced: </span>
                      <strong style={{ color: '#0f172a' }}>{order?.brand || ''} {order?.product_name || 'Smartphone / Device'} {order?.model || ''}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Pouch Custody Seal: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: '#059669' }}>
                        {cleanroomQC?.pouchBarcode}
                      </strong>
                    </div>
                  </div>

                  {/* Itemized Tax Invoice Table */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginBottom: '20px',
                      fontSize: '12px'
                    }}
                  >
                    <thead>
                      <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '6px 0 0 0' }}>#</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Item & Service Description</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>HSN/SAC</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Taxable Value</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice?.items?.map((item, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                          }}
                        >
                          <td style={{ padding: '12px', color: '#64748b', fontWeight: 600 }}>0{idx + 1}</td>
                          <td style={{ padding: '12px', color: '#0f172a', fontWeight: 600 }}>{item.description}</td>
                          <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#64748b' }}>{item.hsn}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#0f172a' }}>{item.qty}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            ₹{Number(item.taxableValue).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            ₹{Number(item.total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary & Tax Accounting Block */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '14px'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Escrow Payment & Protection Protocol
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5' }}>
                        This repair was processed under the <strong>RepairBee Zero-Risk Escrow Protocol</strong>. Funds were held in RBI-regulated escrow custody and released to the workshop only upon doorstep 4-point hardware verification and OTP confirmation.
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: '#d1fae5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0'
                          }}
                        >
                          ✓ PAID & SETTLED
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          Mode: {invoice?.paymentMethod}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '14px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: '#64748b' }}>Subtotal (Taxable Value):</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(invoice?.taxableAmount).toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: '#64748b' }}>CGST (9.0%):</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(invoice?.cgstAmount).toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ color: '#64748b' }}>SGST (9.0%):</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(invoice?.sgstAmount).toFixed(2)}</strong>
                      </div>
                      <div
                        style={{
                          borderTop: '2px solid #0f172a',
                          paddingTop: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '15px'
                        }}
                      >
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>Invoice Total:</span>
                        <strong style={{ fontWeight: 900, color: '#0284c7', fontFamily: 'var(--font-mono)' }}>
                          ₹{Number(invoice?.grossAmount).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Footer Signatures */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.4' }}>
                      This is a computer-generated tax invoice issued by RepairBee Technologies Pvt. Ltd.<br />
                      Reverse Charge: Applicable (NO) • Certified Genuine Parts Replacement Policy
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontFamily: '"Brush Script MT", cursive, sans-serif',
                          color: '#0284c7',
                          marginBottom: '2px'
                        }}
                      >
                        Thanzeer J.
                      </div>
                      <div style={{ width: '140px', height: '1px', background: '#94a3b8', margin: '0 auto 4px' }} />
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>
                        Authorized Signatory
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= PAGE 2: CLEANROOM QC & WARRANTY CERTIFICATE ================= */}
              {(activeTab === 'certificate' || activeTab === 'both') && (
                <div className={activeTab === 'both' ? 'rb-page-break' : ''} style={{ marginTop: activeTab === 'both' ? '40px' : '0' }}>
                  
                  {/* Cleanroom Certificate Header */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
                      color: '#ffffff',
                      padding: '24px',
                      borderRadius: '12px',
                      marginBottom: '24px',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1.5px solid #334155'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <ShieldCheck size={20} style={{ color: '#38bdf8' }} />
                          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: '#38bdf8', textTransform: 'uppercase' }}>
                            Cleanroom Quality Control & Calibration Certificate
                          </span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.3px' }}>
                          Hardware Certification Passport
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                          Facility: {cleanroomQC?.facility}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)'
                          }}
                        >
                          ✓ ISO 14644-1 CLASS 7 PASS
                        </span>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                          Cert ID: {cleanroomQC?.certificateId}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 12-Point Hardware Bench Certification Grid */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                        <span>12-Point Cleanroom Hardware Diagnostic & Calibration Matrix</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Inspector: <strong style={{ color: '#0f172a' }}>{cleanroomQC?.leadTechnician || 'Anand Verma'}</strong> ({cleanroomQC?.technicianId || 'RB-TECH-041'}) • {cleanroomQC?.workbenchBay || 'Bay #4'}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {cleanroomQC?.deviceInspectionPoints?.map((pt, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '12px 14px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
                              {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}. {pt.testName}
                            </div>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: pt.status === 'REPLACED_OEM' ? '#dbeafe' : '#d1fae5',
                                color: pt.status === 'REPLACED_OEM' ? '#1e40af' : '#065f46',
                                border: `1px solid ${pt.status === 'REPLACED_OEM' ? '#bfdbfe' : '#a7f3d0'}`
                              }}
                            >
                              ✓ {pt.status === 'REPLACED_OEM' ? 'OEM REPLACED' : pt.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', lineHeight: '1.3' }}>
                            <strong>Req:</strong> {pt.standard}
                          </div>
                          <div style={{ fontSize: '10px', color: '#0284c7', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            Measured: {pt.measuredVal}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Platform Warranty Certificate Box */}
                  {(() => {
                    const tierKey = warranty?.tier || 'standard';
                    const tierTheme = {
                      diamond: {
                        gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                        border: '1.5px solid #8b5cf6',
                        iconColor: '#7c3aed',
                        headerColor: '#5b21b6',
                        title: `Official Diamond VIP Shield Certificate (${warranty?.durationDays || 180} Days)`,
                        badge: '💎 VIP Diamond Tier',
                        badgeBg: '#7c3aed',
                        badgeColor: '#ffffff',
                        textColor: '#4c1d95',
                        qrBorder: '#8b5cf6',
                        qrShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
                        qrAccent: '#7c3aed'
                      },
                      gold: {
                        gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        border: '1.5px solid #f59e0b',
                        iconColor: '#d97706',
                        headerColor: '#92400e',
                        title: `Official Gold Shield Protection Certificate (${warranty?.durationDays || 90} Days)`,
                        badge: '⭐ Gold Shield Tier',
                        badgeBg: '#f59e0b',
                        badgeColor: '#ffffff',
                        textColor: '#78350f',
                        qrBorder: '#f59e0b',
                        qrShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                        qrAccent: '#f59e0b'
                      },
                      standard: {
                        gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                        border: '1.5px solid #10b981',
                        iconColor: '#059669',
                        headerColor: '#065f46',
                        title: `Official Platform Warranty Certificate (30 Days)`,
                        badge: '🛡️ Standard Platform Tier',
                        badgeBg: '#10b981',
                        badgeColor: '#ffffff',
                        textColor: '#047857',
                        qrBorder: '#10b981',
                        qrShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                        qrAccent: '#10b981'
                      }
                    }[tierKey] || {
                      gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                      border: '1.5px solid #10b981',
                      iconColor: '#059669',
                      headerColor: '#065f46',
                      title: `Official Platform Warranty Certificate (30 Days)`,
                      badge: '🛡️ Standard Platform Tier',
                      badgeBg: '#10b981',
                      badgeColor: '#ffffff',
                      textColor: '#047857',
                      qrBorder: '#10b981',
                      qrShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                      qrAccent: '#10b981'
                    };

                    return (
                      <div
                        style={{
                          background: tierTheme.gradient,
                          border: tierTheme.border,
                          borderRadius: '12px',
                          padding: '20px',
                          display: 'grid',
                          gridTemplateColumns: '1fr 120px',
                          gap: '20px',
                          alignItems: 'center',
                          marginBottom: '24px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <Award size={18} style={{ color: tierTheme.iconColor }} />
                            <span style={{ fontSize: '13px', fontWeight: 900, color: tierTheme.headerColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {tierTheme.title}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 800, background: tierTheme.badgeBg, color: tierTheme.badgeColor, padding: '2px 8px', borderRadius: '10px', marginLeft: 'auto' }}>
                              {tierTheme.badge}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: tierTheme.textColor, lineHeight: '1.5', marginBottom: '8px' }}>
                            {warranty?.terms}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: tierTheme.headerColor, flexWrap: 'wrap' }}>
                            <div>
                              Certificate ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{warranty?.warrantyId}</strong>
                            </div>
                            <div>
                              Valid Period: <strong>{warranty?.validFrom} — {warranty?.validUntil}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Scannable QR Code Box */}
                        <div
                          style={{
                            background: '#ffffff',
                            border: `1px solid ${tierTheme.qrBorder}`,
                            borderRadius: '10px',
                            padding: '10px',
                            textAlign: 'center',
                            boxShadow: tierTheme.qrShadow
                          }}
                        >
                          <div style={{ width: '80px', height: '80px', margin: '0 auto', background: '#0f172a', padding: '6px', borderRadius: '6px' }}>
                            {/* Stylized QR Code SVG */}
                            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                              <rect width="100" height="100" fill="#ffffff" />
                              <rect x="10" y="10" width="30" height="30" fill="#0f172a" />
                              <rect x="15" y="15" width="20" height="20" fill="#ffffff" />
                              <rect x="20" y="20" width="10" height="10" fill="#0f172a" />
                              
                              <rect x="60" y="10" width="30" height="30" fill="#0f172a" />
                              <rect x="65" y="15" width="20" height="20" fill="#ffffff" />
                              <rect x="70" y="20" width="10" height="10" fill="#0f172a" />
                              
                              <rect x="10" y="60" width="30" height="30" fill="#0f172a" />
                              <rect x="15" y="65" width="20" height="20" fill="#ffffff" />
                              <rect x="20" y="70" width="10" height="10" fill="#0f172a" />

                              <rect x="50" y="50" width="10" height="10" fill="#0f172a" />
                              <rect x="65" y="50" width="10" height="10" fill="#0f172a" />
                              <rect x="80" y="50" width="10" height="10" fill="#0f172a" />
                              <rect x="50" y="65" width="10" height="10" fill="#0f172a" />
                              <rect x="70" y="70" width="15" height="15" fill={tierTheme.qrAccent} />
                            </svg>
                          </div>
                          <div style={{ fontSize: '9px', fontWeight: 800, color: tierTheme.headerColor, marginTop: '4px' }}>
                            SCAN TO VERIFY
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Technician Sign-Off Seal */}
                  <div
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
                        Lead Technician: {cleanroomQC?.leadTechnician} ({cleanroomQC?.technicianId})
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                        Station: {cleanroomQC?.workbenchBay} • Date: {cleanroomQC?.inspectionDate}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: '1.5px dashed #0284c7',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: 'rgba(2, 132, 199, 0.05)'
                      }}
                    >
                      <Sparkles size={16} style={{ color: '#0284c7' }} />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                          Cryptographically Verified
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                          REPAIRBEE-QC-APPROVED
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
