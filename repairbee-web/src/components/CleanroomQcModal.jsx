import React, { useState, useEffect } from 'react';
import { workshopApi } from '../api/client';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  Smartphone,
  Cpu,
  Layers,
  Thermometer,
  Eye,
  Volume2,
  Lock,
  Wifi,
  Sliders,
  Check,
  RotateCcw,
  Award
} from 'lucide-react';

const BENCHMARK_TESTS = [
  {
    id: 1,
    testName: 'OLED / Touch Digitizer Multi-Point Accuracy',
    domain: 'Display & Touch',
    standard: 'Uniform Capacitive Response, 0 Dead Pixels, 120Hz Latency < 10ms',
    defaultStatus: 'PASSED',
    defaultVal: '100% Capacitive Multi-Touch Uniformity',
    options: ['100% Capacitive Multi-Touch Uniformity', 'OEM Screen Calibrated (8.2ms latency)', '0 Dead Pixels Confirmed']
  },
  {
    id: 2,
    testName: 'Display Color Gamut & Luminance Calibration',
    domain: 'Display & Touch',
    standard: '100% sRGB/DCI-P3 Color Accuracy, TrueTone / Ambient Light Calibrated',
    defaultStatus: 'PASSED',
    defaultVal: 'Peak 1,250 nits Luminance Confirmed',
    options: ['Peak 1,250 nits Luminance Confirmed', 'TrueTone Sensor Functional', 'D65 White Point Calibrated']
  },
  {
    id: 3,
    testName: 'Battery Capacity Cycle & Internal Impedance',
    domain: 'Power & Thermals',
    standard: 'OEM Rated Battery Capacity >= 90%, Internal Impedance < 45mΩ',
    defaultStatus: 'PASSED',
    defaultVal: 'Battery Health 98% • 38mΩ Impedance',
    options: ['Battery Health 98% • 38mΩ Impedance', 'Battery Health 100% (New OEM Cell)', 'Nominal 42mΩ Resistance']
  },
  {
    id: 4,
    testName: 'Thermal Throttling & Heat Dissipation',
    domain: 'Power & Thermals',
    standard: 'Peak Core Temp <= 41°C under 100% Benchmark Stress Test',
    defaultStatus: 'PASSED',
    defaultVal: '37.8°C Nominal Core Thermal Equilibrium',
    options: ['37.8°C Nominal Core Thermal Equilibrium', '38.4°C Peak Dissipation OK', 'Thermal Paste / Graphite Pad Resealed']
  },
  {
    id: 5,
    testName: 'Dual Microphones & Acoustic Frequency Response',
    domain: 'Optics, Audio & Sensors',
    standard: 'Noise Suppression Tested, Zero Buzzing / Rattle @ 1kHz (85dB SPL)',
    defaultStatus: 'PASSED',
    defaultVal: 'Dual Noise-Canceling Array Nominal',
    options: ['Dual Noise-Canceling Array Nominal', '85dB SPL Zero Distortion @ 1kHz', 'Earpiece Speaker Clean & Balanced']
  },
  {
    id: 6,
    testName: 'Optical Camera Array & Optical Image Stabilization (OIS)',
    domain: 'Optics, Audio & Sensors',
    standard: 'Multi-Lens Laser Autofocus Calibrated, OIS Gyroscope Active',
    defaultStatus: 'PASSED',
    defaultVal: '0.04s Laser AF Lock & Clean Optical Ring',
    options: ['0.04s Laser AF Lock & Clean Optical Ring', 'OIS Gyro Stable on All Lenses', '0 Dust Particles on Lens Assembly']
  },
  {
    id: 7,
    testName: 'Biometrics & Secure Enclave Cryptographic Handshake',
    domain: 'Optics, Audio & Sensors',
    standard: 'Face ID / Touch ID Optical Sensor Hardware Handshake Authenticated',
    defaultStatus: 'PASSED',
    defaultVal: '100% Biometric Handshake Match Rate',
    options: ['100% Biometric Handshake Match Rate', 'Face ID Dot Projector Aligned', 'Secure Enclave Key Verified']
  },
  {
    id: 8,
    testName: 'Wireless RF Telemetry (5G / Wi-Fi 6 / Bluetooth 5.3)',
    domain: 'Board & Hermetic Integrity',
    standard: 'Active Antenna Diversity Check, RSSI Signal Reception > -65 dBm',
    defaultStatus: 'PASSED',
    defaultVal: '-52 dBm Strong Signal on 5GHz Band',
    options: ['-52 dBm Strong Signal on 5GHz Band', '5G Sub-6 / LTE Diversity Validated', 'Bluetooth 5.3 Low Energy Handshake OK']
  },
  {
    id: 9,
    testName: 'Power Delivery Handshake & Fast Charge Negotiation',
    domain: 'Power & Thermals',
    standard: 'USB-PD / QC 4.0 Handshake Verified, Idle Leakage Current < 12mA',
    defaultStatus: 'PASSED',
    defaultVal: '5V/3A & 9V/2.2A Negotiation Confirmed',
    options: ['5V/3A & 9V/2.2A Negotiation Confirmed', 'Fast Charge 20W PD Peak Verified', 'Idle Sleep Draw 8.4mA Nominal']
  },
  {
    id: 10,
    testName: 'Tactile Physical Controls & Linear Haptic Engine',
    domain: 'Optics, Audio & Sensors',
    standard: 'Positive Micro-Switch Travel, Haptic Taptic Engine Waveform Nom.',
    defaultStatus: 'PASSED',
    defaultVal: 'Clean Haptic Feedback & Tactile Click',
    options: ['Clean Haptic Feedback & Tactile Click', 'Power & Volume Buttons Responsive', 'Mute Toggle Switch Functional']
  },
  {
    id: 11,
    testName: 'Liquid Contact Indicator (LCI) & Motherboard Surface',
    domain: 'Board & Hermetic Integrity',
    standard: 'Dry Virgin LCI Status, Zero Micro-Corrosion or Flux Residue',
    defaultStatus: 'PASSED',
    defaultVal: 'LCI Strip Virgin White • 0 Board Bridges',
    options: ['LCI Strip Virgin White • 0 Board Bridges', 'Ultrasonic Cleaned & Flux Free', 'No Fluid Ingress Detected']
  },
  {
    id: 12,
    testName: 'Cleanroom Hermetic Gasket & ESD Tamper-Evident Pouch Seal',
    domain: 'Board & Hermetic Integrity',
    standard: 'Replacement IP Adhesive Gasket, Flush Bezel, VOID Anti-Static Pouch',
    defaultStatus: 'PASSED',
    defaultVal: '0.0mm Bezel Flex, Tamper Seal Applied',
    options: ['0.0mm Bezel Flex, Tamper Seal Applied', 'IP68 Gasket Thermal Cured', 'Anti-Static Pouch Serialized & Sealed']
  }
];

