import React, { useState } from 'react';
import { workshopApi } from '../api/client';
import confetti from 'canvas-confetti';
import {
  X,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Play,
  Pause,
  Clock,
  Sparkles,
  Award,
  Video,
  Plus,
  Trash2,
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react';

const BENCH_PRESETS = [
  {
    id: 'macbook_logic',
    title: 'Apple MacBook Pro M2 Logic Board BGA Micro-Soldering',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 95,
    resolution: '1080p 60fps 40x Microscope',
    checkpoints: [
      { time_seconds: 12, title: 'ESD Grounding & Barcode Seal Verification', badge: 'Tamper Ingress Check', description: 'Verification of tamper-evident bag seal and device IMEI serial match.', pass: true },
      { time_seconds: 38, title: 'Precision Disassembly & Micro-Soldering', badge: 'OEM Flex Cable Repair', description: 'Component isolation, thermal camera scanning at 38.5°C, OEM display flex cable alignment under 40x microscope.', pass: true },
      { time_seconds: 65, title: 'Authentic Component Serial Pairing', badge: 'Cryptographic Part Match', description: 'OEM replacement matrix firmware handshake verified without error code.', pass: true },
      { time_seconds: 85, title: 'Bench Post-Repair Power-On & Display Diagnostics', badge: '100% Touch Calibration', description: '12-point touch digitizer grid test and 120Hz display refresh passed.', pass: true }
    ]
  },
  {
    id: 'iphone_oled',
    title: 'iPhone OLED Matrix & TrueTone Digitizer Calibration',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 120,
    resolution: '1080p 60fps Cleanroom Bay 4',
    checkpoints: [
      { time_seconds: 15, title: 'Anti-Static Pouch Seal Verification', badge: 'Ingress Inspection', description: 'Seal integrity confirmed on camera with customer pouch barcode.', pass: true },
      { time_seconds: 45, title: 'OEM OLED Digitizer Firmware Handshake', badge: 'TrueTone EEPROM Sync', description: 'Original ambient light and TrueTone cryptographic keys transferred to new panel.', pass: true },
      { time_seconds: 80, title: 'Water-Resistant Gasket Re-application', badge: 'IP68 Seal Compression', description: 'Precision die-cut adhesive applied with pneumatic pressure clamp.', pass: true },
      { time_seconds: 105, title: 'Bench Diagnostic Test Suite Completion', badge: '100% Capacitive Touch', description: 'Capacitive touch grid, haptic motor, and speaker sweep passed.', pass: true }
    ]
  }
];

export default function CleanroomVideoProofModal({
  order,
  isOpen,
  onClose,
  onSuccess
}) {
  if (!isOpen || !order) return null;

  const [selectedPreset, setSelectedPreset] = useState(BENCH_PRESETS[0]);
  const [videoUrl, setVideoUrl] = useState(BENCH_PRESETS[0].url);
  const [videoDuration, setVideoDuration] = useState(BENCH_PRESETS[0].duration);
  const [technicianName, setTechnicianName] = useState('Vikram Sen');
  const [technicianId, setTechnicianId] = useState('RB-TECH-041');
  const [workbenchBay, setWorkbenchBay] = useState('Bay #4 • Precision ESD Micro-Soldering Bench');
  const [cleanroomStandard, setCleanroomStandard] = useState('ISO 14644-1 Class 7 Certified Anti-Static Environment');
  const [roomTempC, setRoomTempC] = useState(21.4);
  const [humidityPct, setHumidityPct] = useState(42);
  const [esdGroundMv, setEsdGroundMv] = useState(0.05);
  const [benchNotes, setBenchNotes] = useState('Cleanroom bench micro-soldering and thermal profiling certified with 4 inspection checkpoints.');
  const [checkpoints, setCheckpoints] = useState(BENCH_PRESETS[0].checkpoints);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setVideoUrl(preset.url);
    setVideoDuration(preset.duration);
    setCheckpoints(preset.checkpoints);
  };

  const handleCheckpointChange = (idx, field, val) => {
    const updated = [...checkpoints];
    updated[idx] = { ...updated[idx], [field]: val };
    setCheckpoints(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        videoUrl,
        videoDurationSeconds: videoDuration,
        resolution: selectedPreset.resolution || '1080p 60fps Cleanroom Bench Stream',
        technicianName,
        technicianId,
        workbenchBay,
        cleanroomStandard,
        roomTempC: parseFloat(roomTempC),
        humidityPct: parseFloat(humidityPct),
        esdGroundVoltageMv: parseFloat(esdGroundMv),
        benchNotes,
        checkpoints
      };

      const res = await workshopApi.saveVideoProof(order.id, payload);
      confetti({ particleCount: 50, spread: 70 });
      if (onSuccess) onSuccess(res?.data?.videoProofVault || res?.videoProofVault || payload);
      onClose();
    } catch (err) {
      console.error('Failed to save cleanroom video proof:', err);
      setErrorMsg(err?.message || 'Failed to save cleanroom video proof.');
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
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#0f172a',
        color: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        position: 'relative'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #0b1329, #1e293b)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Video size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                Certify Cleanroom Repair Video Proof
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Order #{order.id?.slice(0, 8).toUpperCase()} • {order.product_name} • {order.customer_name}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#f87171',
              fontSize: '12px'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Select Bench Footage Preset */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px', display: 'block' }}>
              Select Cleanroom Workbench Recorded Footage:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {BENCH_PRESETS.map(preset => (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    background: selectedPreset.id === preset.id ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                    border: selectedPreset.id === preset.id ? '1.5px solid #38bdf8' : '1px solid #334155',
                    borderRadius: '10px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                    {preset.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {preset.resolution} • {preset.duration}s length
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Video Stream Preview */}
          <div style={{ background: '#000000', borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155', position: 'relative' }}>
            <video
              src={videoUrl}
              muted
              autoPlay
              loop
              playsInline
              style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              background: 'rgba(0,0,0,0.7)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              color: '#34d399',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700
            }}>
              ● BENCH CAMERA FEED READY
            </div>
          </div>

          {/* Metrology & Environment Telemetry */}
          <div style={{ background: '#131c2e', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} />
              <span>Cleanroom Bench Metrology & Environmental Calibration</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '10px', color: '#94a3b8' }}>BENCH TEMP (°C):</label>
                <input
                  type="number"
                  step="0.1"
                  value={roomTempC}
                  onChange={e => setRoomTempC(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#ffffff', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: '#94a3b8' }}>HUMIDITY (%):</label>
                <input
                  type="number"
                  value={humidityPct}
                  onChange={e => setHumidityPct(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#ffffff', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: '#94a3b8' }}>ESD GROUND (mV):</label>
                <input
                  type="number"
                  step="0.01"
                  value={esdGroundMv}
                  onChange={e => setEsdGroundMv(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#ffffff', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Inspection Checkpoints Table */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#cbd5e1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="#fbbf24" />
              <span>Timestamped Footage Checkpoints ({checkpoints.length}):</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {checkpoints.map((cp, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr 90px',
                    gap: '10px',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>SEC:</span>
                    <input
                      type="number"
                      value={cp.time_seconds}
                      onChange={e => handleCheckpointChange(idx, 'time_seconds', parseInt(e.target.value, 10))}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', padding: '4px', color: '#38bdf8', fontWeight: 700, fontSize: '11px', textAlign: 'center' }}
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={cp.title}
                      onChange={e => handleCheckpointChange(idx, 'title', e.target.value)}
                      placeholder="Checkpoint title"
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', color: '#ffffff', fontWeight: 700, fontSize: '11px', marginBottom: '4px' }}
                    />
                    <input
                      type="text"
                      value={cp.description}
                      onChange={e => handleCheckpointChange(idx, 'description', e.target.value)}
                      placeholder="Detailed observation"
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', color: '#94a3b8', fontSize: '10px' }}
                    />
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle2 size={12} />
                      PASSED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technician Credentials & SHA-256 Assurance */}
          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '11px',
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Lock size={18} color="#38bdf8" />
            <div>
              <strong>Cryptographic Verification Guarantee:</strong> Publishing this video proof generates an immutable SHA-256 tamper-proof hash and attaches an official Cleanroom Repair Proof Certificate accessible by the customer and platform auditors.
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 18px',
                background: '#1e293b',
                color: '#cbd5e1',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
              }}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={16} />}
              <span>{loading ? 'Certifying Footage...' : 'Publish to Customer Proof Vault'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
