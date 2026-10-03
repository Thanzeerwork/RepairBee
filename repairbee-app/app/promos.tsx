/**
 * Promo Codes Screen — View active discount codes, voucher perks & apply
 * Matches PRD Section 4.13
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  Tag,
  Copy,
  Check,
  Percent,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';
import { api } from '../src/api/client';

interface Promo {
  id: string;
  code: string;
  discount_type: 'percent' | 'flat';
  discount_value: string | number;
  min_order_amount: string | number | null;
  max_discount_amount: string | number | null;
  expiry_date: string | null;
  description?: string;
}

const CURATED_PROMOS: Promo[] = [
  {
    id: 'firstfix',
    code: 'FIRSTFIX',
    discount_type: 'flat',
    discount_value: '100',
    min_order_amount: '500',
    max_discount_amount: null,
    expiry_date: null,
    description: 'Flat ₹100 OFF on your first device repair booking!',
  },
  {
    id: 'save20',
    code: 'SAVE20',
    discount_type: 'percent',
    discount_value: '20',
    min_order_amount: '300',
    max_discount_amount: '200',
    expiry_date: null,
    description: 'Get 20% discount up to ₹200 on all smartphone & laptop fixes.',
  },
  {
    id: 'sosrush',
    code: 'SOSRUSH',
    discount_type: 'flat',
    discount_value: '150',
    min_order_amount: '1000',
    max_discount_amount: null,
    expiry_date: null,
    description: 'Save ₹150 on priority 60-minute SOS doorstep pickups.',
  },
  {
    id: 'honeycomb50',
    code: 'HONEYCOMB50',
    discount_type: 'flat',
    discount_value: '50',
    min_order_amount: '250',
    max_discount_amount: null,
    expiry_date: null,
    description: 'RepairBee community voucher for verified customer accounts.',
  },
];

export default function PromosScreen() {
  const router = useRouter();
  const [promos, setPromos] = useState<Promo[]>(CURATED_PROMOS);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    async function loadPromos() {
      try {
        setLoading(true);
        const res = await api.getActivePromos();
        const serverPromos = res.data?.data || [];
        if (serverPromos.length > 0) {
          // Merge unique codes
          const combined = [...serverPromos];
          CURATED_PROMOS.forEach((cp) => {
            if (!combined.some((p) => p.code?.toUpperCase() === cp.code)) {
              combined.push(cp);
            }
          });
          setPromos(combined);
        }
      } catch {
        // Fallback to curated promos
      } finally {
        setLoading(false);
      }
    }
    loadPromos();
  }, []);

  const handleCopy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleTestCode = async () => {
    if (!inputCode.trim()) {
      Alert.alert('Enter Code', 'Please enter a coupon code to test.');
      return;
    }

    try {
      setValidating(true);
      // Validate with sample order amount
      const cleanCode = inputCode.trim().toUpperCase();
      const matched = promos.find((p) => p.code?.toUpperCase() === cleanCode);
      if (matched) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const desc =
          matched.discount_type === 'percent'
            ? `${matched.discount_value}% OFF (Max ₹${matched.max_discount_amount || 200})`
            : `₹${matched.discount_value} FLAT OFF`;
        Alert.alert(
          '🎉 Coupon Valid!',
          `Code "${cleanCode}" gives ${desc} on orders above ₹${matched.min_order_amount || 0}.`,
          [
            { text: 'Copy & Use', onPress: () => handleCopy(cleanCode) },
            { text: 'Book Now', onPress: () => router.push('/booking') },
          ]
        );
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Invalid Code', `Code "${cleanCode}" is not active or has expired.`);
      }
    } finally {
      setValidating(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Promo Codes & Offers',
          headerTintColor: Colors.primary,
          headerStyle: { backgroundColor: Colors.surface },
          headerTitleStyle: { fontFamily: Fonts.headingSemiBold, fontSize: 17 },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Hero Banner */}
          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Sparkles size={14} color="#b45309" />
              <Text style={styles.heroBadgeText}>EXCLUSIVE SAVINGS</Text>
            </View>
            <Text style={styles.heroTitle}>Smart Savings for Every Repair</Text>
            <Text style={styles.heroSub}>
              Apply these verified coupon codes at checkout to unlock instant discounts and free pickup perks.
            </Text>
          </View>

          {/* Code Tester Bar */}
          <View style={styles.testerContainer}>
            <Text style={styles.testerLabel}>Have a special voucher code?</Text>
            <View style={styles.testerInputRow}>
              <TextInput
                style={styles.testerInput}
                placeholder="Enter coupon code (e.g. FIRSTFIX)"
                placeholderTextColor={Colors.textMuted}
                value={inputCode}
                onChangeText={(t) => setInputCode(t.toUpperCase())}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleTestCode}
                disabled={validating}
                activeOpacity={0.8}
              >
                {validating ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.applyBtnText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Promo Codes List */}
          <Text style={styles.sectionHeader}>Available Coupons ({promos.length})</Text>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 30 }} />
          ) : (
            promos.map((promo) => {
              const isCopied = copiedCode === promo.code;
              const isPercent = promo.discount_type === 'percent';
              const minVal = promo.min_order_amount ? Number(promo.min_order_amount) : 0;

              return (
                <View key={promo.id} style={styles.promoCard}>
                  {/* Left coupon stub with perforated border effect */}
                  <View style={styles.couponLeft}>
                    <View style={styles.couponIconCircle}>
                      {isPercent ? (
                        <Percent size={22} color={Colors.primary} />
                      ) : (
                        <Tag size={22} color={Colors.primary} />
                      )}
                    </View>
                    <Text style={styles.discountBig}>
                      {isPercent ? `${promo.discount_value}%` : `₹${promo.discount_value}`}
                    </Text>
                    <Text style={styles.discountTypeLabel}>
                      {isPercent ? 'DISCOUNT' : 'FLAT OFF'}
                    </Text>
                  </View>

                  {/* Right coupon details */}
                  <View style={styles.couponRight}>
                    <View style={styles.codeRow}>
                      <View style={styles.dashedCodeBox}>
                        <Text style={styles.codeText}>{promo.code}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.copyBtn, isCopied && styles.copyBtnDone]}
                        onPress={() => handleCopy(promo.code)}
                        activeOpacity={0.7}
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} color={Colors.success} />
                            <Text style={styles.copiedText}>Copied</Text>
                          </>
                        ) : (
                          <>
                            <Copy size={14} color={Colors.primary} />
                            <Text style={styles.copyBtnText}>Copy</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.promoDescription}>
                      {promo.description ||
                        `Save ${isPercent ? `${promo.discount_value}%` : `₹${promo.discount_value}`} on your repair order.`}
                    </Text>

                    <View style={styles.rulesRow}>
                      {minVal > 0 && (
                        <View style={styles.ruleBadge}>
                          <Text style={styles.ruleBadgeText}>Min Order ₹{minVal}</Text>
                        </View>
                      )}
                      <View style={styles.ruleBadge}>
                        <ShieldCheck size={11} color={Colors.textSecondary} />
                        <Text style={styles.ruleBadgeText}>Verified</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Bottom CTA to start repair */}
          <TouchableOpacity
            style={styles.bookCTA}
            activeOpacity={0.85}
            onPress={() => router.push('/booking')}
          >
            <View>
              <Text style={styles.bookCTATitle}>Ready to book a repair?</Text>
              <Text style={styles.bookCTASub}>Apply coupon at confirmation step</Text>
            </View>
            <View style={styles.bookCTAArrow}>
              <ArrowRight size={18} color={Colors.textInverse} />
            </View>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
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
  heroCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  heroBadgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 10,
    color: '#b45309',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  heroSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  testerContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  testerLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  testerInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  testerInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  applyBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textInverse,
  },
  sectionHeader: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  promoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  couponLeft: {
    width: 105,
    backgroundColor: Colors.primaryLight,
    borderRightWidth: 1.5,
    borderRightColor: Colors.primary + '30',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  couponIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    ...Shadows.sm,
  },
  discountBig: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.primary,
  },
  discountTypeLabel: {
    fontFamily: Fonts.headingBold,
    fontSize: 9,
    color: Colors.primary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  couponRight: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dashedCodeBox: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.background,
  },
  codeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: Colors.primary,
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  copyBtnDone: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success + '40',
  },
  copyBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.primary,
  },
  copiedText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.success,
  },
  promoDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  rulesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  ruleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  ruleBadgeText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  bookCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  bookCTATitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textInverse,
  },
  bookCTASub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  bookCTAArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
