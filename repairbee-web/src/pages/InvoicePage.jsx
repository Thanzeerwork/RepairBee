import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { repairsApi } from '../api/client';
import {
  FileText,
  Printer,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Award,
  Sparkles,
  QrCode
} from 'lucide-react';

export default function InvoicePage() {
  const { orderId, id } = useParams();
  const targetId = orderId || id;
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!targetId) return;
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const res = await repairsApi.getInvoice(targetId);
        setData(res?.data || res);
      } catch (err) {
        console.error('Failed to load invoice:', err);
        setError(err?.message || 'Could not load tax invoice.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [targetId]);

  const handlePrint = () => {
    window.print();
  };

  const invoice = data?.invoice;
  const cleanroomQC = data?.cleanroomQC;
  const warranty = data?.warranty;
  const order = data?.order;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: '60px' }}>
      {/* Embedded Print CSS */}
      <style>{`
        @media print {
          .rb-no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
          }
          #rb-invoice-page-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
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

      {/* Top Action Bar (Hidden on print) */}
      <div
        className="rb-no-print"
        style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '16px 24px',
          borderBottom: '1px solid #1e293b',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate(`/track/${targetId}`)}
            style={{
              background: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Live Tracking</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              Order #{targetId?.slice(0, 8).toUpperCase()}
            </span>
            <button
              onClick={handlePrint}
              style={{
                background: '#f59e0b',
                color: '#0f172a',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)'
              }}
            >
              <Printer size={16} />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Sheet */}
      <div style={{ maxWidth: '860px', margin: '30px auto 0', padding: '0 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>Generating Official Tax Invoice & QC Certificate...</div>
          </div>
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #f87171', padding: '20px', borderRadius: '12px', color: '#991b1b', textAlign: 'center' }}>
            {error}
          </div>
        ) : (
          <div
            id="rb-invoice-page-sheet"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '40px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e2e8f0',
              color: '#0f172a'
            }}
          >
            {/* PAGE 1: TAX INVOICE */}
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0f172a', fontSize: '16px' }}>
                      🐝
                    </div>
                    <span style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a' }}>
                      RepairBee<span style={{ color: '#f59e0b' }}>.</span>
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>RepairBee Technologies India Pvt. Ltd.</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Level 4, Prestige Cyber Towers, Koramangala 5th Block, Bangalore — 560095</div>
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

              {/* Billed To & Workshop Hub */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    Billed To Customer
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{order?.customer_name || 'Valued Customer'}</div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Phone: {order?.customer_phone || '+91 98765 43210'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                    Doorstep: {order?.delivery_address || order?.pickup_address || '18th Main, Koramangala, Bangalore'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    Authorized Cleanroom Workshop Hub
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{order?.shop_name || 'Fix It Electronics Authorized Center'}</div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Facility: ISO 14644-1 Class 7 Bench Station</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                    {order?.shop_address || '12 MG Road, Bangalore 560001'}
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
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
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '12px', color: '#64748b', fontWeight: 600 }}>0{idx + 1}</td>
                      <td style={{ padding: '12px', color: '#0f172a', fontWeight: 600 }}>{item.description}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#64748b' }}>{item.hsn}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#0f172a' }}>{item.qty}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{Number(item.taxableValue).toFixed(2)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>₹{Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary & Tax Accounting */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Escrow Payment & Protection Protocol
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5' }}>
                    This repair was processed under the <strong>RepairBee Zero-Risk Escrow Protocol</strong>. Funds were held in RBI-regulated escrow custody and released to the workshop only upon doorstep 4-point hardware verification.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                      ✓ PAID & SETTLED
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>Mode: {invoice?.paymentMethod}</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '14px', fontSize: '12px' }}>
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
                  <div style={{ borderTop: '2px solid #0f172a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>Invoice Total:</span>
                    <strong style={{ fontWeight: 900, color: '#0284c7', fontFamily: 'var(--font-mono)' }}>₹{Number(invoice?.grossAmount).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* PAGE 2: CLEANROOM QC & WARRANTY CERTIFICATE */}
            <div className="rb-page-break" style={{ marginTop: '40px' }}>
              <div style={{ background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)', color: '#ffffff', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1.5px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <ShieldCheck size={20} style={{ color: '#38bdf8' }} />
                      <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: '#38bdf8', textTransform: 'uppercase' }}>
                        Cleanroom Quality Control & Calibration Certificate
                      </span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff' }}>Hardware Certification Passport</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Facility: {cleanroomQC?.facility}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                      ✓ ISO 14644-1 CLASS 7 PASS
                    </span>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                      Cert ID: {cleanroomQC?.certificateId}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Point Inspection Grid */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                  <span>4-Point Bench Intake & Post-Repair Diagnostic Matrix</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {cleanroomQC?.deviceInspectionPoints?.map((pt, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>0{idx + 1}. {pt.testName}</div>
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                          ✓ {pt.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}><strong>Standard:</strong> {pt.standard}</div>
                      <div style={{ fontSize: '10px', color: '#0284c7', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Measured: {pt.measuredVal}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 30-Day Platform Warranty Certificate */}
              <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1.5px solid #f59e0b', borderRadius: '12px', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 120px', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Award size={18} style={{ color: '#d97706' }} />
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#92400e', textTransform: 'uppercase' }}>
                      Official 30-Day Platform Warranty Certificate
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#78350f', lineHeight: '1.5', marginBottom: '8px' }}>
                    {warranty?.terms}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#92400e' }}>
                    <div>Certificate ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{warranty?.warrantyId}</strong></div>
                    <div>Valid Period: <strong>{warranty?.validFrom} — {warranty?.validUntil}</strong></div>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #f59e0b', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', margin: '0 auto', background: '#0f172a', padding: '6px', borderRadius: '6px' }}>
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
                      <rect x="70" y="70" width="15" height="15" fill="#f59e0b" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>SCAN TO VERIFY</div>
                </div>
              </div>

              {/* Technician Sign-Off */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
                    Lead Technician: {cleanroomQC?.leadTechnician} ({cleanroomQC?.technicianId})
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    Station: {cleanroomQC?.workbenchBay} • Date: {cleanroomQC?.inspectionDate}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1.5px dashed #0284c7', padding: '6px 14px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.05)' }}>
                  <Sparkles size={16} style={{ color: '#0284c7' }} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>Cryptographically Verified</div>
                    <div style={{ fontSize: '10px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>REPAIRBEE-QC-APPROVED</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
