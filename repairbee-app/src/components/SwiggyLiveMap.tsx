import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const MAPBOX_FALLBACK_B64 = 'cGsuZXlKMUlqb2ljbVZ3WVdseVltVmxJaXdpWVNJNkltTnRkalZwYVcxaVp6QXhaV2N5ZVhNM2JtaHpjSG93YVhNaWZRLmVMb3VNWmJJWnhwaHZzWklOVVlNcEE=';

function getMapboxToken(): string {
  if (process.env.EXPO_PUBLIC_MAPBOX_TOKEN) {
    return process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  }
  try {
    if (typeof atob === 'function') {
      return atob(MAPBOX_FALLBACK_B64);
    }
  } catch {}
  return '';
}

interface SwiggyLiveMapProps {
  runnerName?: string;
  speedKmh?: number;
  satelliteView?: boolean;
  shopName?: string;
  customerAddress?: string;
  height?: number;
  mapboxToken?: string;
  liveCoords?: { lat: number; lng: number } | null;
}

export default function SwiggyLiveMap({
  runnerName = 'Manoj Kumar',
  speedKmh = 28,
  satelliteView = false,
  shopName = 'Dr. Phone Certified Hub',
  customerAddress = 'Doorstep Delivery',
  height = 380,
  mapboxToken = getMapboxToken(),
  liveCoords = null,
}: SwiggyLiveMapProps) {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Send real-time coordinate updates from Socket.io into the Mapbox Leaflet canvas
  useEffect(() => {
    if (liveCoords && liveCoords.lat && liveCoords.lng) {
      const payload = JSON.stringify({
        type: 'UPDATE_COORDS',
        lat: liveCoords.lat,
        lng: liveCoords.lng,
        speed: speedKmh,
      });

      if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(payload, '*');
      } else if (webViewRef.current) {
        webViewRef.current.postMessage(payload);
      }
    }
  }, [liveCoords?.lat, liveCoords?.lng, speedKmh]);

  // Generate the full HTML for Leaflet powered by Mapbox high-definition vector tiles & live scooter
  const generateMapHtml = () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: ${satelliteView ? '#0f172a' : '#f8fafc'}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; }
    
    /* Swiggy Runner Pulsing Radar Effect */
    @keyframes swiggyPulse {
      0% { transform: scale(0.85); opacity: 0.9; }
      50% { transform: scale(1.45); opacity: 0.25; }
      100% { transform: scale(1.95); opacity: 0; }
    }
    
    @keyframes tagBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    .swiggy-radar-halo {
      position: absolute;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: rgba(252, 128, 25, 0.35);
      border: 2px solid rgba(252, 128, 25, 0.7);
      animation: swiggyPulse 2s infinite ease-out;
      top: -11px;
      left: -11px;
      pointer-events: none;
    }

    .swiggy-scooter-badge {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, #fc8019 0%, #e05e00 100%);
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 14px rgba(252, 128, 25, 0.65), 0 2px 6px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      position: relative;
      z-index: 10;
      transition: transform 0.4s ease;
    }

    .swiggy-speed-tag {
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      color: #ffedd5;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 9999px;
      white-space: nowrap;
      border: 1px solid #fc8019;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      z-index: 12;
      animation: tagBounce 3s infinite ease-in-out;
    }

    .shop-pin {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #3b82f6;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }

    .cust-pin {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #10b981;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }

    .cust-pin-halo {
      position: absolute;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.25);
      border: 1px solid rgba(16, 185, 129, 0.5);
      top: -8px;
      left: -8px;
      animation: swiggyPulse 2.5s infinite ease-out;
    }

    .leaflet-popup-content-wrapper {
      background: #1e293b;
      color: #f8fafc;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      border: 1px solid #334155;
    }
    .leaflet-popup-tip { background: #1e293b; }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    // Real City Road Waypoints (Bangalore: Indiranagar Hub -> Koramangala Doorstep)
    var waypoints = [
      [12.9784, 77.6408], // Start: Workshop Hub (Indiranagar 100 Feet Rd)
      [12.9715, 77.6350], // Waypoint 1: Domlur Flyover Corridor
      [12.9592, 77.6285], // Waypoint 2: Intermediate Ring Road
      [12.9470, 77.6250], // Waypoint 3: Ejipura Signal Link
      [12.9352, 77.6245], // End: Customer Residence (Koramangala 4th Block)
    ];

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true
    }).setView([12.9550, 77.6310], 13);

    var mapboxToken = "${mapboxToken}";
    var isSatellite = ${satelliteView ? 'true' : 'false'};

    // Official Mapbox Navigation Day vs Satellite Streets Vector Tiles
    var tileUrl = "";
    if (mapboxToken) {
      if (isSatellite) {
        tileUrl = "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}@2x?access_token=" + mapboxToken;
      } else {
        tileUrl = "https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/tiles/{z}/{x}/{y}@2x?access_token=" + mapboxToken;
      }
    } else {
      tileUrl = isSatellite
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    }

    L.tileLayer(tileUrl, {
      maxZoom: 20,
      tileSize: mapboxToken ? 512 : 256,
      zoomOffset: mapboxToken ? -1 : 0,
      attribution: mapboxToken
        ? '© Mapbox © OpenStreetMap'
        : '© OpenStreetMap contributors'
    }).addTo(map);

    // Zoom buttons in top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Full Route Polyline (Dashed Forward Route)
    var fullRoute = L.polyline(waypoints, {
      color: isSatellite ? '#38bdf8' : '#cbd5e1',
      weight: 5,
      dashArray: '8, 8',
      lineCap: 'round',
      opacity: 0.8
    }).addTo(map);

    // Completed Traveled Polyline (Vibrant Swiggy Orange)
    var traveledRoute = L.polyline([waypoints[0]], {
      color: '#fc8019',
      weight: 6,
      lineCap: 'round',
      opacity: 0.95
    }).addTo(map);

    // 1. Workshop Marker
    var shopIcon = L.divIcon({
      className: '',
      html: '<div style="position:relative;"><div class="shop-pin"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    L.marker(waypoints[0], { icon: shopIcon }).addTo(map).bindPopup('<b>${shopName}</b><br>Workshop Hub');

    // 2. Customer Doorstep Marker
    var custIcon = L.divIcon({
      className: '',
      html: '<div style="position:relative;"><div class="cust-pin-halo"></div><div class="cust-pin"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div></div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    L.marker(waypoints[waypoints.length - 1], { icon: custIcon }).addTo(map).bindPopup('<b>Your Doorstep</b><br>${customerAddress}');

    // 3. Live Swiggy Runner Scooter Marker
    var runnerIcon = L.divIcon({
      className: '',
      html: '<div style="position:relative;">' +
              '<div class="swiggy-radar-halo"></div>' +
              '<div class="swiggy-scooter-badge">' +
                '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">' +
                  '<circle cx="5.5" cy="17.5" r="3.5"/>' +
                  '<circle cx="18.5" cy="17.5" r="3.5"/>' +
                  '<path d="M15 6h-3.5L9 12h6l1.5-6z"/>' +
                  '<path d="M9 12l2.5 5.5"/>' +
                  '<path d="M18.5 17.5L15 6"/>' +
                '</svg>' +
              '</div>' +
              '<div class="swiggy-speed-tag">⚡ ${runnerName.split(' ')[0]} • ${speedKmh} km/h</div>' +
            '</div>',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    var initialPos = ${liveCoords && liveCoords.lat && liveCoords.lng ? `[${liveCoords.lat}, ${liveCoords.lng}]` : 'waypoints[2]'};
    var runnerMarker = L.marker(initialPos, { icon: runnerIcon, zIndexOffset: 1000 }).addTo(map);

    // Fit map bounds to encompass route comfortably
    map.fitBounds(fullRoute.getBounds(), { padding: [40, 40] });

    // Smooth Fallback Simulation along real roads when live GPS broadcast is idle
    var hasLiveBroadcast = ${liveCoords && liveCoords.lat ? 'true' : 'false'};
    var progress = 0.35;
    var totalSegments = waypoints.length - 1;

    function advanceRunner() {
      if (hasLiveBroadcast) return;
      progress += 0.015;
      if (progress > 0.98) progress = 0.35;

      var scaled = progress * totalSegments;
      var segIdx = Math.min(Math.floor(scaled), totalSegments - 1);
      var segProgress = scaled - segIdx;

      var p1 = waypoints[segIdx];
      var p2 = waypoints[segIdx + 1];

      var curLat = p1[0] + (p2[0] - p1[0]) * segProgress;
      var curLng = p1[1] + (p2[1] - p1[1]) * segProgress;

      runnerMarker.setLatLng([curLat, curLng]);

      var traveledPoints = waypoints.slice(0, segIdx + 1);
      traveledPoints.push([curLat, curLng]);
      traveledRoute.setLatLngs(traveledPoints);
    }

    var simInterval = setInterval(advanceRunner, 1500);

    // --- Real-Time Socket.io GPS Message Listener ---
    function handleLocationMessage(event) {
      try {
        var rawData = event.data;
        var data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        if (data && data.type === 'UPDATE_COORDS' && data.lat && data.lng) {
          hasLiveBroadcast = true;
          runnerMarker.setLatLng([data.lat, data.lng]);
          map.panTo([data.lat, data.lng], { animate: true, duration: 1.0 });

          if (data.speed) {
            var tagEl = document.querySelector('.swiggy-speed-tag');
            if (tagEl) {
              tagEl.innerHTML = '⚡ ${runnerName.split(' ')[0]} • ' + data.speed + ' km/h';
            }
          }
        }
      } catch (err) {}
    }

    window.addEventListener('message', handleLocationMessage);
    document.addEventListener('message', handleLocationMessage);

    // Recenter function accessible from window
    window.recenterOnRunner = function() {
      var pos = runnerMarker.getLatLng();
      map.setView(pos, 15, { animate: true });
    };
  </script>
</body>
</html>
`;

  const mapHtml = generateMapHtml();

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <iframe
          ref={iframeRef}
          srcDoc={mapHtml}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="Swiggy Live Map"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        scalesPageToFit={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
