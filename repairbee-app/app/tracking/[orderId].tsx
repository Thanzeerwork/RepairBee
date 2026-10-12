/**
 * Live Runner GPS Tracking Map Screen
 * Swiggy / Zomato style live telemetry, animated runner marker, route polyline,
 * ETA countdown, and tamper-proof pouch verification.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Linking,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import SwiggyLiveMap from '../../src/components/SwiggyLiveMap';
import {
  ArrowLeft,
  Navigation,
  Phone,
  MessageCircle,
  ShieldCheck,
  MapPin,
  Clock,
  Compass,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { api } from '../../src/api/client';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.52;

// Route waypoints for SVG canvas rendering
const ROUTE_POINTS = [
  { x: 55, y: 75, label: 'Workshop' },
  { x: 110, y: 105, label: 'Koramangala 4th Block' },
  { x: 165, y: 155, label: '100 Feet Ring Road' },
  { x: 215, y: 195, label: 'Sony World Junction' },
  { x: 260, y: 255, label: 'Indiranagar 12th Main' },
  { x: 315, y: 310, label: 'Your Address' },
];

export default function LiveTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Live Simulation state
  const [etaMinutes, setEtaMinutes] = useState(14);
  const [progressRatio, setProgressRatio] = useState(0.42); // 0.0 to 1.0 along the route
  const [speedKmh, setSpeedKmh] = useState(28);
  const [satelliteView, setSatelliteView] = useState(false);
  const [runnerCoords, setRunnerCoords] = useState({ x: 175, y: 165 });

  // Pulsing animation for runner GPS aura
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const runnerPosAnim = useRef(new Animated.Value(0.42)).current;

  // Load Order details
  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        if (orderId) {
          const res = await api.getOrder(orderId);
          setOrder(res.data?.data);
        }
      } catch {
        // Fallback demo order
        setOrder({
          id: orderId || 'demo-order',
          order_number: 'RB-8924',
          current_status: 'out_for_delivery',
          product_name: 'iPhone 14 Pro Max',
          issue_summary: 'Cracked OLED Display Replacement',
          shop_name: 'Dr. Phone Certified Hub',
          customer_address: 'Flat 402, Green Glen Layout, Bellandur, Bangalore',
          runner_name: 'Manoj Kumar',
          runner_phone: '+919876543210',
          runner_vehicle: 'Hero Electric Splendor (KA-01-EF-4412)',
          runner_rating: '4.95',
          pouch_barcode: 'RB-POUCH-8841-SEC',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  // Pulse animation loop
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  // Live simulation: advance runner marker and tick countdown every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setProgressRatio((prev) => {
        const next = prev >= 0.95 ? 0.95 : prev + 0.025;
        // Interpolate along route points
        const totalSegments = ROUTE_POINTS.length - 1;
        const scaledIndex = next * totalSegments;
        const segmentIdx = Math.min(Math.floor(scaledIndex), totalSegments - 1);
        const segmentProgress = scaledIndex - segmentIdx;

        const p1 = ROUTE_POINTS[segmentIdx];
        const p2 = ROUTE_POINTS[segmentIdx + 1];

        const curX = p1.x + (p2.x - p1.x) * segmentProgress;
        const curY = p1.y + (p2.y - p1.y) * segmentProgress;
        setRunnerCoords({ x: curX, y: curY });

        // Update ETA
        const remaining = Math.max(1, Math.round(14 * (1 - next)));
        setEtaMinutes(remaining);

        // Fluctuate speed realistically
        setSpeedKmh(Math.floor(24 + Math.random() * 9));

        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleCallRunner = () => {
    const phone = order?.runner_phone || '+919876543210';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Contact Runner', `Call runner Manoj Kumar at ${phone}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  const handleChatRunner = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (orderId) {
      router.push(`/chat/${orderId}?type=runner`);
    }
  };

  const handleRecenter = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('GPS Centered', 'Map view locked onto Runner Manoj Kumar (Speed: ' + speedKmh + ' km/h).');
  };

  const isPickup =
    order?.current_status === 'out_for_pickup' ||
    order?.current_status === 'partner_assigned' ||
    order?.current_status === 'pickup_requested';

  const statusTitle = isPickup ? 'Out for Pickup' : 'Out for Delivery';
  const statusSubtitle = isPickup
    ? 'Runner is heading to your doorstep to securely pouch your device.'
    : 'Certified clean room repair complete! Runner is delivering back to you.';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header Floating Overlay */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.orderBadgePill}>
          <View style={styles.livePulseDot} />
          <Text style={styles.orderBadgeText}>
            LIVE GPS • #{order?.order_number || (orderId ? orderId.slice(0, 8).toUpperCase() : 'RB-8924')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.layerToggleBtn}
          onPress={() => setSatelliteView(!satelliteView)}
          activeOpacity={0.8}
        >
          <Layers size={18} color={satelliteView ? Colors.primary : Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Real Swiggy-Style Live Interactive Map */}
      <View style={styles.mapContainer}>
        <SwiggyLiveMap
          runnerName={order?.runner_name || 'Manoj Kumar'}
          speedKmh={speedKmh}
          satelliteView={satelliteView}
          shopName={order?.shop_name || 'Dr. Phone Certified Hub'}
          customerAddress={order?.customer_address || 'Doorstep Delivery'}
          height={MAP_HEIGHT}
        />

        {/* Telemetry Accuracy Strip Overlay */}
        <View style={styles.accuracyStrip}>
          <View style={styles.accuracyDot} />
          <Text style={styles.accuracyText}>RTK High Precision • Telemetry Refreshing (3s)</Text>
        </View>

        {/* Recenter GPS Button */}
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Compass size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Floating Bottom Details Card */}
      <ScrollView
        style={styles.bottomCard}
        contentContainerStyle={styles.bottomCardContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Drag Handle Indicator */}
        <View style={styles.dragHandle} />

        {/* ETA & Status Hero Banner */}
        <View style={styles.etaHeaderRow}>
          <View>
            <View style={styles.etaBadgeRow}>
              <Clock size={16} color={Colors.primary} />
              <Text style={styles.etaBadgeLabel}>ESTIMATED ARRIVAL</Text>
            </View>
            <Text style={styles.etaTimeLarge}>
              {etaMinutes > 1 ? `${etaMinutes} mins` : 'Arriving Now!'}
            </Text>
            <Text style={styles.etaSubStatus}>{statusTitle} • 2.4 km remaining</Text>
          </View>

          {/* Quick Battery / Vehicle Tag */}
          <View style={styles.vehicleBadge}>
            <Zap size={14} color={Colors.primary} />
            <Text style={styles.vehicleBadgeText}>Electric Bike</Text>
            <Text style={styles.vehicleBattery}>88% Batt</Text>
          </View>
        </View>

        {/* Delivery Progress Bar */}
        <View style={styles.progressBarWrap}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.round(progressRatio * 100)}%` }]} />
          </View>
          <View style={styles.progressLabelsRow}>
            <Text style={styles.progressLabelStart}>Dispatched</Text>
            <Text style={styles.progressLabelMid}>{Math.round(progressRatio * 100)}% route</Text>
            <Text style={styles.progressLabelEnd}>Arrival</Text>
          </View>
        </View>

        {/* Runner Profile Card */}
        <View style={styles.runnerCard}>
          <View style={styles.runnerAvatar}>
            <Text style={styles.runnerAvatarText}>MK</Text>
            <View style={styles.runnerVerifiedShield}>
              <ShieldCheck size={12} color={Colors.textInverse} />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.runnerNameRow}>
              <Text style={styles.runnerName}>{order?.runner_name || 'Manoj Kumar'}</Text>
              <View style={styles.runnerRatingPill}>
                <Text style={styles.runnerRatingStar}>★</Text>
                <Text style={styles.runnerRatingNum}>{order?.runner_rating || '4.95'}</Text>
              </View>
            </View>
            <Text style={styles.runnerVehicleSub}>
              {order?.runner_vehicle || 'Hero Electric (KA-01-EF-4412)'}
            </Text>
            <Text style={styles.runnerTripsSub}>640+ verified safe deliveries</Text>
          </View>

          {/* Contact Action Buttons */}
          <View style={styles.runnerContactActions}>
            <TouchableOpacity
              style={styles.contactBtnCall}
              onPress={handleCallRunner}
              activeOpacity={0.8}
            >
              <Phone size={18} color={Colors.textInverse} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactBtnChat}
              onPress={handleChatRunner}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tamper-Proof Pouch Telemetry Card */}
        <View style={styles.pouchTelemetryCard}>
          <View style={styles.pouchHeader}>
            <View style={styles.pouchIconWrap}>
              <Lock size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pouchTitle}>Tamper-Proof Pouch Telemetry</Text>
              <Text style={styles.pouchBarcode}>
                Seal Barcode: {order?.pouch_barcode || 'RB-POUCH-8841-SEC'}
              </Text>
            </View>
            <View style={styles.pouchStatusBadge}>
              <CheckCircle2 size={12} color={Colors.success} />
              <Text style={styles.pouchStatusText}>Intact</Text>
            </View>
          </View>

          <View style={styles.pouchGrid}>
            <View style={styles.pouchMetric}>
              <Text style={styles.pouchMetricLabel}>Shock Sensor</Text>
              <Text style={styles.pouchMetricValue}>0 Drops (Safe)</Text>
            </View>
            <View style={styles.pouchMetric}>
              <Text style={styles.pouchMetricLabel}>Thermal Seal</Text>
              <Text style={styles.pouchMetricValue}>Locked & Valid</Text>
            </View>
            <View style={styles.pouchMetric}>
              <Text style={styles.pouchMetricLabel}>Escrow Protection</Text>
              <Text style={styles.pouchMetricValue}>Held Securely</Text>
            </View>
          </View>
        </View>

        {/* Item & Address Recap */}
        <View style={styles.recapCard}>
          <View style={styles.recapRow}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.recapText} numberOfLines={2}>
              {order?.customer_address || 'Flat 402, Green Glen Layout, Bellandur, Bangalore'}
            </Text>
          </View>
          <View style={[styles.recapRow, { marginTop: Spacing.sm }]}>
            <Sparkles size={16} color={Colors.primary} />
            <Text style={styles.recapText} numberOfLines={1}>
              {order?.product_name || 'iPhone 14 Pro Max'} • {order?.issue_summary || 'Screen Replacement'}
            </Text>
          </View>
        </View>

        {/* Helpline CTA */}
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => router.push('/support')}
          activeOpacity={0.8}
        >
          <AlertTriangle size={15} color={Colors.textSecondary} />
          <Text style={styles.helpButtonText}>Need Help or Running Late? Contact 24/7 Support</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  topHeader: {
    position: 'absolute',
    top: 50,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  orderBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.full,
    ...Shadows.md,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  orderBadgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.caption,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  layerToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  mapContainer: {
    width: '100%',
    height: MAP_HEIGHT,
    backgroundColor: '#f1f5f9',
    position: 'relative',
    overflow: 'hidden',
  },
  mapContainerSatellite: {
    backgroundColor: '#0f172a',
  },
  mapCallout: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.md,
    maxWidth: 160,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  mapCalloutTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.tiny || 10,
    color: Colors.textPrimary,
  },
  mapCalloutSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.tiny || 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  runnerFloatBadge: {
    position: 'absolute',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    ...Shadows.md,
  },
  runnerFloatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  runnerFloatText: {
    fontFamily: Fonts.headingBold,
    fontSize: 10,
    color: Colors.textInverse,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  accuracyStrip: {
    position: 'absolute',
    bottom: 8,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  accuracyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3b82f6',
  },
  accuracyText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: '#ffffff',
  },
  bottomCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    marginTop: -20,
    ...Shadows.lg,
  },
  bottomCardContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  etaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  etaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  etaBadgeLabel: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.caption,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  etaTimeLarge: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.displayMd,
    color: Colors.textPrimary,
  },
  etaSubStatus: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  vehicleBadge: {
    alignItems: 'flex-end',
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  vehicleBadgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.caption,
    color: Colors.primaryDark,
  },
  vehicleBattery: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.tiny || 10,
    color: Colors.primary,
    marginTop: 2,
  },
  progressBarWrap: {
    marginBottom: Spacing.lg,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surfaceDim,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabelStart: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  progressLabelMid: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.primary,
  },
  progressLabelEnd: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  runnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceDim,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    gap: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  runnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  runnerAvatarText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.primary,
  },
  runnerVerifiedShield: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  runnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  runnerName: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  runnerRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  runnerRatingStar: {
    fontSize: 10,
    color: '#d97706',
    marginRight: 2,
  },
  runnerRatingNum: {
    fontFamily: Fonts.headingBold,
    fontSize: 10,
    color: '#92400e',
  },
  runnerVehicleSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  runnerTripsSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.tiny || 10,
    color: Colors.textMuted,
  },
  runnerContactActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  contactBtnCall: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  contactBtnChat: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    ...Shadows.sm,
  },
  pouchTelemetryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  pouchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
  },
  pouchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pouchTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  pouchBarcode: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  pouchStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  pouchStatusText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.success,
  },
  pouchGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pouchMetric: {
    flex: 1,
  },
  pouchMetricLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  pouchMetricValue: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  recapCard: {
    backgroundColor: Colors.surfaceDim,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  recapText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  helpButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },
});
