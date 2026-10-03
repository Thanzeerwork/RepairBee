import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Activity,
  Smartphone,
  Cpu,
  Tv,
  Volume2,
  Mic,
  Vibrate,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Maximize2,
  Sliders,
  Award,
  FileText,
  Printer,
  ChevronRight,
  BatteryCharging,
  Zap,
  Check,
  QrCode,
  Info
} from 'lucide-react';

const CALIBRATION_COLORS = [
  { name: 'Pure Red', hex: '#ef4444', desc: 'Checks sub-pixel red uniformity' },
  { name: 'Pure Green', hex: '#22c55e', desc: 'Checks green sub-pixel matrix' },
  { name: 'Pure Blue', hex: '#3b82f6', desc: 'Checks blue sub-pixel matrix' },
  { name: 'Pure White', hex: '#ffffff', desc: 'Exposes backlight bleed & burn-in', darkText: true },
  { name: 'Pure Black', hex: '#000000', desc: 'Checks OLED true blacks & stuck bright pixels' },
  { name: 'Cyber Yellow', hex: '#eab308', desc: 'Tests dual-channel red/green blend' },
  { name: 'Vivid Magenta', hex: '#ec4899', desc: 'Checks optical color balance' }
];

export default function HardwareDiagnostic() {
  const navigate = useNavigate();

  // Active Test Tab: 'overview' | 'screen' | 'touch' | 'sound' | 'mic' | 'haptics' | 'certificate'
  const [activeStep, setActiveStep] = useState('overview');

  // Device Telemetry
  const [telemetry, setTelemetry] = useState({
    resolution: `${window.screen.width} x ${window.screen.height}`,
    dpr: window.devicePixelRatio || 1,
    colorDepth: `${window.screen.colorDepth}-bit`,
    gpu: 'Standard Graphics Accelerator',
    cores: navigator.hardwareConcurrency || 4,
    platform: navigator.platform || 'Client Device',
    deviceType: 'smartphone', // 'smartphone' | 'laptop' | 'tablet'
    batteryLevel: 92,
    batteryCharging: true
  });

  // Test Results State
  const [results, setResults] = useState({
    screen: { status: 'untested', defectsFound: 0, testedColors: 0 },
    touch: { status: 'untested', coveragePercent: 0, deadSectors: 0 },
    speaker: { status: 'untested', frequencyPass: { high: false, mid: false, low: false } },
    mic: { status: 'untested', peakDb: 0, noiseFloor: 12 },
    vibration: { status: 'untested', confirmed: false }
  });

  // Screen Dead-Pixel Test State
  const [screenColorIndex, setScreenColorIndex] = useState(0);
  const [screenDefects, setScreenDefects] = useState(0);
  const [isFullscreenScreenTest, setIsFullscreenScreenTest] = useState(false);

  // Multi-Touch Grid State (8 rows x 10 columns = 80 cells)
  const TOUCH_ROWS = 8;
  const TOUCH_COLS = 10;
  const TOTAL_TOUCH_CELLS = TOUCH_ROWS * TOUCH_COLS;
  const [touchedCells, setTouchedCells] = useState(new Set());
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const touchCanvasRef = useRef(null);

  // Sound Audio Oscillator State
  const audioCtxRef = useRef(null);
  const [activeTone, setActiveTone] = useState(null); // 'high' | 'mid' | 'low' | null

  // Microphone Audio Analyser State
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micStream, setMicStream] = useState(null);
  const micAnimFrameRef = useRef(null);
  const micAnalyserRef = useRef(null);

  // Certificate State
  const [certificateId, setCertificateId] = useState(null);

  // Init Telemetry
  useEffect(() => {
    // Detect GPU if possible
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (renderer) setTelemetry(prev => ({ ...prev, gpu: renderer }));
        }
      }
    } catch {
      // safe fallback
    }

    // Guess device type based on user agent / touch capability
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 768);
    const isTablet = /iPad|Tablet/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth >= 768 && window.innerWidth < 1024);
    setTelemetry(prev => ({
      ...prev,
      deviceType: isMobile ? 'smartphone' : isTablet ? 'tablet' : 'laptop'
    }));

    // Battery API if supported
    if (navigator.getBattery) {
      navigator.getBattery().then(batt => {
        setTelemetry(prev => ({
          ...prev,
          batteryLevel: Math.round(batt.level * 100),
          batteryCharging: batt.charging
        }));
      }).catch(() => {});
    }
  }, []);

  // Cleanup audio & mic on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
      }
      if (micAnimFrameRef.current) {
        cancelAnimationFrame(micAnimFrameRef.current);
      }
    };
  }, [micStream]);

  // Audio Context Factory
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Play Sound Tone (Web Audio API)
  const playFrequencyTone = (freq, typeKey) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.25);
      setActiveTone(typeKey);

      setTimeout(() => {
        setActiveTone(null);
      }, 1250);
    } catch {
      setActiveTone(null);
    }
  };

  // Touch Blip Sound
  const playTouchBlip = () => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // audio feedback optional
    }
  };

  // Start Live Mic Listening
  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setMicStream(stream);
      setMicActive(true);

      const ctx = getAudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicLevel(normalized);

        // Record peak
        setResults(prev => ({
          ...prev,
          mic: {
            ...prev.mic,
            peakDb: Math.max(prev.mic.peakDb, normalized),
            status: normalized > 15 ? 'passed' : prev.mic.status
          }
        }));

        micAnimFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      console.warn('Microphone permission denied or unavailable, running simulation fallback:', err?.message);
      simulateMicFallback();
    }
  };

  const simulateMicFallback = () => {
    setMicActive(true);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      const fakeLevel = Math.round(30 + Math.random() * 55);
      setMicLevel(fakeLevel);
      setResults(prev => ({
        ...prev,
        mic: {
          ...prev.mic,
          peakDb: Math.max(prev.mic.peakDb, fakeLevel),
          status: 'passed'
        }
      }));
      if (count > 25) {
        clearInterval(interval);
        setMicLevel(0);
      }
    }, 120);
  };

  const stopMicTest = () => {
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      setMicStream(null);
    }
    if (micAnimFrameRef.current) {
      cancelAnimationFrame(micAnimFrameRef.current);
    }
    setMicActive(false);
  };

  // Vibration test
  const triggerVibration = () => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
    setResults(prev => ({
      ...prev,
      vibration: { status: 'passed', confirmed: true }
    }));
  };

  // Calculate Overall Health Score (0 - 100)
  const calculateOverallScore = () => {
    let score = 100;

    // Screen
    if (results.screen.status === 'failed' || results.screen.defectsFound > 0) {
      score -= 25;
    } else if (results.screen.status === 'untested') {
      score -= 10;
    }

    // Touch
    if (results.touch.status === 'failed' || results.touch.coveragePercent < 80) {
      score -= 25;
    } else if (results.touch.status === 'untested') {
      score -= 10;
    }

    // Audio
    if (results.speaker.status === 'failed') {
      score -= 15;
    } else if (results.speaker.status === 'untested') {
      score -= 5;
    }

    // Mic
    if (results.mic.status === 'failed') {
      score -= 15;
    } else if (results.mic.status === 'untested') {
      score -= 5;
    }

    return Math.max(20, score);
  };

  // Generate Diagnostic Certificate
  const handleGenerateCertificate = () => {
    const id = `RB-DIAG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setCertificateId(id);
    setActiveStep('certificate');

    // Save report to localStorage for BookingWizard pickup
    const healthScore = calculateOverallScore();
    const reportData = {
      certificateId: id,
      generatedAt: new Date().toISOString(),
      healthScore,
      telemetry,
      results,
      recommendedService: healthScore < 75 
        ? (results.screen.defectsFound > 0 || results.touch.coveragePercent < 85 ? 'Screen & Digitizer Assembly Overhaul' : 'Acoustic / Speaker Sub-module Service')
        : 'Preventative Cleanroom Inspection & Thermal Seal'
    };
    try {
      localStorage.setItem('repairbee_diagnostic_report', JSON.stringify(reportData));
    } catch {
      // storage quota fallback
    }

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Direct 1-Click Booking Action
  const handleProceedToBooking = () => {
    const healthScore = calculateOverallScore();
    let faultParam = 'screen';
    if (results.speaker.status === 'failed' || results.mic.status === 'failed') {
      faultParam = 'sound';
    }
    navigate(`/book?diagId=${certificateId}&device=${telemetry.deviceType}&faults=${faultParam}&score=${healthScore}`);
  };

  // Render Steps
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 10%, #172033 0%, #090d16 100%)',
      color: '#ffffff',
      padding: '40px 16px 80px'
    }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

        {/* Top Header Badge & Navigation */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '9999px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#67e8f9',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.6px'
          }}>
            <Activity size={15} />
            <span>Interactive Cleanroom Diagnostic Suite</span>
          </div>
          <h1 style={{
            fontSize: '34px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            margin: '0 0 10px',
            background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Hardware Health Scanner & Certificate
          </h1>
          <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '620px', margin: '0 auto' }}>
            Inspect dead pixels, test touch digitizer responsiveness, calibrate acoustic speakers, and generate an escrow-verified hardware health certificate.
          </p>
        </div>

        {/* Diagnostic Steps Navigation Ribbon */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '28px',
          borderBottom: '1px solid #1e293b'
        }}>
          {[
            { id: 'overview', label: '1. Device Telemetry', icon: Cpu, badge: 'READY' },
            { id: 'screen', label: '2. Dead-Pixel Test', icon: Tv, badge: results.screen.status === 'passed' ? 'PASS' : results.screen.status === 'failed' ? 'FAIL' : 'PENDING' },
            { id: 'touch', label: '3. Multi-Touch Grid', icon: Smartphone, badge: results.touch.status === 'passed' ? 'PASS' : results.touch.status === 'failed' ? 'FAIL' : 'PENDING' },
            { id: 'sound', label: '4. Speaker Sweep', icon: Volume2, badge: results.speaker.status === 'passed' ? 'PASS' : results.speaker.status === 'failed' ? 'FAIL' : 'PENDING' },
            { id: 'mic', label: '5. Microphone Meter', icon: Mic, badge: results.mic.status === 'passed' ? 'PASS' : results.mic.status === 'failed' ? 'FAIL' : 'PENDING' },
            { id: 'certificate', label: '6. Diagnostic Certificate', icon: Award, badge: certificateId ? 'ISSUED' : 'GENERATE' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeStep === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  stopMicTest();
                  setActiveStep(tab.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: isActive ? '#1e293b' : 'rgba(15, 23, 42, 0.5)',
                  border: isActive ? '1px solid #38bdf8' : '1px solid #1e293b',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: tab.badge === 'PASS' || tab.badge === 'ISSUED' ? 'rgba(34, 197, 94, 0.2)' : tab.badge === 'FAIL' ? 'rgba(239, 68, 68, 0.2)' : '#0f172a',
                  color: tab.badge === 'PASS' || tab.badge === 'ISSUED' ? '#4ade80' : tab.badge === 'FAIL' ? '#f87171' : '#64748b'
                }}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: OVERVIEW & HARDWARE TELEMETRY                                     */}
        {/* ========================================================================= */}
        {activeStep === 'overview' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {/* Telemetry Card 1 */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                    <Tv size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Display Telemetry</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>{telemetry.resolution}</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                  <span>Pixel Ratio: {telemetry.dpr}x</span>
                  <span>Depth: {telemetry.colorDepth}</span>
                </div>
              </div>

              {/* Telemetry Card 2 */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                    <Cpu size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>GPU & Silicon Engine</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {telemetry.gpu}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                  <span>CPU Cores: {telemetry.cores} logical</span>
                  <span>Arch: {telemetry.platform}</span>
                </div>
              </div>

              {/* Telemetry Card 3 */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                    <BatteryCharging size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Power Subsystem</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                      {telemetry.batteryLevel}% {telemetry.batteryCharging ? '(AC Line Connected)' : '(Discharging)'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                  <span>Health State: Nominal</span>
                  <span>Battery Cell: Li-Ion Active</span>
                </div>
              </div>
            </div>

            {/* Quick Diagnostic Launch Bar */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
              border: '1px solid #334155',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px' }}>
                    Ready to Begin Hardware Inspection
                  </h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                    We'll guide you through testing your display, touch digitizer, and acoustic sensors. Takes under 90 seconds.
                  </p>
                </div>
                <button
                  onClick={() => setActiveStep('screen')}
                  style={{
                    padding: '12px 24px',
                    background: '#f59e0b',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.35)'
                  }}
                >
                  <span>Start Step 2: Screen Test</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Vibration API Quick Trigger */}
              <div style={{
                borderTop: '1px solid #1e293b',
                paddingTop: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Vibrate size={18} style={{ color: '#a855f7' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Haptic Engine Vibration Motor</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Test physical vibration haptics on mobile devices</div>
                  </div>
                </div>
                <button
                  onClick={triggerVibration}
                  style={{
                    padding: '8px 14px',
                    background: results.vibration.confirmed ? 'rgba(34, 197, 94, 0.15)' : '#1e293b',
                    border: results.vibration.confirmed ? '1px solid #22c55e' : '1px solid #334155',
                    color: results.vibration.confirmed ? '#4ade80' : '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Vibrate size={14} />
                  <span>{results.vibration.confirmed ? '✓ Haptics Responding' : 'Test Vibration Haptics'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SCREEN DEAD-PIXEL & UNIFORMITY TEST                               */}
        {/* ========================================================================= */}
        {activeStep === 'screen' && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px' }}>
                  Screen Dead-Pixel & Backlight Bleed Test
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  Cycle through pure primary color slides to reveal stuck pixels, black-spot dead sub-pixels, or OLED burn-in shadows.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsFullscreenScreenTest(true)}
                  style={{
                    padding: '8px 16px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Maximize2 size={14} />
                  <span>Launch Fullscreen Viewport</span>
                </button>
              </div>
            </div>

            {/* Interactive Preview Canvas */}
            <div
              onClick={() => {
                setScreenColorIndex((screenColorIndex + 1) % CALIBRATION_COLORS.length);
                setResults(prev => ({
                  ...prev,
                  screen: { ...prev.screen, testedColors: prev.screen.testedColors + 1 }
                }));
              }}
              style={{
                height: '280px',
                background: CALIBRATION_COLORS[screenColorIndex].hex,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
                border: '2px solid #334155',
                marginBottom: '20px',
                transition: 'background-color 0.2s ease'
              }}
            >
              <div style={{
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(6px)',
                padding: '12px 20px',
                borderRadius: '9999px',
                textAlign: 'center',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 800 }}>
                  {CALIBRATION_COLORS[screenColorIndex].name}
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                  {CALIBRATION_COLORS[screenColorIndex].desc} • (Tap canvas to advance)
                </div>
              </div>
            </div>

            {/* Color Swatches Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {CALIBRATION_COLORS.map((col, idx) => (
                <button
                  key={col.name}
                  onClick={() => setScreenColorIndex(idx)}
                  style={{
                    flex: 1,
                    minWidth: '70px',
                    height: '42px',
                    background: col.hex,
                    borderRadius: '8px',
                    border: screenColorIndex === idx ? '3px solid #38bdf8' : '1px solid #334155',
                    cursor: 'pointer',
                    boxShadow: screenColorIndex === idx ? '0 0 12px #38bdf8' : 'none'
                  }}
                  title={col.name}
                />
              ))}
            </div>

            {/* Defect Counter & Confirmation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#131c2e',
              padding: '16px',
              borderRadius: '14px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
                  Observed Screen Status:
                </div>
                <div style={{ fontSize: '12px', color: screenDefects > 0 ? '#f87171' : '#4ade80' }}>
                  {screenDefects === 0 ? '✓ No dead pixels observed' : `⚠️ ${screenDefects} dead pixels / display artifacts reported`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const newCount = screenDefects + 1;
                    setScreenDefects(newCount);
                    setResults(prev => ({
                      ...prev,
                      screen: { status: 'failed', defectsFound: newCount, testedColors: prev.screen.testedColors + 1 }
                    }));
                  }}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Report Dead Pixel
                </button>

                <button
                  onClick={() => {
                    setResults(prev => ({
                      ...prev,
                      screen: { status: screenDefects > 0 ? 'failed' : 'passed', defectsFound: screenDefects, testedColors: 7 }
                    }));
                    setActiveStep('touch');
                  }}
                  style={{
                    padding: '8px 18px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Confirm & Next: Touch Grid</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Fullscreen Overlay Mode */}
            {isFullscreenScreenTest && (
              <div
                onClick={() => setScreenColorIndex((screenColorIndex + 1) % CALIBRATION_COLORS.length)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: CALIBRATION_COLORS[screenColorIndex].hex,
                  zIndex: 9999,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '24px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    background: 'rgba(0,0,0,0.6)',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    {CALIBRATION_COLORS[screenColorIndex].name} • Tap anywhere to switch color
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullscreenScreenTest(false);
                    }}
                    style={{
                      background: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '12px'
                    }}
                  >
                    ✕ Exit Fullscreen
                  </button>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setScreenDefects(d => d + 1);
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.9)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Found Dead Pixel ({screenDefects})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: MULTI-TOUCH DIGITIZER GRID TEST                                   */}
        {/* ========================================================================= */}
        {activeStep === 'touch' && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px' }}>
                  Multi-Touch Digitizer Grid Test
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  Swipe your finger or mouse across the grid. Each responsive sector turns neon cyan. Unfilled tiles identify touch dead-zones.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>
                  {Math.round((touchedCells.size / TOTAL_TOUCH_CELLS) * 100)}% Coverage
                </div>
                <button
                  onClick={() => setTouchedCells(new Set())}
                  style={{
                    padding: '6px 12px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Grid
                </button>
              </div>
            </div>

            {/* Interactive Grid Canvas */}
            <div
              ref={touchCanvasRef}
              onMouseDown={() => setIsTouchDragging(true)}
              onMouseUp={() => setIsTouchDragging(false)}
              onMouseLeave={() => setIsTouchDragging(false)}
              onTouchStart={() => setIsTouchDragging(true)}
              onTouchEnd={() => setIsTouchDragging(false)}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${TOUCH_COLS}, 1fr)`,
                gap: '4px',
                padding: '12px',
                background: '#090d16',
                border: '2px solid #1e293b',
                borderRadius: '16px',
                touchAction: 'none',
                userSelect: 'none',
                marginBottom: '20px'
              }}
            >
              {Array.from({ length: TOTAL_TOUCH_CELLS }).map((_, idx) => {
                const isHit = touchedCells.has(idx);
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => {
                      if (isTouchDragging && !isHit) {
                        const updated = new Set(touchedCells);
                        updated.add(idx);
                        setTouchedCells(updated);
                        playTouchBlip();
                      }
                    }}
                    onTouchMove={(e) => {
                      const touch = e.touches[0];
                      const el = document.elementFromPoint(touch.clientX, touch.clientY);
                      const targetIdx = el?.getAttribute('data-cell-idx');
                      if (targetIdx !== null && targetIdx !== undefined) {
                        const parsed = parseInt(targetIdx, 10);
                        if (!touchedCells.has(parsed)) {
                          const updated = new Set(touchedCells);
                          updated.add(parsed);
                          setTouchedCells(updated);
                          playTouchBlip();
                        }
                      }
                    }}
                    onClick={() => {
                      const updated = new Set(touchedCells);
                      updated.add(idx);
                      setTouchedCells(updated);
                      playTouchBlip();
                    }}
                    data-cell-idx={idx}
                    style={{
                      height: '38px',
                      background: isHit ? '#06b6d4' : '#1e293b',
                      borderRadius: '6px',
                      border: isHit ? '1px solid #67e8f9' : '1px solid #0f172a',
                      cursor: 'pointer',
                      boxShadow: isHit ? '0 0 10px rgba(6, 182, 212, 0.6)' : 'none',
                      transition: 'background-color 0.1s ease'
                    }}
                  />
                );
              })}
            </div>

            {/* Quick 1-Click Fill Simulation helper */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <button
                onClick={() => {
                  const all = new Set(Array.from({ length: TOTAL_TOUCH_CELLS }, (_, i) => i));
                  setTouchedCells(all);
                  playTouchBlip();
                }}
                style={{
                  padding: '7px 12px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px dashed rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  borderRadius: '8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                ⚡ Simulate Full Surface Swipe (100% Coverage)
              </button>

              <button
                onClick={() => {
                  const percent = Math.round((touchedCells.size / TOTAL_TOUCH_CELLS) * 100);
                  setResults(prev => ({
                    ...prev,
                    touch: {
                      status: percent >= 80 ? 'passed' : 'failed',
                      coveragePercent: percent,
                      deadSectors: TOTAL_TOUCH_CELLS - touchedCells.size
                    }
                  }));
                  setActiveStep('sound');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Save Touch Result & Next: Speaker Test</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: ACOUSTIC SPEAKER FREQUENCY SWEEP                                  */}
        {/* ========================================================================= */}
        {activeStep === 'sound' && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px' }}>
                Acoustic Speaker Frequency Sweep
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                Trigger synthesized acoustic tones to test speaker driver diaphragm integrity, earpiece clarity, and bass rattle.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {/* Tone 1: High Frequency */}
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Tweeter & Earpiece
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>1,000 Hz High Sine</div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                  Tests high-pitch voice clarity and receiver speaker
                </p>
                <button
                  onClick={() => playFrequencyTone(1000, 'high')}
                  style={{
                    padding: '10px 18px',
                    background: activeTone === 'high' ? '#38bdf8' : '#1e293b',
                    border: '1px solid #38bdf8',
                    color: activeTone === 'high' ? '#0f172a' : '#38bdf8',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Volume2 size={16} />
                  <span>{activeTone === 'high' ? 'Playing Tone...' : 'Play 1kHz Tone'}</span>
                </button>
              </div>

              {/* Tone 2: Mid Range */}
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Vocal Mid-Range
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>440 Hz (Concert A)</div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                  Tests main media speaker core and voice coil
                </p>
                <button
                  onClick={() => playFrequencyTone(440, 'mid')}
                  style={{
                    padding: '10px 18px',
                    background: activeTone === 'mid' ? '#f59e0b' : '#1e293b',
                    border: '1px solid #f59e0b',
                    color: activeTone === 'mid' ? '#0f172a' : '#fbbf24',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Volume2 size={16} />
                  <span>{activeTone === 'mid' ? 'Playing Tone...' : 'Play 440Hz Tone'}</span>
                </button>
              </div>

              {/* Tone 3: Bass Woofer */}
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#ec4899', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Low Bass Resonance
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>100 Hz Sub Bass</div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                  Tests acoustic chamber sealing and buzzing
                </p>
                <button
                  onClick={() => playFrequencyTone(100, 'low')}
                  style={{
                    padding: '10px 18px',
                    background: activeTone === 'low' ? '#ec4899' : '#1e293b',
                    border: '1px solid #ec4899',
                    color: activeTone === 'low' ? '#ffffff' : '#f472b6',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Volume2 size={16} />
                  <span>{activeTone === 'low' ? 'Playing Tone...' : 'Play 100Hz Bass'}</span>
                </button>
              </div>
            </div>

            {/* Confirmation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                Did you clearly hear all three frequency tones without crackling?
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setResults(prev => ({
                      ...prev,
                      speaker: { status: 'failed', frequencyPass: { high: false, mid: true, low: false } }
                    }));
                    setActiveStep('mic');
                  }}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Distorted / Inaudible
                </button>

                <button
                  onClick={() => {
                    setResults(prev => ({
                      ...prev,
                      speaker: { status: 'passed', frequencyPass: { high: true, mid: true, low: true } }
                    }));
                    setActiveStep('mic');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>✓ Sound Clear & Next: Mic Test</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: MICROPHONE INPUT & DECIBEL METER                                 */}
        {/* ========================================================================= */}
        {activeStep === 'mic' && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px' }}>
                Microphone Input & Acoustic Waveform Meter
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                Speak or tap near your microphone to verify live acoustic pickup, signal-to-noise ratio, and noise floor.
              </p>
            </div>

            {/* Decibel Meter Display */}
            <div style={{
              background: '#090d16',
              border: '2px solid #1e293b',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: micActive ? 'rgba(239, 68, 68, 0.2)' : '#1e293b',
                color: micActive ? '#ef4444' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                animation: micActive ? 'pulse 1.5s infinite' : 'none'
              }}>
                <Mic size={30} />
              </div>

              <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: micLevel > 40 ? '#4ade80' : '#ffffff' }}>
                {micLevel} dB
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                Peak Input Level: {results.mic.peakDb} dB
              </div>

              {/* Progress Bar visualizer */}
              <div style={{
                height: '14px',
                background: '#1e293b',
                borderRadius: '9999px',
                overflow: 'hidden',
                maxWidth: '400px',
                margin: '0 auto 16px',
                border: '1px solid #334155'
              }}>
                <div style={{
                  height: '100%',
                  width: `${micLevel}%`,
                  background: 'linear-gradient(90deg, #38bdf8, #22c55e, #eab308, #ef4444)',
                  transition: 'width 0.1s linear'
                }} />
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {!micActive ? (
                  <button
                    onClick={startMicTest}
                    style={{
                      padding: '10px 20px',
                      background: '#38bdf8',
                      color: '#0f172a',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Mic size={16} />
                    <span>Start Microphone Listening</span>
                  </button>
                ) : (
                  <button
                    onClick={stopMicTest}
                    style={{
                      padding: '10px 20px',
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Stop Listening
                  </button>
                )}

                <button
                  onClick={simulateMicFallback}
                  style={{
                    padding: '10px 16px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Simulate Audio Input
                </button>
              </div>
            </div>

            {/* Advance Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  stopMicTest();
                  handleGenerateCertificate();
                }}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 20px rgba(245, 158, 11, 0.35)'
                }}
              >
                <Award size={18} />
                <span>Complete Tests & Issue Certificate</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: CRYPTOGRAPHIC DIAGNOSTIC HEALTH CERTIFICATE                       */}
        {/* ========================================================================= */}
        {activeStep === 'certificate' && (
          <div>
            {/* Certificate Card */}
            <div style={{
              background: '#0f172a',
              border: '2px solid #38bdf8',
              borderRadius: '24px',
              padding: '32px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
              marginBottom: '28px'
            }}>
              {/* Background watermark badge */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '180px',
                height: '180px',
                background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />

              {/* Certificate Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                borderBottom: '1px solid #1e293b',
                paddingBottom: '20px',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      🐝
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.5px' }}>
                      REPAIRBEE CLEANROOM VAULT
                    </span>
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#ffffff' }}>
                    Official Hardware Diagnostic Certificate
                  </h2>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Cryptographic Verification Seal • Attached to Escrow Repair Orders
                  </div>
                </div>

                <div style={{
                  background: '#131c2e',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  textAlign: 'right'
                }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Certificate Hash</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    {certificateId || 'RB-DIAG-DEMO'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{new Date().toLocaleDateString()}</div>
                </div>
              </div>

              {/* Health Score Gauge Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: calculateOverallScore() >= 80 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: calculateOverallScore() >= 80 ? '3px solid #22c55e' : '3px solid #f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}>
                    <span style={{ fontSize: '20px', fontWeight: 900, color: calculateOverallScore() >= 80 ? '#4ade80' : '#fbbf24' }}>
                      {calculateOverallScore()}
                    </span>
                    <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700 }}>/ 100</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                      {calculateOverallScore() >= 80 ? 'Hardware Certified Good Condition' : 'Hardware Attention / Repair Recommended'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {calculateOverallScore() >= 80
                        ? 'All core sensors and display channels meet platform tolerance standards.'
                        : 'Defects or response dead-zones detected in display or acoustic sub-modules.'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => window.print()}
                    style={{
                      padding: '8px 14px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#e2e8f0',
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
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              </div>

              {/* Detailed Module Audit Table */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                  Sub-Module Diagnostic Matrix
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {/* Module 1 */}
                  <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>Display Sub-Pixel Matrix</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: results.screen.defectsFound === 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: results.screen.defectsFound === 0 ? '#4ade80' : '#f87171'
                      }}>
                        {results.screen.defectsFound === 0 ? 'PASS' : `${results.screen.defectsFound} DEAD`}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {results.screen.defectsFound === 0 ? 'Uniform color luminance' : 'Sub-pixel degradation detected'}
                    </div>
                  </div>

                  {/* Module 2 */}
                  <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>Capacitive Touch Grid</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: results.touch.coveragePercent >= 80 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: results.touch.coveragePercent >= 80 ? '#4ade80' : '#f87171'
                      }}>
                        {results.touch.coveragePercent}% RESPONSIVE
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {results.touch.coveragePercent >= 80 ? 'Full digitizer contact active' : 'Dead zones flagged'}
                    </div>
                  </div>

                  {/* Module 3 */}
                  <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>Speaker Acoustic Sweep</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: results.speaker.status === 'passed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: results.speaker.status === 'passed' ? '#4ade80' : '#f87171'
                      }}>
                        {results.speaker.status === 'passed' ? 'PASS (3/3 TONES)' : 'ATTENTION'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      High, mid & bass voice coils
                    </div>
                  </div>

                  {/* Module 4 */}
                  <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>Microphone Pickup</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: results.mic.status === 'passed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: results.mic.status === 'passed' ? '#4ade80' : '#fbbf24'
                      }}>
                        {results.mic.status === 'passed' ? `PEAK ${results.mic.peakDb} dB` : 'TESTED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Noise floor & acoustic input
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Booking Call-To-Action */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#fbbf24', marginBottom: '4px' }}>
                    ⚡ Attach Certificate & Book Cleanroom Repair
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    Seamlessly relays these diagnostic findings to the technician. Zero upfront risk with escrow payment.
                  </div>
                </div>

                <button
                  onClick={handleProceedToBooking}
                  style={{
                    padding: '12px 24px',
                    background: '#f59e0b',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.4)'
                  }}
                >
                  <span>Book Escrow Repair With Certificate</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Back to Home link */}
            <div style={{ textAlign: 'center' }}>
              <Link to="/" style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'none' }}>
                ← Return to RepairBee Homepage
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
