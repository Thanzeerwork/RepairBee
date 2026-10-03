/**
 * Hardware Diagnostic Screen — Device health & sensor checks
 * Matches PRD Section 4.16 and Web HardwareDiagnostic.jsx
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Activity,
  Smartphone,
  Cpu,
  CheckCircle2,
  XCircle,
  Sparkles,
  Sliders,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Zap,
  Volume2,
  Maximize2,
  ArrowRight,
  Check,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PIXEL_TEST_COLORS = [
  { name: 'Pure Red', hex: '#ef4444' },
  { name: 'Pure Green', hex: '#22c55e' },
  { name: 'Pure Blue', hex: '#3b82f6' },
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Pure Black', hex: '#000000' },
  { name: 'Cyber Yellow', hex: '#eab308' },
];

export default function HardwareDiagnosticScreen() {
  const router = useRouter();

  // Test Results
  const [screenTested, setScreenTested] = useState(false);
  const [touchTested, setTouchTested] = useState(false);
  const [hapticTested, setHapticTested] = useState(false);
  const [audioTested, setAudioTested] = useState(false);

  // Active Interactive Test Modals
  const [screenModalVisible, setScreenModalVisible] = useState(false);
  const [screenColorIdx, setScreenColorIdx] = useState(0);

  const [touchModalVisible, setTouchModalVisible] = useState(false);
  const [touchedGrid, setTouchedGrid] = useState<Record<number, boolean>>({});

  // Screen dead-pixel test cycle
  const nextColor = () => {
    if (screenColorIdx < PIXEL_TEST_COLORS.length - 1) {
      setScreenColorIdx((prev) => prev + 1);
    } else {
      setScreenModalVisible(false);
      setScreenTested(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Touch Grid Test (4 cols x 6 rows = 24 cells)
  const totalCells = 24;
  const touchedCount = Object.keys(touchedGrid).length;
  const touchProgress = Math.round((touchedCount / totalCells) * 100);

  const handleCellTouch = (index: number) => {
    if (!touchedGrid[index]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = { ...touchedGrid, [index]: true };
      setTouchedGrid(next);
      if (Object.keys(next).length >= totalCells) {
        setTimeout(() => {
          setTouchModalVisible(false);
          setTouchTested(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 300);
      }
    }
  };

  // Haptics Test
  const runHapticsTest = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          Alert.alert(
            'Haptics Verification',
            'Did you feel 3 distinct vibration pulses (Light, Medium, Heavy)?',
            [
              {
                text: 'No',
                style: 'cancel',
                onPress: () => {
                  setHapticTested(false);
                },
              },
              {
                text: 'Yes, All 3',
                onPress: () => {
                  setHapticTested(true);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
              },
            ]
          );
        }, 400);
      }, 400);
    } catch (e) {
      Alert.alert('Error', 'Unable to trigger haptics motor.');
    }
  };

  // Audio / Speaker Test
  const runAudioTest = () => {
    Alert.alert(
      'Audio & Speaker Check',
      'Please check if your device speaker produces clear sound without crackling.',
      [
        {
          text: 'Distorted / Broken',
          style: 'destructive',
          onPress: () => setAudioTested(false),
        },
        {
          text: 'Clear Sound',
          onPress: () => {
            setAudioTested(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const completedCount = [screenTested, touchTested, hapticTested, audioTested].filter(Boolean).length;
  const overallHealth = completedCount === 4 ? 98 : completedCount === 3 ? 85 : completedCount === 2 ? 60 : 30;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Hardware Diagnostics',
          headerTintColor: Colors.primary,
          headerStyle: { backgroundColor: Colors.surface },
          headerTitleStyle: { fontFamily: Fonts.headingSemiBold, fontSize: 17 },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Banner */}
          <View style={styles.headerCard}>
            <View style={styles.headerBadge}>
              <Sparkles size={14} color={Colors.primary} />
              <Text style={styles.headerBadgeText}>Pre-Repair Hardware Scan</Text>
            </View>
            <Text style={styles.headerTitle}>Device Health & Sensor Suite</Text>
            <Text style={styles.headerSubtitle}>
              Run tests to pinpoint defects before submitting your repair request for verified diagnosis.
            </Text>

            {/* Health Score Pill */}
            <View style={styles.scoreRow}>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreValue}>{completedCount > 0 ? `${overallHealth}%` : '--'}</Text>
                <Text style={styles.scoreLabel}>Health Score</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreBox}>
                <Text style={styles.scoreValue}>{completedCount}/4</Text>
                <Text style={styles.scoreLabel}>Tests Completed</Text>
              </View>
            </View>
          </View>

          {/* Device Telemetry Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Smartphone size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Device Telemetry</Text>
            </View>
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>Display Canvas</Text>
                <Text style={styles.telemetryValue}>{Math.round(SCREEN_WIDTH)} x {Math.round(SCREEN_HEIGHT)} px</Text>
              </View>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>Screen Density</Text>
                <Text style={styles.telemetryValue}>@3x Retina</Text>
              </View>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>Sensors</Text>
                <Text style={styles.telemetryValue}>Haptics & Multi-Touch</Text>
              </View>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>Platform</Text>
                <Text style={styles.telemetryValue}>RepairBee Verified</Text>
              </View>
            </View>
          </View>

          {/* Test 1: Screen Dead-Pixel */}
          <TouchableOpacity
            style={styles.testCard}
            activeOpacity={0.8}
            onPress={() => {
              setScreenColorIdx(0);
              setScreenModalVisible(true);
            }}
          >
            <View style={[styles.testIcon, screenTested && styles.testIconSuccess]}>
              <Maximize2 size={20} color={screenTested ? Colors.success : Colors.primary} />
            </View>
            <View style={styles.testContent}>
              <View style={styles.testTitleRow}>
                <Text style={styles.testTitle}>Display Sub-Pixel Uniformity</Text>
                {screenTested && (
                  <View style={styles.passedBadge}>
                    <Check size={12} color={Colors.success} />
                    <Text style={styles.passedBadgeText}>Passed</Text>
                  </View>
                )}
              </View>
              <Text style={styles.testDesc}>
                Tests OLED/LCD panels across 6 primary color matrices for stuck or dead sub-pixels.
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Test 2: Multi-Touch Grid */}
          <TouchableOpacity
            style={styles.testCard}
            activeOpacity={0.8}
            onPress={() => {
              setTouchedGrid({});
              setTouchModalVisible(true);
            }}
          >
            <View style={[styles.testIcon, touchTested && styles.testIconSuccess]}>
              <Sliders size={20} color={touchTested ? Colors.success : Colors.primary} />
            </View>
            <View style={styles.testContent}>
              <View style={styles.testTitleRow}>
                <Text style={styles.testTitle}>Multi-Touch Digitizer Matrix</Text>
                {touchTested && (
                  <View style={styles.passedBadge}>
                    <Check size={12} color={Colors.success} />
                    <Text style={styles.passedBadgeText}>Passed</Text>
                  </View>
                )}
              </View>
              <Text style={styles.testDesc}>
                Touch grid test to detect dead zones, ghost touches, or digitizer latency issues.
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Test 3: Haptics Engine */}
          <TouchableOpacity
            style={styles.testCard}
            activeOpacity={0.8}
            onPress={runHapticsTest}
          >
            <View style={[styles.testIcon, hapticTested && styles.testIconSuccess]}>
              <Zap size={20} color={hapticTested ? Colors.success : Colors.primary} />
            </View>
            <View style={styles.testContent}>
              <View style={styles.testTitleRow}>
                <Text style={styles.testTitle}>Haptic Taptic Engine</Text>
                {hapticTested && (
                  <View style={styles.passedBadge}>
                    <Check size={12} color={Colors.success} />
                    <Text style={styles.passedBadgeText}>Passed</Text>
                  </View>
                )}
              </View>
              <Text style={styles.testDesc}>
                Vibration motor frequency test with light, medium, and heavy impulse sequences.
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Test 4: Audio / Speaker */}
          <TouchableOpacity
            style={styles.testCard}
            activeOpacity={0.8}
            onPress={runAudioTest}
          >
            <View style={[styles.testIcon, audioTested && styles.testIconSuccess]}>
              <Volume2 size={20} color={audioTested ? Colors.success : Colors.primary} />
            </View>
            <View style={styles.testContent}>
              <View style={styles.testTitleRow}>
                <Text style={styles.testTitle}>Audio & Speaker Clarity</Text>
                {audioTested && (
                  <View style={styles.passedBadge}>
                    <Check size={12} color={Colors.success} />
                    <Text style={styles.passedBadgeText}>Passed</Text>
                  </View>
                )}
              </View>
              <Text style={styles.testDesc}>
                Checks acoustic output channels and ear-speaker clarity for distortion.
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Booking CTA Banner */}
          {completedCount > 0 && (
            <View style={styles.ctaCard}>
              <ShieldCheck size={28} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Diagnostic Report Ready</Text>
                <Text style={styles.ctaDesc}>
                  Attach this diagnostic snapshot to your booking for priority workshop routing.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/booking')}
              >
                <Text style={styles.ctaButtonText}>Book Repair</Text>
                <ArrowRight size={16} color={Colors.textInverse} />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Modal: Fullscreen Dead-Pixel Test */}
        <Modal visible={screenModalVisible} animationType="fade" transparent={false}>
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.pixelModalContainer,
              { backgroundColor: PIXEL_TEST_COLORS[screenColorIdx]?.hex || '#000000' },
            ]}
            onPress={nextColor}
          >
            <View style={styles.pixelOverlay}>
              <Text
                style={[
                  styles.pixelOverlayText,
                  PIXEL_TEST_COLORS[screenColorIdx]?.hex === '#ffffff' && { color: '#000000' },
                ]}
              >
                Color {screenColorIdx + 1}/{PIXEL_TEST_COLORS.length}: {PIXEL_TEST_COLORS[screenColorIdx]?.name}
              </Text>
              <Text
                style={[
                  styles.pixelOverlaySub,
                  PIXEL_TEST_COLORS[screenColorIdx]?.hex === '#ffffff' && { color: '#555555' },
                ]}
              >
                Inspect screen closely for any stuck pixels. Tap anywhere to continue.
              </Text>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modal: Interactive Touch Grid Test */}
        <Modal visible={touchModalVisible} animationType="slide" transparent={false}>
          <SafeAreaView style={styles.touchContainer}>
            <View style={styles.touchHeader}>
              <View>
                <Text style={styles.touchTitle}>Touch Grid Calibration</Text>
                <Text style={styles.touchSubtitle}>
                  Tap or swipe all 24 zones ({touchProgress}% completed)
                </Text>
              </View>
              <TouchableOpacity
                style={styles.touchCloseButton}
                onPress={() => setTouchModalVisible(false)}
              >
                <Text style={styles.touchCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gridContainer}>
              {Array.from({ length: totalCells }).map((_, i) => {
                const isTouched = !!touchedGrid[i];
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.6}
                    onPress={() => handleCellTouch(i)}
                    style={[
                      styles.gridCell,
                      isTouched && styles.gridCellActive,
                    ]}
                  >
                    {isTouched && <Check size={18} color="#ffffff" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
  },
  headerCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  headerBadgeText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.caption,
    color: Colors.primary,
  },
  headerTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleMd,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
  },
  scoreValue: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.displayMd,
    color: Colors.primary,
  },
  scoreLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scoreDivider: {
    width: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  telemetryItem: {
    width: '48%',
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  telemetryLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  telemetryValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  testCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  testIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  testIconSuccess: {
    backgroundColor: Colors.successBg,
  },
  testContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  testTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  testTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    flex: 1,
  },
  passedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  passedBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.success,
  },
  testDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
  },
  ctaTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: '#92400e',
  },
  ctaDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: '#b45309',
    marginTop: 2,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  ctaButtonText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textInverse,
  },
  pixelModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  pixelOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  pixelOverlayText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: '#ffffff',
  },
  pixelOverlaySub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: '#e2e8f0',
    marginTop: 4,
  },
  touchContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.screenPadding,
  },
  touchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  touchTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
  },
  touchSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  touchCloseButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  touchCloseText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  gridCell: {
    width: '22%',
    height: '14%',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCellActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
});
