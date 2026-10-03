import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Award,
  Lock,
  Cpu,
  Zap,
  Eye,
  FileText,
  Copy,
  Check,
  Sparkles,
  Printer,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

const SAMPLE_BENCH_VIDEOS = [
  {
    id: 'microsolder',
    title: 'ESD Micro-Soldering & BGA Logic Repair',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 95
  },
  {
    id: 'oled_screen',
    title: 'Precision OLED Matrix Serial Pairing',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 120
  }
];

export default function CleanroomVideoPlayer({
  videoProof,
  orderId,
  productName = 'Electronics Device',
  compact = false
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(videoProof?.videoDurationSeconds || 95);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [activeCheckpointIndex, setActiveCheckpointIndex] = useState(0);
  const [copiedHash, setCopiedHash] = useState(false);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);

  // Normalize video proof data
  const vault = videoProof || {};
  const videoUrl = vault.videoUrl || SAMPLE_BENCH_VIDEOS[0].url;
  const technicianName = vault.technicianName || 'Vikram Sen';
  const technicianId = vault.technicianId || 'RB-TECH-041';
  const workbenchBay = vault.workbenchBay || 'Bay #4 • Precision ESD Micro-Soldering Bench';
  const facility = vault.facility || 'Fix It Electronics Authorized Cleanroom Workbench';
  const cleanroomStandard = vault.cleanroomStandard || 'ISO 14644-1 Class 7 Certified Anti-Static Environment';
  const certificateId = vault.certificateId || `CERT-VPF-${(orderId || 'DEMO').slice(0, 8).toUpperCase()}`;
  const vaultId = vault.vaultId || `VPF-RB-${(orderId || 'DEMO').slice(0, 8).toUpperCase()}`;
  const tamperProofSha256 = vault.tamperProofSha256 || '8f4c2b9a71d6e350cfa8201b5e39d4812fbc94017a63ec20d18f512bc804192b';
  const recordedAt = vault.recordedAt ? new Date(vault.recordedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
  const metrology = vault.metrology || { roomTempC: 21.4, humidityPct: 42, esdGroundVoltageMv: 0.05 };

  const checkpoints = vault.checkpoints && vault.checkpoints.length > 0 ? vault.checkpoints : [
    {
      time_seconds: 12,
      title: 'ESD Grounding & Barcode Seal Verification',
      badge: 'Tamper Ingress Check',
      description: 'Verification of tamper-evident bag seal and device IMEI serial match on logic board.',
      pass: true
    },
    {
      time_seconds: 38,
      title: 'Precision Disassembly & Micro-Soldering',
      badge: 'OEM Flex Cable Repair',
      description: 'Micro-soldering inspection under 40x microscope with thermal scan at 38.5°C.',
      pass: true
    },
    {
      time_seconds: 65,
      title: 'Authentic Component Serial Pairing',
      badge: 'Cryptographic Part Match',
      description: 'OEM replacement matrix firmware handshake verified without error codes.',
      pass: true
    },
    {
      time_seconds: 85,
      title: 'Bench Post-Repair Power-On & Display Diagnostics',
      badge: '100% Touch Calibration',
      description: '12-point touch digitizer grid test and 120Hz display refresh passed.',
      pass: true
    }
  ];

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(e => console.warn('Video play error:', e));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Update active checkpoint
    for (let i = checkpoints.length - 1; i >= 0; i--) {
      if (cur >= checkpoints[i].time_seconds - 1) {
        setActiveCheckpointIndex(i);
        break;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 95);
    }
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const target = parseFloat(e.target.value);
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const jumpToCheckpoint = (sec, idx) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = sec;
    setCurrentTime(sec);
    setActiveCheckpointIndex(idx);
    if (!isPlaying) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const changePlaybackRate = (rate) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const copyDigest = () => {
    navigator.clipboard.writeText(tamperProofSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formatSec = (s) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{
      background: '#0a0f1d',
      border: '1px solid rgba(56, 189, 248, 0.3)',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.1)',
      color: '#f8fafc',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Top Video Header */}
      <div style={{
        background: 'linear-gradient(90deg, #0f172a, #1e293b)',
        padding: '12px 18px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Eye size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>
                CLEANROOM REPAIR VIDEO PROOF VAULT
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ShieldCheck size={11} />
                TAMPER EVIDENT • SHA-256
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {workbenchBay} • Technician: <strong style={{ color: '#e2e8f0' }}>{technicianName}</strong> ({technicianId})
            </div>
          </div>
        </div>

        <button
          onClick={() => setCertificateModalOpen(true)}
          style={{
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '8px',
            padding: '6px 12px',
            color: '#38bdf8',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <Award size={13} />
          <span>Proof Certificate</span>
        </button>
      </div>

      {/* Interactive Video Viewport Container */}
      <div style={{ position: 'relative', background: '#000000', width: '100%', aspectRatio: '16/9', maxHeight: '420px', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          muted={isMuted}
          playsInline
          loop
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={togglePlay}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            cursor: 'pointer'
          }}
        />

        {/* Cleanroom Metrology HUD Overlay (Top) */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '8px 14px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: '#94a3b8',
          pointerEvents: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isPlaying ? '#22c55e' : '#f59e0b',
              boxShadow: isPlaying ? '0 0 8px #22c55e' : '0 0 8px #f59e0b',
              display: 'inline-block'
            }} />
            <span style={{ color: '#ffffff', fontWeight: 700 }}>
              {isPlaying ? 'LIVE PROOF PLAYBACK' : 'PAUSED'} [1080P 60FPS]
            </span>
            <span style={{ color: '#38bdf8' }}>• {cleanroomStandard}</span>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <span>TEMP: <strong style={{ color: '#fbbf24' }}>{metrology.roomTempC || 21.4}°C</strong></span>
            <span>HUM: <strong style={{ color: '#38bdf8' }}>{metrology.humidityPct || 42}%</strong></span>
            <span>ESD: <strong style={{ color: '#34d399' }}>{metrology.esdGroundVoltageMv || 0.05}mV</strong></span>
          </div>
        </div>

        {/* Active Checkpoint Watermark Overlay (Bottom Center/Right) */}
        {checkpoints[activeCheckpointIndex] && (
          <div style={{
            position: 'absolute',
            bottom: '50px',
            right: '16px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '8px',
            padding: '6px 12px',
            maxWidth: '320px',
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)'
          }}>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.05em' }}>
              CURRENT INSPECTION CHECKPOINT
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
              {checkpoints[activeCheckpointIndex].title}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', lineHeight: 1.3 }}>
              {checkpoints[activeCheckpointIndex].description}
            </div>
          </div>
        )}

        {/* Center Play Overlay Icon when paused */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '2px solid #38bdf8',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(56, 189, 248, 0.4)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Play size={28} style={{ marginLeft: '4px' }} />
          </div>
        )}

        {/* Floating Custom Scrubber Controls Bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '8px 14px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {/* Progress Seek Bar with Checkpoint Markers */}
          <div style={{ position: 'relative', width: '100%', height: '8px', display: 'flex', alignItems: 'center' }}>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              style={{
                width: '100%',
                height: '4px',
                accentColor: '#38bdf8',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '4px'
              }}
            />

            {/* Checkpoint Dots on Scrubber */}
            {checkpoints.map((cp, idx) => {
              const leftPercent = Math.min(100, (cp.time_seconds / (duration || 95)) * 100);
              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    jumpToCheckpoint(cp.time_seconds, idx);
                  }}
                  title={`${cp.title} (${formatSec(cp.time_seconds)})`}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: activeCheckpointIndex === idx ? '#38bdf8' : '#fbbf24',
                    border: '1.5px solid #0f172a',
                    cursor: 'pointer',
                    zIndex: 10,
                    boxShadow: activeCheckpointIndex === idx ? '0 0 8px #38bdf8' : 'none'
                  }}
                />
              );
            })}
          </div>

          {/* Player Bottom Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={togglePlay}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px'
                }}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                onClick={() => jumpToCheckpoint(0, 0)}
                title="Restart"
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <RotateCcw size={15} />
              </button>

              <button
                onClick={toggleMute}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                {formatSec(currentTime)} / {formatSec(duration)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Playback speed pills */}
              <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', padding: '2px' }}>
                {[0.5, 1, 1.5, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => changePlaybackRate(speed)}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: playbackRate === speed ? '#38bdf8' : 'transparent',
                      color: playbackRate === speed ? '#0f172a' : '#94a3b8',
                      border: 'none',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              <button
                onClick={toggleFullscreen}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Checkpoints Timeline Scrubber */}
      <div style={{ padding: '16px 18px', background: '#0a0f1d' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#38bdf8" />
            <span>Interactive Bench Checkpoints ({checkpoints.length})</span>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Click any checkpoint to inspect the exact bench operation frame
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {checkpoints.map((cp, idx) => {
            const isActive = activeCheckpointIndex === idx;
            return (
              <div
                key={idx}
                onClick={() => jumpToCheckpoint(cp.time_seconds, idx)}
                style={{
                  background: isActive ? 'rgba(56, 189, 248, 0.12)' : '#111827',
                  border: isActive ? '1.5px solid #38bdf8' : '1px solid #1f2937',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    color: isActive ? '#38bdf8' : '#fbbf24',
                    background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                    padding: '1px 6px',
                    borderRadius: '4px'
                  }}>
                    {formatSec(cp.time_seconds)}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: cp.pass ? '#34d399' : '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <CheckCircle2 size={11} />
                    PASSED
                  </span>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>
                  {cp.title}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.3 }}>
                  {cp.badge}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cryptographic SHA-256 Tamper Proof Bar */}
      <div style={{
        background: '#090d16',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={14} color="#34d399" />
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            SHA-256 Digest: <span style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 700 }}>{tamperProofSha256.slice(0, 16)}...{tamperProofSha256.slice(-8)}</span>
          </div>
          <button
            onClick={copyDigest}
            title="Copy full cryptographic digest"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              padding: '3px 6px',
              color: copiedHash ? '#34d399' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px'
            }}
          >
            {copiedHash ? <Check size={11} /> : <Copy size={11} />}
            <span>{copiedHash ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
          Certified at: <span style={{ color: '#cbd5e1' }}>{recordedAt}</span>
        </div>
      </div>

      {/* Modal: Official Cleanroom Repair Proof Certificate */}
      {certificateModalOpen && (
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
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            border: '8px solid #0f172a'
          }}>
            <button
              onClick={() => setCertificateModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} color="#475569" />
            </button>

            {/* Certificate Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', border: '1px solid #10b981', padding: '4px 12px', borderRadius: '20px', color: '#059669', fontSize: '11px', fontWeight: 800, marginBottom: '8px' }}>
                <ShieldCheck size={14} />
                <span>OFFICIAL VERIFIED CLEANROOM REPAIR CERTIFICATE</span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                REPAIRBEE TRUST VERIFICATION PROTOCOL
              </h2>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Certificate ID: <strong style={{ color: '#0f172a', fontFamily: 'var(--font-mono)' }}>{certificateId}</strong> • Vault ID: <strong style={{ color: '#0f172a', fontFamily: 'var(--font-mono)' }}>{vaultId}</strong>
              </div>
            </div>

            {/* Device & Shop Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', fontSize: '12px' }}>
              <div>
                <div style={{ color: '#64748b' }}>DEVICE UNDER BENCH:</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{productName}</div>
                <div style={{ color: '#64748b', marginTop: '6px' }}>ORDER REFERENCE:</div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>#{orderId || 'DEMO-ORDER'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>AUTHORIZED FACILITY:</div>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{facility}</div>
                <div style={{ color: '#64748b', marginTop: '6px' }}>LEAD TECHNICIAN:</div>
                <div style={{ fontWeight: 700 }}>{technicianName} ({technicianId})</div>
              </div>
            </div>

            {/* Checkpoints Checklist */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                VERIFIED BENCH FOOTAGE CHECKPOINTS:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {checkpoints.map((cp, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                        {formatSec(cp.time_seconds)}
                      </span>
                      <div>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{cp.title}</span>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{cp.description}</div>
                      </div>
                    </div>
                    <span style={{ color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                      <CheckCircle2 size={14} />
                      PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic Seal Box */}
            <div style={{ background: '#0f172a', color: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 800, marginBottom: '4px' }}>
                <Lock size={14} />
                <span>CRYPTOGRAPHIC SHA-256 TAMPER-PROOF DIGEST</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all', color: '#e2e8f0' }}>
                {tamperProofSha256}
              </div>
              <div style={{ marginTop: '8px', color: '#94a3b8', fontSize: '10px' }}>
                Bench Metrology: Temp {metrology.roomTempC || 21.4}°C • Humidity {metrology.humidityPct || 42}% • ESD Ground {metrology.esdGroundVoltageMv || 0.05}mV • {cleanroomStandard}
              </div>
            </div>

            {/* Certificate Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Recorded & Sealed: {recordedAt}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    padding: '8px 16px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={14} />
                  <span>Print Certificate</span>
                </button>
                <button
                  onClick={() => setCertificateModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#e2e8f0',
                    color: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
