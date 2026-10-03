import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Compass,
  Phone,
  ShieldCheck,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  Maximize2,
  Sparkles
} from 'lucide-react';

// Haversine Distance Calculation in KM
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.4; // Realistic fallback default
  const R = 6371; // Radius of Earth in KM
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

// Custom Marker Icons
const createRunnerMarkerIcon = (runnerName = 'Courier Partner') => {
  return L.divIcon({
    className: 'rb-runner-live-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -50%);
        user-select: none;
      ">
        <!-- Animated Radar Beacon -->
        <div style="
          position: absolute;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: rgba(14, 165, 233, 0.25);
          border: 1.5px solid rgba(14, 165, 233, 0.6);
          animation: rb-pulse 2s infinite ease-out;
          top: -9px;
          left: -9px;
          pointer-events: none;
        "></div>

        <!-- Main Runner Badge -->
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0284c7, #0369a1);
          border: 3px solid #ffffff;
          box-shadow: 0 6px 18px rgba(2, 132, 199, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          z-index: 10;
        ">
          <!-- Scooter/Bike SVG -->
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="5.5" cy="17.5" r="3.5"/>
            <circle cx="18.5" cy="17.5" r="3.5"/>
            <path d="M15 6h-3.5L9 12h6l1.5-6z"/>
            <path d="M9 12l2.5 5.5"/>
            <path d="M18.5 17.5L15 6"/>
          </svg>
        </div>

        <!-- Dynamic Label Tag -->
        <div style="
          margin-top: 4px;
          background: #0f172a;
          color: #38bdf8;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 9999px;
          border: 1px solid #0284c7;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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

const createCustomerMarkerIcon = (label = 'Your Doorstep') => {
  return L.divIcon({
    className: 'rb-customer-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        user-select: none;
      ">
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #10b981, #059669);
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.5);
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        ">
          <svg style="transform: rotate(45deg);" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div style="
          margin-top: 3px;
          background: #064e3b;
          color: #6ee7b7;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid #10b981;
          white-space: nowrap;
        ">
          🏠 ${label}
        </div>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
  });
};

const createWorkshopMarkerIcon = (shopName = 'Fix It Electronics') => {
  return L.divIcon({
    className: 'rb-workshop-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        user-select: none;
      ">
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.5);
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        ">
          <svg style="transform: rotate(45deg);" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
        <div style="
          margin-top: 3px;
          background: #451a03;
          color: #fcd34d;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid #f59e0b;
          white-space: nowrap;
        ">
          🔬 ${shopName}
        </div>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
  });
};

export default function LiveRunnerTrackingMap({
  runnerCoords = { lat: 12.9550, lng: 77.6100 },
  customerCoords = { lat: 12.9352, lng: 77.6245, address: '18th Main, Koramangala' },
  workshopCoords = { lat: 12.9716, lng: 77.5946, name: 'Fix It Electronics Cleanroom' },
  runnerInfo = { name: 'Amit Sharma', phone: '+91 98765 43210', vehicle: 'Cleanroom EV Scooter • KA-01-RB-402' },
  legType = 'pickup', // 'pickup' | 'return'
  orderStatus = 'out_for_pickup',
  onCallCourier
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const runnerMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const workshopMarkerRef = useRef(null);
  const polylineRef = useRef(null);

  // Compute live distance and dynamic ETA
  const targetCoords = legType === 'pickup' ? customerCoords : (orderStatus === 'picked_up' ? workshopCoords : customerCoords);
  const distanceKm = calculateDistanceKm(
    runnerCoords.lat,
    runnerCoords.lng,
    targetCoords.lat,
    targetCoords.lng
  );

  // Average city traffic bike speed ~20 km/h
  const estimatedMins = Math.max(2, Math.round((distanceKm / 20) * 60));

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [runnerCoords.lat || 12.9550, runnerCoords.lng || 77.6100],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      // OpenStreetMap High-Clarity Tile Layer (Completely free, crisp, watermark-free)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // 1. Customer Marker
    const custLat = customerCoords.lat || 12.9352;
    const custLng = customerCoords.lng || 77.6245;
    if (customerMarkerRef.current) {
      customerMarkerRef.current.setLatLng([custLat, custLng]);
    } else {
      customerMarkerRef.current = L.marker([custLat, custLng], {
        icon: createCustomerMarkerIcon('Doorstep'),
        zIndexOffset: 50
      }).addTo(map);
    }

    // 2. Workshop Marker
    const shopLat = workshopCoords.lat || 12.9716;
    const shopLng = workshopCoords.lng || 77.5946;
    if (workshopMarkerRef.current) {
      workshopMarkerRef.current.setLatLng([shopLat, shopLng]);
    } else {
      workshopMarkerRef.current = L.marker([shopLat, shopLng], {
        icon: createWorkshopMarkerIcon(workshopCoords.name || 'Cleanroom Bay'),
        zIndexOffset: 50
      }).addTo(map);
    }

    // 3. Runner Marker
    const rLat = runnerCoords.lat || 12.9550;
    const rLng = runnerCoords.lng || 77.6100;
    if (runnerMarkerRef.current) {
      runnerMarkerRef.current.setLatLng([rLat, rLng]);
      runnerMarkerRef.current.setIcon(createRunnerMarkerIcon(runnerInfo.name || 'Courier'));
    } else {
      runnerMarkerRef.current = L.marker([rLat, rLng], {
        icon: createRunnerMarkerIcon(runnerInfo.name || 'Courier'),
        zIndexOffset: 100
      }).addTo(map);
    }

    // 4. Route Polyline
    const routePoints = [
      [rLat, rLng],
      [custLat, custLng]
    ];

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(routePoints);
    } else {
      polylineRef.current = L.polyline(routePoints, {
        color: '#0284c7',
        weight: 4,
        dashArray: '8, 8',
        lineCap: 'round',
        opacity: 0.85
      }).addTo(map);
    }

    // Auto fit bounds
    try {
      const bounds = L.latLngBounds([
        [rLat, rLng],
        [custLat, custLng],
        [shopLat, shopLng]
      ]);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    } catch {}

    return () => {
      // Map instance preserved across renders
    };
  }, []);

  // Update Runner Position Dynamically when props change
  useEffect(() => {
    if (!mapInstanceRef.current || !runnerCoords.lat || !runnerCoords.lng) return;
    const map = mapInstanceRef.current;

    const rLat = runnerCoords.lat;
    const rLng = runnerCoords.lng;

    if (runnerMarkerRef.current) {
      runnerMarkerRef.current.setLatLng([rLat, rLng]);
    }

    const custLat = customerCoords.lat || 12.9352;
    const custLng = customerCoords.lng || 77.6245;

    if (polylineRef.current) {
      polylineRef.current.setLatLngs([
        [rLat, rLng],
        [custLat, custLng]
      ]);
    }
  }, [runnerCoords.lat, runnerCoords.lng]);

  const handleCenterRunner = () => {
    if (mapInstanceRef.current && runnerCoords.lat && runnerCoords.lng) {
      mapInstanceRef.current.flyTo([runnerCoords.lat, runnerCoords.lng], 15, { duration: 1 });
    }
  };

  const handleFitRoute = () => {
    if (mapInstanceRef.current) {
      const custLat = customerCoords.lat || 12.9352;
      const custLng = customerCoords.lng || 77.6245;
      const rLat = runnerCoords.lat || 12.9550;
      const rLng = runnerCoords.lng || 77.6100;
      const bounds = L.latLngBounds([[rLat, rLng], [custLat, custLng]]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  return (
    <div style={{
      borderRadius: 'var(--radius-xl, 16px)',
      overflow: 'hidden',
      border: '1px solid #334155',
      background: '#0f172a',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* MAP TOP OVERLAY: LIVE ETA & DISTANCE PILL */}
      <div style={{
        position: 'absolute',
        top: '14px',
        left: '14px',
        right: '14px',
        zIndex: 400,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        pointerEvents: 'none'
      }}>
        {/* Dynamic ETA Badge */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '12px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          pointerEvents: 'auto'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Truck size={17} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} className="live-pulse"></span>
              <span>Live GPS Broadcast</span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              Arriving in ~{estimatedMins} mins <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>({distanceKm} km away)</span>
            </div>
          </div>
        </div>

        {/* Map Quick Controls */}
        <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={handleCenterRunner}
            style={{
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid #334155',
              color: '#38bdf8',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <Navigation size={13} />
            <span>Center Courier</span>
          </button>

          <button
            type="button"
            onClick={handleFitRoute}
            style={{
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid #334155',
              color: '#e2e8f0',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <Maximize2 size={13} />
            <span>Full Route</span>
          </button>
        </div>
      </div>

      {/* LEAFLET MAP CANVAS */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '320px',
          background: '#1e293b',
          zIndex: 10
        }}
      />

      {/* DEDICATED COURIER IDENTITY & CONTACT FOOTER */}
      <div style={{
        padding: '16px 20px',
        background: '#090d16',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Runner Profile Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e3a8a, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              fontWeight: 800,
              color: '#ffffff',
              border: '2px solid #38bdf8'
            }}>
              {(runnerInfo.name || 'Amit').slice(0, 2).toUpperCase()}
            </div>
            <div style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #090d16',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={10} color="#ffffff" />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                {runnerInfo.name || 'Amit Sharma'}
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '1px 6px',
                borderRadius: '4px'
              }}>
                Verified Partner
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {runnerInfo.vehicle || 'Cleanroom EV Scooter • Anti-Static Secure Carrier'}
            </div>
          </div>
        </div>

        {/* Live Action Dial / Message Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href={`tel:${runnerInfo.phone || '+919876543210'}`}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              border: '1px solid #38bdf8',
              borderRadius: 'var(--radius-md, 8px)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              cursor: 'pointer'
            }}
          >
            <Phone size={14} />
            <span>Call Courier</span>
          </a>

          <div style={{
            fontSize: '11px',
            color: '#cbd5e1',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid #334155',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md, 8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <ShieldCheck size={14} color="#34d399" />
            <span>Tamper Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
}
