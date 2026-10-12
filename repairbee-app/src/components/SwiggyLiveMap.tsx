import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface SwiggyLiveMapProps {
  runnerName?: string;
  speedKmh?: number;
  satelliteView?: boolean;
  shopName?: string;
  customerAddress?: string;
  height?: number;
}

export default function SwiggyLiveMap({
  runnerName = 'Manoj Kumar',
  speedKmh = 28,
  satelliteView = false,
  shopName = 'Dr. Phone Certified Hub',
  customerAddress = 'Doorstep Delivery',
  height = 380,
}: SwiggyLiveMapProps) {
  const webViewRef = useRef<WebView>(null);

  // Generate the full HTML for Leaflet with Swiggy-themed CartoDB Voyager tiles & live scooter
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
      border-radius: 12px;
      border: 1px solid #fc8019;
      white-space: nowrap;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      z-index: 12;
      letter-spacing: 0.3px;
    }

    /* Customer Pin */
    .cust-pin {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }
    .cust-pin-halo {
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.25);
      top: -7px;
      left: -7px;
      animation: swiggyPulse 2.5s infinite ease-out;
      pointer-events: none;
    }

    /* Workshop Pin */
    .shop-pin {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }

    /* Clean attribution & watermarks */
    .leaflet-control-attribution {
      font-size: 8px !important;
      background: rgba(255,255,255,0.7) !important;
      padding: 1px 4px !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    // Real Bangalore road network coordinates
    // Workshop (Indiranagar / MG Road) -> Koramangala 4th Block (Customer)
    var waypoints = [
      [12.9716, 77.5946], // Workshop Hub
      [12.9680, 77.6015],
      [12.9635, 77.6080],
      [12.9580, 77.6135],
      [12.9525, 77.6170],
      [12.9460, 77.6195],
      [12.9405, 77.6220],
      [12.9352, 77.6245]  // Customer Doorstep
    ];

    var isSatellite = ${satelliteView ? 'true' : 'false'};

    // Initialize Leaflet Map
    var map = L.map('map', {
      center: [12.9530, 77.6130],
      zoom: 14,
      zoomControl: false,
      attributionControl: true
    });

    // Swiggy / Uber style clean CartoDB Voyager tiles (or Satellite)
    var tileUrl = isSatellite
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '© OpenStreetMap, © CARTO'
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

    var runnerMarker = L.marker(waypoints[2], { icon: runnerIcon, zIndexOffset: 1000 }).addTo(map);

    // Fit map bounds to encompass route comfortably
    map.fitBounds(fullRoute.getBounds(), { padding: [40, 40] });

    // Smooth Live Runner Motion Simulation along the real roads
    var progress = 0.35;
    var totalSegments = waypoints.length - 1;

    function advanceRunner() {
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

      // Update traveled polyline
      var traveledPoints = waypoints.slice(0, segIdx + 1);
      traveledPoints.push([curLat, curLng]);
      traveledRoute.setLatLngs(traveledPoints);
    }

    setInterval(advanceRunner, 1500);

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
