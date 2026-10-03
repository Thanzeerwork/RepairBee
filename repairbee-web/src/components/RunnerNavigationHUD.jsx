import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { deliveriesApi } from '../api/client';
import confetti from 'canvas-confetti';
import {
  Navigation,
  Compass,
  Phone,
  ShieldCheck,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  ExternalLink,
  Play,
  Pause,
  Zap,
  Target,
  Home,
  Briefcase,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';

// Haversine Distance in Kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.5;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// Custom Leaflet Icons
const createRunnerMarkerIcon = (runnerName = 'You (Courier)') => {
  return L.divIcon({
    className: 'rb-runner-nav-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -50%);
        user-select: none;
      ">
        <div style="
          position: absolute;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: rgba(2, 132, 199, 0.3);
          border: 1.5px solid rgba(56, 189, 248, 0.7);
          animation: rb-pulse 2s infinite ease-out;
          top: -7px;
          left: -7px;
          pointer-events: none;
        "></div>
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0284c7, #0369a1);
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 16px rgba(2, 132, 199, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          z-index: 10;
        ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="5.5" cy="17.5" r="3.5"/>
            <circle cx="18.5" cy="17.5" r="3.5"/>
            <path d="M15 6h-3.5L9 12h6l1.5-6z"/>
            <path d="M9 12l2.5 5.5"/>
            <path d="M18.5 17.5L15 6"/>
          </svg>
        </div>
        <div style="
          margin-top: 3px;
          background: #0f172a;
          color: #38bdf8;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid #0284c7;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          z-index: 10;
        ">
          ⚡ ${runnerName.split(' ')[0]} • 24 km/h
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createDestinationMarkerIcon = (label = 'Doorstep Destination', isWorkshop = false) => {
  const bg = isWorkshop
    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
    : 'linear-gradient(135deg, #10b981, #059669)';
  const border = isWorkshop ? '#d97706' : '#059669';
  const tagBg = isWorkshop ? '#451a03' : '#064e3b';
  const tagColor = isWorkshop ? '#fcd34d' : '#6ee7b7';

  return L.divIcon({
    className: 'rb-dest-nav-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        user-select: none;
      ">
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50% 50% 50% 0;
          background: ${bg};
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        ">
          <svg style="transform: rotate(45deg);" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${isWorkshop 
              ? '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' 
              : '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'}
          </svg>
        </div>
        <div style="
          margin-top: 3px;
          background: ${tagBg};
          color: ${tagColor};
          font-size: 10px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid ${border};
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
          ${isWorkshop ? '🔬 Workshop Bay' : `📍 ${label}`}
        </div>
      </div>
    `,
    iconSize: [38, 44],
    iconAnchor: [19, 44],
  });
};

export default function RunnerNavigationHUD({
  job,
  onLocationUpdated,
  onArrived,
  onOpenVerifyModal
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const runnerMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const autoDriveTimerRef = useRef(null);

  // Determine current leg & target destination
  const isPickupLeg = job.leg_type === 'pickup' || (!job.leg_type && job.dispatch_type !== 'return' && !['repair_completed', 'quality_check', 'assigned_delivery', 'out_for_delivery'].includes(job.order_status));
  const currentStatus = job.order_status || job.status;

  // Destination logic:
  // 1. If pickup run and status != picked_up -> target is customer pickup doorstep
  // 2. If pickup run and status == picked_up -> target is workshop intake bay
  // 3. If return run -> target is customer delivery doorstep
  const isHeadingToWorkshop = isPickupLeg && currentStatus === 'picked_up';

  let targetLat = 12.9352;
  let targetLng = 77.6245;
  let targetAddress = 'Customer Doorstep';
  let targetLabel = 'Doorstep Location';
  let targetTag = 'home';

  if (isHeadingToWorkshop) {
    targetLat = Number(job.shop_lat) || 12.9716;
    targetLng = Number(job.shop_lng) || 77.5946;
    targetAddress = job.shop_address || 'Fix It Electronics, 12 MG Road';
    targetLabel = job.shop_name || 'Cleanroom Intake Bay';
  } else if (!isPickupLeg) {
    targetLat = Number(job.delivery_lat || job.pickup_lat) || 12.9352;
    targetLng = Number(job.delivery_lng || job.pickup_lng) || 77.6245;
    targetAddress = job.delivery_address || job.pickup_address || 'Customer Return Doorstep';
    targetLabel = job.delivery_label === 'office' ? 'Work / Office' : job.delivery_label === 'other' ? 'Other' : 'Home';
    targetTag = job.delivery_label || 'home';
  } else {
    targetLat = Number(job.pickup_lat) || 12.9352;
    targetLng = Number(job.pickup_lng) || 77.6245;
    targetAddress = job.pickup_address || job.origin_address || 'Customer Doorstep';
    targetLabel = job.pickup_label === 'office' ? 'Work / Office' : job.pickup_label === 'other' ? 'Other' : 'Home';
    targetTag = job.pickup_label || 'home';
  }

  const initialRunnerLat = Number(job.current_lat) || 12.9550;
  const initialRunnerLng = Number(job.current_lng) || 77.6100;

  const [currentCoords, setCurrentCoords] = useState({ lat: initialRunnerLat, lng: initialRunnerLng });
  const [isAutoDriving, setIsAutoDriving] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [telemetryMsg, setTelemetryMsg] = useState('');
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const distanceKm = calculateDistanceKm(currentCoords.lat, currentCoords.lng, targetLat, targetLng);
  const estimatedMins = Math.max(1, Math.round((distanceKm / 22) * 60)); // ~22 km/h avg bike speed

  // Turn-by-Turn Dynamic Maneuver Guide
  const getNextManeuver = () => {
    if (distanceKm <= 0.05) {
      return {
        instruction: isHeadingToWorkshop
          ? '🏁 Arrived at Cleanroom Workshop Bay! Hand over sealed pouch to technician desk.'
          : '🏁 Arrived at Customer Doorstep Entrance! Request 6-digit handover OTP.',
        distanceText: 'At Doorstep',
        icon: Target,
        highlight: true
      };
    }
    if (distanceKm <= 0.3) {
      return {
        instruction: `Approaching ${targetAddress.slice(0, 36)}... Prepare for doorstep arrival.`,
        distanceText: `${Math.round(distanceKm * 1000)}m`,
        icon: Navigation,
        highlight: false
      };
    }
    if (distanceKm <= 1.0) {
      return {
        instruction: 'In 400m, turn towards local building access gate.',
        distanceText: `${Math.round(distanceKm * 1000)}m`,
        icon: Compass,
        highlight: false
      };
    }
    if (distanceKm <= 2.5) {
      return {
        instruction: 'Continue straight on arterial link corridor. Moderate city traffic.',
        distanceText: `${distanceKm} km`,
        icon: Navigation,
        highlight: false
      };
    }
    return {
      instruction: `Head towards ${targetLabel} via main road corridor.`,
      distanceText: `${distanceKm} km`,
      icon: Navigation,
      highlight: false
    };
  };

  const maneuver = getNextManeuver();

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [currentCoords.lat, currentCoords.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Runner marker
    const runnerMarker = L.marker([currentCoords.lat, currentCoords.lng], {
      icon: createRunnerMarkerIcon(job.runner_name || 'You'),
      zIndexOffset: 1000
    }).addTo(map);
    runnerMarkerRef.current = runnerMarker;

    // Destination marker
    const destMarker = L.marker([targetLat, targetLng], {
      icon: createDestinationMarkerIcon(targetLabel, isHeadingToWorkshop),
      zIndexOffset: 500
    }).addTo(map);
    destMarkerRef.current = destMarker;

    // Polyline route corridor
    const polyline = L.polyline([
      [currentCoords.lat, currentCoords.lng],
      [targetLat, targetLng]
    ], {
      color: '#0284c7',
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.85
    }).addTo(map);
    routePolylineRef.current = polyline;

    // Fit bounds to show both runner and target with comfortable padding
    const bounds = L.latLngBounds([
      [currentCoords.lat, currentCoords.lng],
      [targetLat, targetLng]
    ]);
    map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      if (autoDriveTimerRef.current) clearInterval(autoDriveTimerRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [job.id, targetLat, targetLng]);

  // Synchronize Leaflet elements on coordinate updates
  useEffect(() => {
    if (runnerMarkerRef.current) {
      runnerMarkerRef.current.setLatLng([currentCoords.lat, currentCoords.lng]);
    }
    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs([
        [currentCoords.lat, currentCoords.lng],
        [targetLat, targetLng]
      ]);
    }
  }, [currentCoords.lat, currentCoords.lng, targetLat, targetLng]);

  // Single GPS Step Function
  const stepTowardsDestination = async (factor = 0.2) => {
    setUpdatingLocation(true);
    try {
      const curDist = calculateDistanceKm(currentCoords.lat, currentCoords.lng, targetLat, targetLng);

      // If already within 50m, trigger arrival
      if (curDist <= 0.05) {
        handleArrivalTrigger();
        return;
      }

      // Step closer
      const jitterLat = (Math.random() - 0.5) * 0.0004;
      const jitterLng = (Math.random() - 0.5) * 0.0004;
      const nextLat = parseFloat((currentCoords.lat + (targetLat - currentCoords.lat) * factor + jitterLat).toFixed(6));
      const nextLng = parseFloat((currentCoords.lng + (targetLng - currentCoords.lng) * factor + jitterLng).toFixed(6));

      // Push to backend API
      await deliveriesApi.updateLocation(job.id, { lat: nextLat, lng: nextLng });

      setCurrentCoords({ lat: nextLat, lng: nextLng });
      setTelemetryMsg(`📡 Broadcast: [${nextLat.toFixed(4)}, ${nextLng.toFixed(4)}] • Remaining: ${(curDist * (1 - factor)).toFixed(2)} km`);

      if (onLocationUpdated) {
        onLocationUpdated({ lat: nextLat, lng: nextLng });
      }

      // Check if newly arrived
      const newDist = calculateDistanceKm(nextLat, nextLng, targetLat, targetLng);
      if (newDist <= 0.05) {
        handleArrivalTrigger();
      }
    } catch (err) {
      console.warn('GPS step error:', err);
    } finally {
      setUpdatingLocation(false);
    }
  };

  // Doorstep Arrival Handler
  const handleArrivalTrigger = () => {
    setIsAutoDriving(false);
    if (autoDriveTimerRef.current) clearInterval(autoDriveTimerRef.current);
    setArrived(true);
    setTelemetryMsg('🏁 ARRIVED AT DOORSTEP! Geofence verified (< 50m).');

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });

    if (onArrived) {
      onArrived();
    }
  };

  // Toggle Auto-Drive Simulation
  const toggleAutoDrive = () => {
    if (isAutoDriving) {
      setIsAutoDriving(false);
      if (autoDriveTimerRef.current) clearInterval(autoDriveTimerRef.current);
      setTelemetryMsg('⏸ Auto-drive simulation paused.');
    } else {
      setIsAutoDriving(true);
      setArrived(false);
      setTelemetryMsg('▶ Auto-drive simulation active! Broadcasting continuous GPS beacons...');

      // Run immediate step then interval every 3s
      stepTowardsDestination(0.22);
      autoDriveTimerRef.current = setInterval(() => {
        stepTowardsDestination(0.22);
      }, 3000);
    }
  };

  // Reset Runner to Starting Point
  const handleResetPosition = async () => {
    setIsAutoDriving(false);
    if (autoDriveTimerRef.current) clearInterval(autoDriveTimerRef.current);
    setArrived(false);
    const resetCoords = { lat: 12.9550, lng: 77.6100 };
    setCurrentCoords(resetCoords);
    try {
      await deliveriesApi.updateLocation(job.id, resetCoords);
      setTelemetryMsg('🔄 Runner beacon reset to starting hub (Koramangala/Austin Town).');
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([resetCoords.lat, resetCoords.lng], 14, { duration: 1 });
      }
    } catch (err) {
      console.warn('Reset position error:', err);
    }
  };

  // Recenter map on runner
  const handleCenterOnRunner = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentCoords.lat, currentCoords.lng], 16, { duration: 0.8 });
    }
  };

  // Google Maps Deep Link URL
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}&travelmode=two_wheeler`;

  return (
    <div style={{
      background: '#0a0f1d',
      border: '1.5px solid #1e293b',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      marginTop: '12px',
      marginBottom: '16px'
    }}>
      {/* HUD Header Banner: Next Maneuver */}
      <div style={{
        background: maneuver.highlight ? 'linear-gradient(135deg, #059669, #047857)' : '#0f172a',
        padding: '14px 18px',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: maneuver.highlight ? '#10b981' : '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
          }}>
            <maneuver.icon size={22} className={isAutoDriving ? 'live-pulse' : ''} />
          </div>

          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', fontWeight: 800 }}>
              Turn-by-Turn GPS Direction
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', marginTop: '2px', lineHeight: '1.3' }}>
              {maneuver.instruction}
            </div>
          </div>
        </div>

        {/* Distance & Dynamic ETA Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            padding: '6px 12px',
            borderRadius: '8px',
            background: '#1e293b',
            border: '1px solid #334155',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Distance</div>
            <div style={{ fontSize: '15px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
              {distanceKm <= 0.05 ? '0 m' : `${distanceKm} km`}
            </div>
          </div>

          <div style={{
            padding: '6px 12px',
            borderRadius: '8px',
            background: '#1e293b',
            border: '1px solid #334155',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>ETA</div>
            <div style={{ fontSize: '15px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
              {distanceKm <= 0.05 ? 'Arrived' : `${estimatedMins} min`}
            </div>
          </div>
        </div>
      </div>

      {/* Target Address Info Bar with Tag */}
      <div style={{
        padding: '10px 18px',
        background: '#131c2e',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            background: targetTag === 'office' ? '#1e293b' : '#064e3b',
            color: targetTag === 'office' ? '#38bdf8' : '#34d399',
            fontSize: '10px',
            fontWeight: 800
          }}>
            {targetTag === 'office' ? <Briefcase size={11} /> : <Home size={11} />}
            <span>{targetLabel}</span>
          </span>
          <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{targetAddress}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            📍 {targetLat.toFixed(4)}°, {targetLng.toFixed(4)}°
          </span>
          {job.customer_phone && (
            <a
              href={`tel:${job.customer_phone}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                background: '#10b981',
                color: '#0f172a',
                fontSize: '11px',
                fontWeight: 800,
                textDecoration: 'none'
              }}
            >
              <Phone size={11} />
              <span>Call Customer</span>
            </a>
          )}
        </div>
      </div>

      {/* Leaflet Navigation Map Canvas */}
      <div style={{ position: 'relative' }}>
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '280px',
            background: '#090d16'
          }}
        />

        {/* Quick Map Controls Overlay */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <button
            type="button"
            onClick={handleCenterOnRunner}
            title="Center map on my runner position"
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#38bdf8',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Target size={16} />
          </button>
        </div>

        {/* Live Auto-Drive Simulation Active Pill on Map */}
        {isAutoDriving && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            zIndex: 1000,
            padding: '6px 12px',
            borderRadius: '20px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid #0284c7',
            color: '#38bdf8',
            fontSize: '11px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} className="live-pulse" />
            <span>Auto-Drive Active • 24 km/h Simulation</span>
          </div>
        )}
      </div>

      {/* Telemetry Output Log */}
      {telemetryMsg && (
        <div style={{
          padding: '8px 16px',
          background: '#090d16',
          borderTop: '1px solid #1e293b',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: arrived ? '#34d399' : '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {arrived ? <CheckCircle2 size={13} style={{ color: '#34d399' }} /> : <Zap size={13} style={{ color: '#0284c7' }} />}
          <span>{telemetryMsg}</span>
        </div>
      )}

      {/* Cockpit Actions Toolbar */}
      <div style={{
        padding: '12px 18px',
        background: '#0f172a',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Left: Simulation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={toggleAutoDrive}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: isAutoDriving ? '#ef4444' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: isAutoDriving ? '1px solid #dc2626' : '1px solid #38bdf8',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
            }}
          >
            {isAutoDriving ? <Pause size={14} /> : <Play size={14} />}
            <span>{isAutoDriving ? 'Pause Auto-Drive' : 'Start Auto-Drive Simulation'}</span>
          </button>

          <button
            type="button"
            onClick={() => stepTowardsDestination(0.25)}
            disabled={isAutoDriving || updatingLocation}
            title="Advance 25% closer manually"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              fontSize: '11px',
              fontWeight: 700,
              cursor: isAutoDriving ? 'not-allowed' : 'pointer'
            }}
          >
            <Zap size={13} style={{ color: '#fbbf24' }} />
            <span>Step +25%</span>
          </button>

          <button
            type="button"
            onClick={handleResetPosition}
            title="Reset runner location to starting hub"
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Right: External Navigation & Arrival Prompt */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {arrived && onOpenVerifyModal ? (
            <button
              type="button"
              onClick={onOpenVerifyModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#10b981',
                color: '#0f172a',
                border: 'none',
                fontSize: '12px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              <CheckCircle2 size={15} />
              <span>{isPickupLeg ? 'Collect Pickup OTP & Seal Pouch' : 'Enter Delivery Confirmation OTP'}</span>
            </button>
          ) : (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <span>Google Maps Turn-by-Turn</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