export default function CleanroomQcModal({ isOpen, onClose, order, onQcCertified }) {
  const [tests, setTests] = useState([]);
  const [leadTechnician, setLeadTechnician] = useState('Anand Verma');
  const [technicianId, setTechnicianId] = useState('RB-TECH-041');
  const [workbenchBay, setWorkbenchBay] = useState('Bay #4 • Precision Cleanroom Station');
  const [pouchBarcode, setPouchBarcode] = useState('');
  const [benchNotes, setBenchNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterDomain, setFilterDomain] = useState('all');

  useEffect(() => {
    if (!order) return;
    setPouchBarcode(order.pouch_barcode || `RB-POUCH-${order.id.slice(0, 6).toUpperCase()}`);

    // If order already has a saved qc_report, load it
    const existing = order.qc_report;
    if (existing?.deviceInspectionPoints && Array.isArray(existing.deviceInspectionPoints)) {
      setTests(existing.deviceInspectionPoints);
      if (existing.leadTechnician) setLeadTechnician(existing.leadTechnician);
      if (existing.technicianId) setTechnicianId(existing.technicianId);
      if (existing.workbenchBay) setWorkbenchBay(existing.workbenchBay);
      if (existing.benchNotes) setBenchNotes(existing.benchNotes);
      if (existing.pouchBarcode) setPouchBarcode(existing.pouchBarcode);
    } else {
      // Default to 12 benchmark test suite
      setTests(
        BENCHMARK_TESTS.map(t => ({
          testName: t.testName,
          domain: t.domain,
          standard: t.standard,
          status: t.defaultStatus,
          measuredVal: t.defaultVal
        }))
      );
      setBenchNotes('Device reassembled under cleanroom positive pressure. 12-point calibration verified.');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleUpdateStatus = (index, newStatus) => {
    setTests(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status: newStatus };
      return next;
    });
  };

  const handleUpdateVal = (index, newVal) => {
    setTests(prev => {
      const next = [...prev];
      next[index] = { ...next[index], measuredVal: newVal };
      return next;
    });
  };

  const handleQuickFillBenchmark = () => {
    setTests(
      BENCHMARK_TESTS.map(t => ({
        testName: t.testName,
        domain: t.domain,
        standard: t.standard,
        status: 'PASSED',
        measuredVal: t.defaultVal
      }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await workshopApi.saveQcReport(order.id, {
        certificateId: `QC-CERT-${order.id.slice(0, 8).toUpperCase()}`,
        leadTechnician,
        technicianId,
        workbenchBay,
        pouchBarcode,
        deviceInspectionPoints: tests,
        benchNotes,
        inspectionDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        overallStatus: tests.every(t => t.status === 'PASSED' || t.status === 'REPLACED_OEM') ? 'PASSED' : 'CONDITIONAL_PASS'
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (onQcCertified) {
        onQcCertified(res?.data?.order || res?.data || order);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save QC report:', err);
      setError(err?.message || 'Failed to certify cleanroom QC report.');
    } finally {
      setLoading(false);
    }
  };

  const domains = ['all', 'Display & Touch', 'Power & Thermals', 'Optics, Audio & Sensors', 'Board & Hermetic Integrity'];
  const filteredTests = filterDomain === 'all' ? tests : tests.filter(t => t.domain === filterDomain);
  const passedCount = tests.filter(t => t.status === 'PASSED' || t.status === 'REPLACED_OEM').length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 120,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '920px',
        maxHeight: '94vh',
        overflowY: 'auto',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* MODAL HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          borderBottom: '1px solid #1e293b',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
            }}>
              <ShieldCheck size={28} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  color: '#38bdf8'
                }}>
                  Cleanroom Hardware Quality Control
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  ISO 14644-1 CLASS 7
                </span>
                {order.warranty_tier === 'diamond' ? (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(168, 85, 247, 0.2)',
                    color: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.4)'
                  }}>
                    💎 VIP DIAMOND TIER
                  </span>
                ) : order.warranty_tier === 'gold' ? (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.4)'
                  }}>
                    ⭐ GOLD SHIELD TIER
                  </span>
                ) : (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    🛡️ STANDARD 30D
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: '2px 0 4px' }}>
                12-Point Precision Diagnostic Matrix
              </h2>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Order #{order.id.slice(0, 8).toUpperCase()} • {order.product_name || 'Electronics Device'} • Customer: {order.customer_name || 'Customer'}
              </div>
            </div>

            {/* Score pill */}
            <div style={{
              textAlign: 'right',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '8px 16px',
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>QC Benchmark Score</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                {passedCount} / {tests.length} PASS
              </div>
            </div>
          </div>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '24px 28px', flex: 1 }}>

          {/* Quick-fill & Domain Filters Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {domains.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFilterDomain(d)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: filterDomain === d ? '#0284c7' : '#e2e8f0',
                    background: filterDomain === d ? '#0284c7' : '#f8fafc',
                    color: filterDomain === d ? '#ffffff' : '#475569',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {d === 'all' ? 'All 12 Tests' : d}
                </button>
              ))}
            </div>

            {/* Benchmark Autofill Button */}
            <button
              type="button"
              id="qc-quick-fill-btn"
              onClick={handleQuickFillBenchmark}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#ecfdf5',
                border: '1px solid #10b981',
                color: '#065f46',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Sparkles size={14} style={{ color: '#10b981' }} />
              <span>Quick-Fill All 12 Benchmark Standards</span>
            </button>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #f87171',
              color: '#b91c1c',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {/* 12-POINT TESTS GRID */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {filteredTests.map((test, index) => {
              const originalIndex = tests.findIndex(t => t.testName === test.testName);
              const benchmarkDef = BENCHMARK_TESTS.find(b => b.testName === test.testName);

              return (
                <div
                  key={test.testName}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#0284c7',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          #{originalIndex + 1 < 10 ? `0${originalIndex + 1}` : originalIndex + 1}
                        </span>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                          {test.testName}
                        </strong>
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          fontWeight: 700
                        }}>
                          {test.domain}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                        <strong>ISO Requirement:</strong> {test.standard}
                      </div>
                    </div>

                    {/* Status Toggle Buttons */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['PASSED', 'REPLACED_OEM', 'FLAGGED'].map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleUpdateStatus(originalIndex, st)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: '1px solid',
                            borderColor: test.status === st
                              ? (st === 'PASSED' ? '#10b981' : st === 'REPLACED_OEM' ? '#0284c7' : '#ef4444')
                              : '#cbd5e1',
                            background: test.status === st
                              ? (st === 'PASSED' ? '#10b981' : st === 'REPLACED_OEM' ? '#0284c7' : '#ef4444')
                              : '#ffffff',
                            color: test.status === st ? '#ffffff' : '#64748b',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {st === 'PASSED' && '✓ PASS'}
                          {st === 'REPLACED_OEM' && '⚡ OEM REPLACED'}
                          {st === 'FLAGGED' && '⚠ ATTENTION'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Measured Value Input & Quick Options */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <input
                        type="text"
                        value={test.measuredVal || ''}
                        onChange={(e) => handleUpdateVal(originalIndex, e.target.value)}
                        placeholder="Measured value / technician observation..."
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontFamily: 'var(--font-mono)'
                        }}
                      />
                    </div>

                    {/* Suggested preset chips */}
                    {benchmarkDef?.options && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {benchmarkDef.options.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleUpdateVal(originalIndex, opt)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: test.measuredVal === opt ? '#dbeafe' : '#f1f5f9',
                              border: '1px solid',
                              borderColor: test.measuredVal === opt ? '#93c5fd' : '#e2e8f0',
                              color: test.measuredVal === opt ? '#1e40af' : '#64748b',
                              fontSize: '10px',
                              cursor: 'pointer',
                              fontWeight: test.measuredVal === opt ? 700 : 500
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TECHNICIAN & BENCH CUSTODY DETAILS */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                Lead Cleanroom Inspector
              </label>
              <input
                type="text"
                value={leadTechnician}
                onChange={(e) => setLeadTechnician(e.target.value)}
                placeholder="Technician Full Name"
                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                Technician ID / Badge
              </label>
              <input
                type="text"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                placeholder="RB-TECH-041"
                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                Workbench Cleanroom Bay
              </label>
              <input
                type="text"
                value={workbenchBay}
                onChange={(e) => setWorkbenchBay(e.target.value)}
                placeholder="Bay #4 • Precision Station"
                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                Anti-Static Tamper Pouch Barcode
              </label>
              <input
                type="text"
                value={pouchBarcode}
                onChange={(e) => setPouchBarcode(e.target.value)}
                placeholder="RB-POUCH-34075"
                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                Bench Rework & Reassembly Certification Notes
              </label>
              <textarea
                rows={2}
                value={benchNotes}
                onChange={(e) => setBenchNotes(e.target.value)}
                placeholder="Describe parts replaced, calibration tolerances, hermetic seal confirmation..."
                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              style={{ padding: '12px 20px', fontSize: '13px' }}
            >
              Cancel
            </button>

            <button
              type="button"
              id="certify-qc-btn"
              disabled={loading}
              onClick={handleSubmit}
              className="btn-primary"
              style={{
                padding: '12px 24px',
                fontSize: '13px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Award size={18} />
              <span>{loading ? 'Certifying Cleanroom QC...' : 'Sign & Certify 12-Point QC Passport'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
