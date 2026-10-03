import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRunnerAuth } from '../context/RunnerAuthContext';
import { deliveriesApi } from '../api/client';
import confetti from 'canvas-confetti';
import NotificationCenter from '../components/NotificationCenter';
import RunnerNavigationHUD from '../components/RunnerNavigationHUD';
import {
  Truck,
  ShieldCheck,
  QrCode,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Navigation,
  LogOut,
  Sparkles,
  Package,
  Camera,
  Check,
  Layers,
  ArrowRight,
  ExternalLink,
  Lock,
  BatteryCharging,
  Sliders,
  DollarSign,
  Zap,
  Shield,
  Award,
  Star,
  Compass,
  CheckCircle,
  Home,
  Briefcase
} from 'lucide-react';

const getRunnerStepIndex = (job) => {
  const isReturn = job.leg_type === 'return' || job.dispatch_type === 'return' || ['repair_completed', 'quality_check', 'assigned_delivery', 'out_for_delivery'].includes(job.order_status);
  const s = job.order_status || job.status;
  if (isReturn) {
    if (s === 'out_for_delivery' || s === 'assigned') return 1;
    if (s === 'delivery_confirmed' || s === 'delivered' || s === 'completed') return 3;
    return 0;
  }
  // Pickup leg:
  if (s === 'partner_assigned') return 0;
  if (s === 'out_for_pickup') return 1;
  if (s === 'picked_up') return 2;
  if (['received_at_shop', 'diagnosing', 'quote_sent', 'quote_approved', 'in_repair', 'quality_check', 'repair_completed', 'completed'].includes(s)) return 3;
  return 0;
};

