import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Compass, CheckCircle2 } from 'lucide-react';

// Custom SVG Pin Icon for RepairBee
const customPinIcon = L.divIcon({
  className: 'rb-map-pin',
  html: `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      cursor: grab;
    ">
      <div style="
        width: 38px;
        height: 38px;
        border-radius: 50% 50% 50% 0;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 12px rgba(217, 119, 6, 0.45);
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 14px;
          height: 14px;
          background: #ffffff;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
      <div style="
        width: 8px;
        height: 4px;
        background: rgba(15, 23, 42, 0.35);
        border-radius: 50%;
        margin-top: 2px;
        filter: blur(1px);
      "></div>
    </div>
  `,
  iconSize: [38, 44],
  iconAnchor: [19, 44],
});

const BANGALORE_PRESETS = [
  { name: 'MG Road / Central', lat: 12.9716, lng: 77.5946 },
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { name: 'HSR Layout', lat: 12.9121, lng: 77.6446 },
  { name: 'Whitefield', lat: 12.9698, lng: 77.7500 },
];

export default function LocationPickerMap({
  coordinates = { lat: 12.9716, lng: 77.5946 },
  onChange,
  onAddressHint,
  height = 240
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [currentCoords, setCurrentCoords] = useState(coordinates);
  const [locating, setLocating] = useState(false);
  const [activePreset, setActivePreset] = useState('MG Road / Central');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Avoid double initialization
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet map
    const initialLat = coordinates?.lat || 12.9716;
    const initialLng = coordinates?.lng || 77.5946;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add draggable pin marker
    const marker = L.marker([initialLat, initialLng], {
      icon: customPinIcon,
      draggable: true,
      autoPan: true,
    }).addTo(map);

    markerRef.current = marker;

    const updatePin = (lat, lng, presetName = null) => {
      const fixedLat = parseFloat(lat.toFixed(6));
      const fixedLng = parseFloat(lng.toFixed(6));
      setCurrentCoords({ lat: fixedLat, lng: fixedLng });
      setActivePreset(presetName);
      if (onChange) {
        onChange({ lat: fixedLat, lng: fixedLng });
      }
    };

    // Listen to marker dragend
    marker.on('dragend', (e) => {
      const latlng = e.target.getLatLng();
      updatePin(latlng.lat, latlng.lng, null);
    });

    // Listen to map click to reposition marker
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      updatePin(e.latlng.lat, e.latlng.lng, null);
    });

    // Invalidate size shortly after mount in case container resized
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Reactively pan to coordinates if changed by parent (e.g. user selects a saved address card)
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    if (coordinates?.lat && coordinates?.lng) {
      const curPos = markerRef.current.getLatLng();
      const diffLat = Math.abs(curPos.lat - coordinates.lat);
      const diffLng = Math.abs(curPos.lng - coordinates.lng);
      if (diffLat > 0.0001 || diffLng > 0.0001) {
        mapInstanceRef.current.flyTo([coordinates.lat, coordinates.lng], 15, { duration: 0.8 });
        markerRef.current.setLatLng([coordinates.lat, coordinates.lng]);
        setCurrentCoords({
          lat: parseFloat(coordinates.lat.toFixed(6)),
          lng: parseFloat(coordinates.lng.toFixed(6))
        });
      }
    }
  }, [coordinates?.lat, coordinates?.lng]);

  const handleSelectPreset = (preset) => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    mapInstanceRef.current.flyTo([preset.lat, preset.lng], 15, { duration: 1 });
    markerRef.current.setLatLng([preset.lat, preset.lng]);
    setCurrentCoords({ lat: preset.lat, lng: preset.lng });
    setActivePreset(preset.name);
    if (onChange) onChange({ lat: preset.lat, lng: preset.lng });
    if (onAddressHint) onAddressHint(preset.name);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.2 });
          markerRef.current.setLatLng([latitude, longitude]);
          const fixedLat = parseFloat(latitude.toFixed(6));
          const fixedLng = parseFloat(longitude.toFixed(6));
          setCurrentCoords({ lat: fixedLat, lng: fixedLng });
          setActivePreset('My Location');
          if (onChange) onChange({ lat: fixedLat, lng: fixedLng });
        }
      },
      (err) => {
        setLocating(false);
        console.warn('Geolocation error:', err);
        // Default to central preset if denied
        handleSelectPreset(BANGALORE_PRESETS[0]);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div style={{
      border: '1.5px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: '#ffffff',
      boxShadow: 'var(--shadow-sm)',
      marginTop: '12px',
      marginBottom: '20px'
    }}>
      {/* Map Control Header */}
      <div style={{
        padding: '12px 16px',
        background: '#0f172a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'rgba(245, 158, 11, 0.2)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MapPin size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>
              Pin Exact Pickup Doorstep Location
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Click on map or drag pin to your building entrance
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Navigation size={12} className={locating ? 'live-pulse' : ''} />
            <span>{locating ? 'Locating...' : 'Use My GPS'}</span>
          </button>

          <div style={{
            padding: '5px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <CheckCircle2 size={12} />
            <span>{currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div style={{
        padding: '8px 14px',
        background: '#f8fafc',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto'
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Compass size={12} />
          <span>Quick Hubs:</span>
        </span>
        {BANGALORE_PRESETS.map((p) => {
          const isSelected = activePreset === p.name;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => handleSelectPreset(p)}
              style={{
                padding: '4px 10px',
                borderRadius: '14px',
                background: isSelected ? 'var(--primary)' : '#ffffff',
                color: isSelected ? '#ffffff' : 'var(--secondary)',
                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-default)',
                fontSize: '11px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Leaflet Map Canvas Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: typeof height === 'number' ? `${height}px` : height,
          background: '#e2e8f0',
          position: 'relative',
          zIndex: 1
        }}
      />

      {/* Coordinates Confirmation Footer Strip */}
      <div style={{
        padding: '8px 14px',
        background: '#f8fafc',
        borderTop: '1px solid var(--border-default)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>📍 Pinned Coordinates: <strong style={{ color: 'var(--secondary)' }}>{currentCoords.lat}, {currentCoords.lng}</strong></span>
        <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>Runner navigates directly to this pin</span>
      </div>
    </div>
  );
}