export default function RunnerPortal() {
  const navigate = useNavigate();
  const { runnerUser, isRunnerAuthenticated, quickLoginRunner, logoutRunner } = useRunnerAuth();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'available' | 'history'
  const [availableFilter, setAvailableFilter] = useState('all'); // 'all' | 'vip' | 'return'
  const [activeJobs, setActiveJobs] = useState([]);
  const [availablePickups, setAvailablePickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  // Scanner & Handover Modal State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [pouchBarcode, setPouchBarcode] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isScanning, setIsScanning] = useState(false);
  const [checklist, setChecklist] = useState({
    poweredDown: true,
    simRemoved: true,
    antiStatic: true,
    tamperSealed: true
  });
  const [runnerNotes, setRunnerNotes] = useState('Device placed in anti-static bag, tamper tape sealed with customer present.');

  // Delivery OTP modal for return leg
  const [deliveryOtpOpen, setDeliveryOtpOpen] = useState(false);
  const [delOtp, setDelOtp] = useState(['', '', '', '', '', '']);

  // Navigation HUD active job ID
  const [expandedNavJobId, setExpandedNavJobId] = useState(null);

  // Fetch jobs
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setActionError('');

      if (!isRunnerAuthenticated) {
        await quickLoginRunner();
      }

      const [jobsRes, availRes] = await Promise.all([
        deliveriesApi.getMyJobs(),
        deliveriesApi.getAvailablePickups()
      ]);

      const myJobs = jobsRes?.data?.jobs || jobsRes?.data || [];
      const avail = availRes?.data || [];

      const jobsList = Array.isArray(myJobs) ? myJobs : [];
      setActiveJobs(jobsList);
      setAvailablePickups(Array.isArray(avail) ? avail : []);

      // Auto-expand turn-by-turn HUD on first pending run if none selected
      const firstActive = jobsList.find(j => j.status !== 'delivered' && j.order_status !== 'cancelled');
      if (firstActive && !expandedNavJobId) {
        setExpandedNavJobId(firstActive.id);
      }
    } catch (err) {
      console.error('Failed to load courier data:', err);
      setActionError(err?.message || 'Error communicating with logistics server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [isRunnerAuthenticated]);

  // Handle claiming a run from available pickups
  const handleClaimRun = async (orderId) => {
    setActionLoading(true);
    setActionMsg('');
    setActionError('');
    try {
      const res = await deliveriesApi.claimPickup(orderId);
      setActionMsg(res?.message || 'Pickup run claimed! Head to customer doorstep.');
      setActiveTab('active');
      await fetchAllData();
    } catch (err) {
      setActionError(err?.message || 'Failed to claim run');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle generic status update (e.g. en route to customer)
  const handleUpdateDeliveryStatus = async (jobId, newStatus) => {
    setActionLoading(true);
    setActionMsg('');
    setActionError('');
    try {
      await deliveriesApi.updateStatus(jobId, newStatus, 4.2);
      setActionMsg(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      await fetchAllData();
    } catch (err) {
      setActionError(err?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Scanner Modal for a specific job
  const openScannerForJob = (job) => {
    setSelectedJob(job);
    const suggestedBarcode = job.order_pouch_barcode || `RB-POUCH-${Math.floor(10000 + Math.random() * 90000)}`;
    setPouchBarcode(suggestedBarcode);
    setOtp(['', '', '', '', '', '']);
    setScannerOpen(true);
  };

  // Simulate laser barcode scanning
  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const newBarcode = `RB-POUCH-${Math.floor(10000 + Math.random() * 90000)}`;
      setPouchBarcode(newBarcode);
      setIsScanning(false);
      try {
        navigator.vibrate?.(100);
      } catch {}
    }, 1200);
  };

  // Handle OTP digit input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pasted.forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      const nextInput = document.getElementById(`otp-input-${Math.min(pasted.length, 5)}`);
      nextInput?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Submit Pouch Barcode & Customer OTP
  const handleVerifyPouchPickup = async () => {
    if (!selectedJob) return;
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setActionError('Please enter the full 6-digit Customer Handover OTP');
      return;
    }
    if (!pouchBarcode.trim()) {
      setActionError('Please scan or enter a tamper pouch barcode');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      const res = await deliveriesApi.verifyPickup(selectedJob.id, {
        pouch_barcode: pouchBarcode,
        otp: enteredOtp,
        notes: runnerNotes
      });

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });

      setActionMsg(`✓ Tamper Pouch #${pouchBarcode} verified & sealed! Order transitioned to Picked Up.`);
      setScannerOpen(false);
      await fetchAllData();
    } catch (err) {
      setActionError(err?.message || 'Verification failed. Please check the customer OTP.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handover to Workshop Desk
  const handleWorkshopHandover = async (jobId) => {
    setActionLoading(true);
    setActionMsg('');
    setActionError('');
    try {
      const res = await deliveriesApi.handoverShop(jobId, {
        notes: 'Tamper seal verified intact at Fix It Electronics cleanroom intake bench.'
      });
      setActionMsg(res?.message || 'Order successfully received at partner cleanroom!');
      await fetchAllData();
    } catch (err) {
      setActionError(err?.message || 'Workshop handover failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Push Live GPS coordinates with realistic route waypoint stepping
  const handleSimulateGps = async (job) => {
    setActionLoading(true);
    setActionError('');
    try {
      const jobId = job.id || job;
      const jobObj = typeof job === 'object' ? job : activeJobs.find(j => j.id === jobId) || {};

      const isPickup = jobObj.leg_type === 'pickup' || (!jobObj.leg_type && jobObj.dispatch_type !== 'return' && !['repair_completed', 'quality_check', 'assigned_delivery', 'out_for_delivery'].includes(jobObj.order_status));
      const currentStatus = jobObj.order_status || jobObj.status;
      
      let targetLat = 12.9352;
      let targetLng = 77.6245;
      let targetLabel = 'Customer Doorstep';

      if (isPickup && currentStatus === 'picked_up') {
        targetLat = Number(jobObj.shop_lat) || 12.9716;
        targetLng = Number(jobObj.shop_lng) || 77.5946;
        targetLabel = 'Cleanroom Workshop (MG Road)';
      } else if (!isPickup) {
        targetLat = Number(jobObj.delivery_lat || jobObj.pickup_lat) || 12.9352;
        targetLng = Number(jobObj.delivery_lng || jobObj.pickup_lng) || 77.6245;
        targetLabel = 'Customer Doorstep';
      } else {
        targetLat = Number(jobObj.pickup_lat) || 12.9352;
        targetLng = Number(jobObj.pickup_lng) || 77.6245;
        targetLabel = 'Customer Doorstep';
      }

      const currLat = Number(jobObj.current_lat) || 12.9550;
      const currLng = Number(jobObj.current_lng) || 77.6100;

      // Advance 25% closer towards target
      const stepFactor = 0.25;
      const jitterLat = (Math.random() - 0.5) * 0.0006;
      const jitterLng = (Math.random() - 0.5) * 0.0006;
      const nextLat = parseFloat((currLat + (targetLat - currLat) * stepFactor + jitterLat).toFixed(5));
      const nextLng = parseFloat((currLng + (targetLng - currLng) * stepFactor + jitterLng).toFixed(5));

      await deliveriesApi.updateLocation(jobId, { lat: nextLat, lng: nextLng });
      setActionMsg(`📡 Live GPS beacon broadcasted: [${nextLat}, ${nextLng}] stepping towards ${targetLabel}!`);
      await fetchAllData();
    } catch (err) {
      console.error('GPS broadcast error:', err);
      setActionError(err?.message || 'Failed to broadcast GPS beacon');
    } finally {
      setActionLoading(false);
    }
  };

  // Return leg OTP submission
  const handleVerifyReturnDelivery = async () => {
    if (!selectedJob) return;
    const enteredOtp = delOtp.join('');
    if (enteredOtp.length !== 6) {
      setActionError('Please enter the full 6-digit Customer Delivery OTP');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      const res = await deliveriesApi.verifyDelivery(selectedJob.id, {
        otp: enteredOtp,
        notes: 'Device returned to customer doorstep. Physical inspection complete.'
      });

      confetti({ particleCount: 70, spread: 70 });
      setActionMsg(res?.message || 'Delivery confirmed! Escrow unlocked for customer confirmation.');
      setDeliveryOtpOpen(false);
      await fetchAllData();
    } catch (err) {
      setActionError(err?.message || 'Invalid delivery OTP');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter jobs
  const pendingJobs = activeJobs.filter(j => j.status !== 'delivered' && j.order_status !== 'cancelled');
  const completedJobs = activeJobs.filter(j => j.status === 'delivered');

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      color: '#f8fafc',
      fontFamily: 'var(--font-sans)',
      paddingBottom: '80px'
    }}>
      {/* Courier Top Status Bar */}
      <div style={{
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '14px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Courier Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}>
              <Truck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                  {runnerUser?.name || 'Ravi Kumar'}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} className="live-pulse"></span>
                  ON DUTY
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Courier #RB-RUNNER-04 • Honda Activa EV (KA-05-EV-4421)
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchAllData}
              disabled={loading}
              title="Refresh Queue"
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} className={loading ? 'live-pulse' : ''} />
            </button>
            <NotificationCenter variant="runner" />
            <button
              onClick={() => {
                logoutRunner();
                navigate('/runner/login');
              }}
              title="End Shift / Logout"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 16px 0' }}>
        
        {/* Alerts */}
        {actionMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            borderRadius: '10px',
            padding: '12px 16px',
            color: '#34d399',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={18} />
            <span>{actionMsg}</span>
          </div>
        )}

        {actionError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '10px',
            padding: '12px 16px',
            color: '#fca5a5',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px'
          }}>
            <AlertTriangle size={18} />
            <span>{actionError}</span>
          </div>
        )}

        {/* Courier Telemetry Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '18px'
        }}>
          <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Active Runs</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
              {pendingJobs.length}
            </div>
          </div>
          <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Available</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
              {availablePickups.length}
            </div>
          </div>
          <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#c084fc', textTransform: 'uppercase', fontWeight: 700 }}>VIP Priority</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#c084fc', marginTop: '2px' }}>
              {availablePickups.filter(p => p.warranty_tier === 'diamond' || p.warranty_tier === 'gold').length}
            </div>
          </div>
          <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>Wallet Balance</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
              ₹{completedJobs.reduce((sum, j) => sum + (Number(j.earnings) || 180), 380)}
            </div>
          </div>
        </div>

        {/* Security Pouch Inventory Pill */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={16} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>
              Tamper-Evident Anti-Static Pouches on Board:
            </span>
          </div>
          <span style={{
            background: '#f59e0b',
            color: '#0f172a',
            fontSize: '11px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            8 Pouches Left
          </span>
        </div>

        {/* Dispatch Navigation Tabs */}
        <div style={{
          display: 'flex',
          background: '#0f172a',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid #1e293b',
          marginBottom: '18px'
        }}>
          <button
            onClick={() => setActiveTab('active')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'active' ? '#f59e0b' : 'transparent',
              color: activeTab === 'active' ? '#0f172a' : '#94a3b8',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>Active Runs</span>
            <span style={{
              background: activeTab === 'active' ? '#0f172a' : '#334155',
              color: activeTab === 'active' ? '#f59e0b' : '#cbd5e1',
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '10px'
            }}>
              {pendingJobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('available')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'available' ? '#f59e0b' : 'transparent',
              color: activeTab === 'available' ? '#0f172a' : '#94a3b8',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>Available Pickups</span>
            <span style={{
              background: activeTab === 'available' ? '#0f172a' : '#334155',
              color: activeTab === 'available' ? '#f59e0b' : '#cbd5e1',
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '10px'
            }}>
              {availablePickups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'history' ? '#f59e0b' : 'transparent',
              color: activeTab === 'history' ? '#0f172a' : '#94a3b8',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>History</span>
            <span style={{
              background: activeTab === 'history' ? '#0f172a' : '#334155',
              color: activeTab === 'history' ? '#f59e0b' : '#cbd5e1',
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '10px'
            }}>
              {completedJobs.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Active Runs */}
        {activeTab === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendingJobs.length === 0 ? (
              <div style={{
                background: '#131c2e',
                border: '1px dashed #334155',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                color: '#94a3b8'
              }}>
                <Package size={40} style={{ margin: '0 auto 12px', color: '#64748b' }} />
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  No Active Runs Right Now
                </div>
                <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                  Check the "Available Pickups" tab to claim nearby repair orders.
                </div>
                <button
                  onClick={() => setActiveTab('available')}
                  style={{
                    padding: '8px 16px',
                    background: '#f59e0b',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  View Available Pickups
                </button>
              </div>
            ) : (
              pendingJobs.map((job) => {
                const isPickupLeg = job.leg_type === 'pickup' || (!job.leg_type && job.dispatch_type !== 'return' && !['repair_completed', 'quality_check', 'assigned_delivery', 'out_for_delivery'].includes(job.order_status));
                const hasPouch = !!(job.pouch_barcode || job.order_pouch_barcode);
                const currentStatus = job.order_status || job.status;

                return (
                  <div
                    key={job.id}
                    style={{
                      background: '#131c2e',
                      border: '1px solid #1e293b',
                      borderRadius: '16px',
                      padding: '20px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            background: isPickupLeg ? '#3b82f6' : '#10b981',
                            color: '#ffffff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            {isPickupLeg ? 'Doorstep Pickup' : 'Return Delivery'}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>
                            #{job.order_id?.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                          {job.product_name} • {job.customer_name}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: currentStatus === 'picked_up' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: currentStatus === 'picked_up' ? '#34d399' : '#fbbf24',
                        border: `1px solid ${currentStatus === 'picked_up' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                      }}>
                        {currentStatus?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* 4-Stage Runner Progress Stepper */}
                    <div style={{
                      background: '#090d16',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      border: '1px solid #1e293b'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        {[
                          { label: 'Claimed', stepIdx: 0 },
                          { label: 'En Route', stepIdx: 1 },
                          { label: isPickupLeg ? 'Pouch & OTP' : 'Inspect & OTP', stepIdx: 2 },
                          { label: isPickupLeg ? 'Workshop Bay' : 'Completed', stepIdx: 3 },
                        ].map((step, idx) => {
                          const currentIdx = getRunnerStepIndex(job);
                          const isDone = currentIdx > step.stepIdx;
                          const isCurrent = currentIdx === step.stepIdx;
                          return (
                            <React.Fragment key={idx}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '55px' }}>
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: isDone ? '#10b981' : isCurrent ? '#f59e0b' : '#334155',
                                  color: isDone || isCurrent ? '#ffffff' : '#94a3b8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  boxShadow: isCurrent ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none'
                                }}>
                                  {isDone ? '✓' : idx + 1}
                                </div>
                                <span style={{
                                  fontSize: '9px',
                                  color: isCurrent ? '#fbbf24' : isDone ? '#34d399' : '#64748b',
                                  fontWeight: isCurrent ? 800 : 500,
                                  marginTop: '4px',
                                  textAlign: 'center'
                                }}>
                                  {step.label}
                                </span>
                              </div>
                              {idx < 3 && (
                                <div style={{
                                  flex: 1,
                                  height: '2px',
                                  background: isDone ? '#10b981' : '#334155',
                                  margin: '0 2px 14px'
                                }} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* VIP Protection & SLA Callout Card */}
                    {job.warranty_tier === 'diamond' && (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                        border: '1px solid #818cf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 0 12px rgba(99, 102, 241, 0.2)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>💎</span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#c7d2fe' }}>
                              DIAMOND VIP 2-HOUR SLA RUN
                            </div>
                            <div style={{ fontSize: '11px', color: '#a5b4fc' }}>
                              Urgent doorstep pickup required • Maintain 5.0 Star Courier Rating
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#34d399',
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid #10b981',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            +₹80 VIP Express Bounty
                          </span>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                            Est. Payout: ₹{Number(job.earnings || 200)}
                          </div>
                        </div>
                      </div>
                    )}
                    {job.warranty_tier === 'gold' && (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #78350f, #92400e)',
                        border: '1px solid #f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>⭐</span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#fde68a' }}>
                              GOLD SHIELD PRIORITY DISPATCH
                            </div>
                            <div style={{ fontSize: '11px', color: '#fcd34d' }}>
                              Priority customer handling • Cleanroom transit
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#34d399',
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid #10b981',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            +₹40 Priority Bonus
                          </span>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                            Est. Payout: ₹{Number(job.earnings || 160)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Route Details */}
                    <div style={{
                      background: '#0a0f1d',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {/* Origin / Customer */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ color: '#f59e0b', marginTop: '2px' }}>
                          <MapPin size={16} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                              {isPickupLeg ? 'Customer Doorstep' : 'Workshop Pickup Hub'}
                            </span>
                            {isPickupLeg && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '1px 7px',
                                borderRadius: '10px',
                                background: job.pickup_label === 'office' ? '#1e293b' : '#064e3b',
                                color: job.pickup_label === 'office' ? '#38bdf8' : '#34d399',
                                fontSize: '10px',
                                fontWeight: 800
                              }}>
                                {job.pickup_label === 'office' ? <Briefcase size={10} /> : <Home size={10} />}
                                <span>{job.pickup_label === 'office' ? 'Work / Office' : job.pickup_label === 'other' ? 'Other' : 'Home'}</span>
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, lineHeight: '1.4' }}>
                            {isPickupLeg ? (job.pickup_address || job.origin_address || 'Customer Location') : (job.shop_address || 'Fix It Electronics, 12 MG Road')}
                            {isPickupLeg && job.pickup_pincode ? ` – ${job.pickup_pincode}` : ''}
                          </div>
                          {isPickupLeg && job.pickup_lat && job.pickup_lng && (
                            <div style={{ fontSize: '10px', color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
                              📍 Pinned Gate GPS: {Number(job.pickup_lat).toFixed(4)}°, {Number(job.pickup_lng).toFixed(4)}°
                            </div>
                          )}
                        </div>
                        {job.customer_phone && (
                          <a
                            href={`tel:${job.customer_phone}`}
                            style={{
                              background: '#1e293b',
                              color: '#34d399',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 700
                            }}
                          >
                            <Phone size={13} />
                            <span>Call</span>
                          </a>
                        )}
                      </div>

                      {/* Destination / Workshop */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ color: '#38bdf8', marginTop: '2px' }}>
                          <Navigation size={16} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                              {isPickupLeg ? 'Cleanroom Workshop Destination' : 'Customer Return Address'}
                            </span>
                            {!isPickupLeg && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '1px 7px',
                                borderRadius: '10px',
                                background: job.delivery_label === 'office' ? '#1e293b' : '#064e3b',
                                color: job.delivery_label === 'office' ? '#38bdf8' : '#34d399',
                                fontSize: '10px',
                                fontWeight: 800
                              }}>
                                {job.delivery_label === 'office' ? <Briefcase size={10} /> : <Home size={10} />}
                                <span>{job.delivery_label === 'office' ? 'Work / Office' : job.delivery_label === 'other' ? 'Other' : 'Home'}</span>
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, lineHeight: '1.4' }}>
                            {isPickupLeg ? (job.shop_name ? `${job.shop_name} • ${job.shop_address}` : 'Fix It Electronics, 12 MG Road') : (job.delivery_address || 'Customer Address')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tamper Seal Barcode status if sealed */}
                    {hasPouch && (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ShieldCheck size={16} style={{ color: '#10b981' }} />
                          <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 700 }}>
                            Tamper-Evident Pouch Sealed & Locked:
                          </span>
                        </div>
                        <span style={{
                          fontSize: '12px',
                          fontFamily: 'var(--font-mono)',
                          color: '#ffffff',
                          fontWeight: 800,
                          background: '#1e293b',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {job.pouch_barcode || job.order_pouch_barcode}
                        </span>
                      </div>
                    )}

                    {/* Turn-by-Turn GPS Navigation HUD & Auto-Drive Cockpit */}
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} className="live-pulse" />
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Doorstep Navigation Cockpit
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedNavJobId(expandedNavJobId === job.id ? null : job.id)}
                          style={{
                            background: expandedNavJobId === job.id ? '#1e293b' : 'rgba(2, 132, 199, 0.2)',
                            color: expandedNavJobId === job.id ? '#cbd5e1' : '#38bdf8',
                            border: expandedNavJobId === job.id ? '1px solid #334155' : '1px solid #0284c7',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <Navigation size={12} />
                          <span>{expandedNavJobId === job.id ? 'Hide Navigation Map' : 'Open Turn-by-Turn HUD'}</span>
                        </button>
                      </div>

                      {/* Render Navigation HUD */}
                      {expandedNavJobId === job.id && (
                        <RunnerNavigationHUD
                          job={job}
                          onLocationUpdated={(newCoords) => {
                            setActiveJobs(prev => prev.map(j => j.id === job.id ? { ...j, current_lat: newCoords.lat, current_lng: newCoords.lng } : j));
                          }}
                          onArrived={() => {
                            setActionMsg('🏁 ARRIVED AT DOORSTEP! Geofence verified.');
                            if (isPickupLeg) {
                              openScannerForJob(job);
                            } else {
                              setSelectedJob(job);
                              setDelOtp(['', '', '', '', '', '']);
                              setDeliveryOtpOpen(true);
                            }
                          }}
                          onOpenVerifyModal={() => {
                            if (isPickupLeg) {
                              openScannerForJob(job);
                            } else {
                              setSelectedJob(job);
                              setDelOtp(['', '', '', '', '', '']);
                              setDeliveryOtpOpen(true);
                            }
                          }}
                        />
                      )}
                    </div>

                    {/* Operational Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Step 1: Out for pickup */}
                      {isPickupLeg && currentStatus === 'partner_assigned' && (
                        <button
                          onClick={() => handleUpdateDeliveryStatus(job.id, 'out_for_pickup')}
                          disabled={actionLoading}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <Navigation size={16} />
                          <span>Start Run & Navigate to Customer Doorstep</span>
                        </button>
                      )}

                      {/* Step 2: Doorstep scan pouch & verify OTP */}
                      {isPickupLeg && (currentStatus === 'out_for_pickup' || currentStatus === 'partner_assigned') && (
                        <button
                          onClick={() => openScannerForJob(job)}
                          disabled={actionLoading}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: '#f59e0b',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 800,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                          }}
                        >
                          <QrCode size={18} />
                          <span>Scan Tamper Pouch & Verify Doorstep OTP</span>
                        </button>
                      )}

                      {/* Step 3: Picked up -> Transit & Workshop Handover */}
                      {isPickupLeg && currentStatus === 'picked_up' && (
                        <button
                          onClick={() => handleWorkshopHandover(job.id)}
                          disabled={actionLoading}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 800,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <ShieldCheck size={16} />
                          <span>Handover to Cleanroom Intake Desk</span>
                        </button>
                      )}

                      {/* Return leg delivery verification */}
                      {!isPickupLeg && ['out_for_delivery', 'assigned_delivery', 'repair_completed', 'quality_check', 'assigned'].includes(currentStatus) && (
                        <button
                          id="verify-delivery-otp-btn"
                          onClick={() => {
                            setSelectedJob(job);
                            setDelOtp(['', '', '', '', '', '']);
                            setDeliveryOtpOpen(true);
                          }}
                          disabled={actionLoading}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 800,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <CheckCircle2 size={18} />
                          <span>Verify Customer Delivery OTP & Complete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Available Pickups */}
        {activeTab === 'available' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All Available (${availablePickups.length})` },
                { id: 'vip', label: `👑 VIP Priority (${availablePickups.filter(p => p.warranty_tier === 'diamond' || p.warranty_tier === 'gold').length})` },
                { id: 'return', label: `🔄 Return Runs (${availablePickups.filter(p => p.dispatch_type === 'return' || p.leg_type === 'return').length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAvailableFilter(tab.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: availableFilter === tab.id ? '#f59e0b' : '#1e293b',
                    color: availableFilter === tab.id ? '#0f172a' : '#94a3b8',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {availablePickups.filter((req) => {
              if (availableFilter === 'vip') return req.warranty_tier === 'diamond' || req.warranty_tier === 'gold';
              if (availableFilter === 'return') return req.dispatch_type === 'return' || req.leg_type === 'return';
              return true;
            }).length === 0 ? (
              <div style={{
                background: '#131c2e',
                border: '1px dashed #334155',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                color: '#94a3b8'
              }}>
                <CheckCircle2 size={40} style={{ margin: '0 auto 12px', color: '#10b981' }} />
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  No Runs In This Filter
                </div>
                <div style={{ fontSize: '13px' }}>
                  Select "All Available" to view other nearby delivery runs.
                </div>
              </div>
            ) : (
              availablePickups.filter((req) => {
                if (availableFilter === 'vip') return req.warranty_tier === 'diamond' || req.warranty_tier === 'gold';
                if (availableFilter === 'return') return req.dispatch_type === 'return' || req.leg_type === 'return';
                return true;
              }).map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: req.warranty_tier === 'diamond'
                      ? 'linear-gradient(135deg, #12182b, #1e1b4b)'
                      : req.warranty_tier === 'gold'
                      ? 'linear-gradient(135deg, #18192b, #2a1f0a)'
                      : '#131c2e',
                    border: req.warranty_tier === 'diamond'
                      ? '1.5px solid #818cf8'
                      : req.warranty_tier === 'gold'
                      ? '1.5px solid #f59e0b'
                      : '1px solid #1e293b',
                    borderRadius: '16px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: req.warranty_tier === 'diamond' ? '0 4px 20px rgba(99, 102, 241, 0.25)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>
                          Order #{req.id.slice(0, 8).toUpperCase()}
                        </span>
                        {req.warranty_tier === 'diamond' && (
                          <span style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                            color: '#c7d2fe',
                            border: '1px solid #818cf8',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            💎 VIP 2-HR SLA
                          </span>
                        )}
                        {req.warranty_tier === 'gold' && (
                          <span style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            background: 'linear-gradient(135deg, #78350f, #92400e)',
                            color: '#fde68a',
                            border: '1px solid #f59e0b',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            ⭐ GOLD PRIORITY
                          </span>
                        )}
                        {req.is_warranty_claim && (
                          <span style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #f59e0b',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 800
                          }}>
                            ⚡ 30D REWORK
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                        {req.product_name} • {req.customer_name}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: (req.dispatch_type === 'return' || req.leg_type === 'return') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                      color: (req.dispatch_type === 'return' || req.leg_type === 'return') ? '#34d399' : '#38bdf8',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${(req.dispatch_type === 'return' || req.leg_type === 'return') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                    }}>
                      {(req.dispatch_type === 'return' || req.leg_type === 'return') ? '🔄 Doorstep Return Delivery' : (req.order_type === 'sos' ? '⚡ 60-Min Express SOS' : 'Doorstep Pickup')}
                    </span>
                  </div>

                  {/* Route & Hub */}
                  <div style={{ fontSize: '12px', color: '#94a3b8', background: '#0a0f1d', padding: '10px 12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <MapPin size={14} style={{ color: (req.dispatch_type === 'return' || req.leg_type === 'return') ? '#34d399' : '#f59e0b' }} />
                      <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                        {(req.dispatch_type === 'return' || req.leg_type === 'return')
                          ? `Origin Hub: ${req.shop_name || 'Fix It Electronics Cleanroom'}`
                          : (req.pickup_address || 'Doorstep Pickup Address')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} style={{ color: '#94a3b8' }} />
                      <span>
                        {(req.dispatch_type === 'return' || req.leg_type === 'return')
                          ? `Destination: ${req.delivery_address || req.pickup_address || 'Customer Doorstep'}`
                          : `Destination: ${req.shop_name || 'Fix It Electronics (Level 3 Hub)'}`}
                      </span>
                    </div>
                  </div>

                  {/* Courier Payout & Bounty Breakdown */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px'
                  }}>
                    <div style={{ color: '#94a3b8' }}>
                      <span>Earnings: </span>
                      <span style={{ color: req.warranty_tier === 'diamond' ? '#c7d2fe' : req.warranty_tier === 'gold' ? '#fde68a' : '#cbd5e1', fontWeight: 600 }}>
                        {req.warranty_tier === 'diamond'
                          ? 'Base ₹120 + ₹80 VIP 2-Hr Bounty'
                          : req.warranty_tier === 'gold'
                          ? 'Base ₹120 + ₹40 Priority Bonus'
                          : 'Standard Base Delivery Fee'}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                      ₹{Number(req.estimated_earnings || (req.warranty_tier === 'diamond' ? 200 : req.warranty_tier === 'gold' ? 160 : 120))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaimRun(req.id)}
                    disabled={actionLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: req.warranty_tier === 'diamond'
                        ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
                        : (req.dispatch_type === 'return' || req.leg_type === 'return') ? '#10b981' : '#f59e0b',
                      color: req.warranty_tier === 'diamond' || (req.dispatch_type === 'return' || req.leg_type === 'return') ? '#ffffff' : '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: req.warranty_tier === 'diamond' ? '0 4px 12px rgba(124, 58, 237, 0.4)' : 'none'
                    }}
                  >
                    <Truck size={16} />
                    <span>
                      {req.warranty_tier === 'diamond'
                        ? '⚡ Claim Priority VIP Run (₹200)'
                        : (req.dispatch_type === 'return' || req.leg_type === 'return')
                        ? 'Claim Return Delivery Run'
                        : 'Claim This Pickup Run'}
                    </span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Trip History */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {completedJobs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                No completed trips yet in current session.
              </div>
            ) : (
              completedJobs.map((job) => (
                <div
                  key={job.id}
                  style={{
                    background: '#131c2e',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                      #{job.order_id?.slice(0, 8).toUpperCase()} • {job.product_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Tamper Seal: {job.pouch_barcode || 'RB-POUCH-VERIFIED'} • {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Completed
                  </span>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* --- Tamper Pouch Scanner & Doorstep Handover Modal --- */}
      {scannerOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 100,
          padding: '0'
        }}>
          <div style={{
            background: '#0f172a',
            borderTop: '1px solid #334155',
            borderRadius: '24px 24px 0 0',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 -20px 40px rgba(0, 0, 0, 0.8)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                  Doorstep Tamper Pouch Sealing & Intake
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Order #{selectedJob?.order_id?.slice(0, 8).toUpperCase()} • {selectedJob?.customer_name}
                </div>
              </div>
              <button
                onClick={() => setScannerOpen(false)}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Protection Tier Header Banner */}
            {selectedJob?.warranty_tier === 'diamond' ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.15))',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Zap size={18} style={{ color: '#06b6d4', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#67e8f9', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    💎 DIAMOND VIP CUSTODY (180 DAYS) • 2-HOUR SLA MANDATE
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Direct-to-Bench Express Route • Priority +₹80 Payout active
                  </div>
                </div>
              </div>
            ) : selectedJob?.warranty_tier === 'gold' ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Star size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#fde68a', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    ⭐ GOLD SHIELD CUSTODY (90 DAYS) • EXPEDITED TRANSIT
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Tier-2 Priority Queue • Bonus +₹40 Payout active
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#131c2e',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Shield size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    🛡️ STANDARD BENCH CUSTODY (30 DAYS)
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Standard Courier Payout • Tamper Void Pouch Required
                  </div>
                </div>
              </div>
            )}

            {/* Scanner Viewfinder Simulation */}
            <div style={{
              background: '#000000',
              border: '2px solid #3b82f6',
              borderRadius: '16px',
              height: '160px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              {/* Laser Animation Bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #ef4444, #f87171, #ef4444, transparent)',
                boxShadow: '0 0 15px #ef4444',
                animation: 'scanLaser 2s infinite ease-in-out'
              }} />

              <style>{`
                @keyframes scanLaser {
                  0% { top: 10%; }
                  50% { top: 90%; }
                  100% { top: 10%; }
                }
              `}</style>

              {/* Viewfinder Corners */}
              <div style={{ position: 'absolute', top: '16px', left: '16px', width: '20px', height: '20px', borderLeft: '3px solid #3b82f6', borderTop: '3px solid #3b82f6' }} />
              <div style={{ position: 'absolute', top: '16px', right: '16px', width: '20px', height: '20px', borderRight: '3px solid #3b82f6', borderTop: '3px solid #3b82f6' }} />
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', width: '20px', height: '20px', borderLeft: '3px solid #3b82f6', borderBottom: '3px solid #3b82f6' }} />
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', width: '20px', height: '20px', borderRight: '3px solid #3b82f6', borderBottom: '3px solid #3b82f6' }} />

              <div style={{ textAlign: 'center', zIndex: 10 }}>
                <QrCode size={36} style={{ color: '#f59e0b', margin: '0 auto 6px' }} />
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                  {isScanning ? 'Reading Tamper Barcode...' : (pouchBarcode || 'Align Pouch Barcode Here')}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  Optical anti-tamper security pattern reader
                </div>
              </div>
            </div>

            {/* Scan Simulation & Input Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={handleSimulateScan}
                disabled={isScanning}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Camera size={15} />
                <span>Simulate Laser Scan</span>
              </button>
              <input
                type="text"
                value={pouchBarcode}
                onChange={(e) => setPouchBarcode(e.target.value)}
                placeholder="RB-POUCH-XXXXX"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: '#090d16',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>

            {/* Customer Handover 6-Digit OTP */}
            <div style={{
              background: '#131c2e',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Customer 6-Digit Handover OTP
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Visible on customer's phone</span>
              </div>

              {/* 6-Digit Input Row */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    style={{
                      width: '42px',
                      height: '48px',
                      background: '#090d16',
                      border: digit ? '2px solid #f59e0b' : '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '20px',
                      fontWeight: 800,
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none'
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                Ask customer: "Please share the 6-digit OTP from your RepairBee live tracking screen"
              </div>

              {/* 1-Click Test Fill OTP button */}
              <button
                type="button"
                onClick={() => {
                  const code = String(selectedJob?.pickup_otp || '123456').padStart(6, '0');
                  setOtp(code.split('').slice(0, 6));
                }}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '7px 12px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px dashed rgba(245, 158, 11, 0.4)',
                  borderRadius: '8px',
                  color: '#fbbf24',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Zap size={13} />
                <span>⚡ 1-Click Test Fill OTP ({selectedJob?.pickup_otp || '123456'})</span>
              </button>
            </div>

            {/* Doorstep Inspection Checklist */}
            <div style={{
              background: '#131c2e',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '10px', textTransform: 'uppercase' }}>
                Tamper Protocol Checklist
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { key: 'poweredDown', label: 'Device fully powered down before customer' },
                  { key: 'simRemoved', label: 'SIM tray / memory card retained by customer' },
                  { key: 'antiStatic', label: 'Anti-static cushioned sleeve applied' },
                  { key: 'tamperSealed', label: 'VOID tamper security seal firmly pressed' },
                ].map(item => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checklist[item.key]}
                      onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                      style={{ accentColor: '#f59e0b', width: '16px', height: '16px' }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Action */}
            <button
              onClick={handleVerifyPouchPickup}
              disabled={actionLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: '#f59e0b',
                color: '#0f172a',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px rgba(245, 158, 11, 0.4)'
              }}
            >
              <ShieldCheck size={18} />
              <span>{actionLoading ? 'Verifying with Vault...' : 'Verify OTP & Lock Tamper Pouch'}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- Delivery Return OTP Modal --- */}
      {deliveryOtpOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: '#0f172a',
            borderTop: '1px solid #334155',
            borderRadius: '24px 24px 0 0',
            width: '100%',
            maxWidth: '560px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                  Doorstep Delivery Handover Confirmation
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Order #{selectedJob?.order_id?.slice(0, 8).toUpperCase()} • {selectedJob?.customer_name}
                </div>
              </div>
              <button
                onClick={() => setDeliveryOtpOpen(false)}
                style={{ background: '#1e293b', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '50%' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px' }}>
              The customer has inspected their repaired hardware. Enter the 6-digit Delivery Handover OTP displayed on their screen to complete return transit.
            </p>

            {/* 6-Digit Delivery OTP */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}>
              {delOtp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`del-otp-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const newOtp = [...delOtp];
                    newOtp[idx] = e.target.value;
                    setDelOtp(newOtp);
                    if (e.target.value && idx < 5) {
                      document.getElementById(`del-otp-${idx + 1}`)?.focus();
                    }
                  }}
                  style={{
                    width: '42px',
                    height: '48px',
                    background: '#090d16',
                    border: digit ? '2px solid #10b981' : '1px solid #334155',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '20px',
                    fontWeight: 800,
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              ))}
            </div>

            {/* 1-Click Test Fill Return OTP */}
            <button
              type="button"
              onClick={() => {
                const code = String(selectedJob?.delivery_otp || '654321').padStart(6, '0');
                setDelOtp(code.split('').slice(0, 6));
              }}
              style={{
                marginBottom: '16px',
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px dashed rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                color: '#34d399',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Zap size={13} />
              <span>⚡ 1-Click Test Fill Return OTP ({selectedJob?.delivery_otp || '654321'})</span>
            </button>

            <button
              onClick={handleVerifyReturnDelivery}
              disabled={actionLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer'
              }}
            >
              Confirm Delivery Handover
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
