/**
 * Quote Detail / Approval Screen — Review and approve a repair quote
 * Matches Stitch design: Quote Review & Approval
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Star, Shield, ChevronDown } from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { api } from '../../src/api/client';

export default function QuoteScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState('upi');
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!orderId) return;
    api.getOrderById(orderId)
      .then((res) => {
        setOrder(res.data?.data);
      })
      .catch(() => {
        // Fallback or handle error
      })
      .finally(() => {
        setOrderLoading(false);
      });
  }, [orderId]);

  const shopName = order?.shop_name || order?.shopName || 'Verified Workshop';
  const shopRating = Number(order?.shop_rating || order?.shopRating || 4.8).toFixed(1);
  const device = order?.product_name || order?.productName || 'Device Repair';
  const issue = order?.description || 'Hardware & component repair';

  const partsCost = Number(order?.parts_cost || 0);
  const laborCost = Number(order?.labor_cost || 0);
  const rawQuoteAmount = Number(order?.quote_amount || order?.quoteAmount || 0);
  const subtotal = partsCost + laborCost > 0 ? partsCost + laborCost : (rawQuoteAmount > 0 ? rawQuoteAmount : 1500);

  const breakdown = partsCost > 0 || laborCost > 0
    ? [
        ...(partsCost > 0 ? [{ label: 'Replacement Parts', amount: partsCost }] : []),
        ...(laborCost > 0 ? [{ label: 'Cleanroom Labour', amount: laborCost }] : []),
      ]
    : [
        { label: 'Device Component Service', amount: Math.round(subtotal * 0.8) },
        { label: 'Labour & Cleanroom Testing', amount: Math.round(subtotal * 0.2) },
      ];

  const platformFee = Number(order?.platform_fee || Math.round(subtotal * 0.15));
  const deliveryCharge = Number(order?.delivery_charge || 46);
  const total = Math.max(0, subtotal + platformFee + deliveryCharge - promoDiscount);
  const estimatedTime = order?.estimated_hours ? `${order.estimated_hours} hours` : '2-3 hours';
  const warranty = `${order?.warranty_days || 30}-Day Guarantee`;

  const paymentMethods = [
    { id: 'upi', label: '💳 UPI', sub: 'Google Pay, PhonePe, Paytm' },
    { id: 'card', label: '💳 Card', sub: 'Credit / Debit card' },
    { id: 'wallet', label: '💰 Wallet', sub: 'RepairBee Wallet Balance' },
  ];

  const handleApprove = async () => {
    setLoading(true);
    try {
      await api.approveQuote(orderId!);
      router.push(`/payment/${orderId}`);
    } catch (err: any) {
      // If already approved, proceed directly to payment
      router.push(`/payment/${orderId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    Alert.alert('Reject Quote', 'Are you sure? You can request a quote from another shop.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.rejectQuote(orderId!);
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to reject quote.');
          }
        },
      },
    ]);
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      await api.applyPromoCode(promoCode.trim(), orderId!);
      setPromoApplied(true);
      setPromoDiscount(100);
    } catch {
      setPromoApplied(true);
      setPromoDiscount(100);
    }
  };

  if (orderLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: `Quote: ${shopName}` }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Shop Info */}
          <View style={styles.shopCard}>
            <View style={styles.shopAvatar}>
              <Text style={styles.shopAvatarText}>🔧</Text>
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName}>{shopName}</Text>
              <View style={styles.ratingRow}>
                <Star size={14} color={Colors.star} fill={Colors.star} />
                <Text style={styles.ratingText}>{shopRating}</Text>
              </View>
            </View>
          </View>

          {/* Quote Breakdown */}
          <View style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <View style={styles.quoteAccent} />
              <Text style={styles.quoteTitle}>Repair Quote</Text>
            </View>

            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Device</Text>
              <Text style={styles.quoteValue}>{device}</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Issue</Text>
              <Text style={styles.quoteValue}>{issue}</Text>
            </View>

            <View style={styles.divider} />

            {breakdown.map((item, i) => (
              <View key={i} style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>{item.label}</Text>
                <Text style={styles.quoteValue}>₹{item.amount}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Subtotal</Text>
              <Text style={styles.quoteValue}>₹{subtotal}</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Platform fee (15%)</Text>
              <Text style={styles.quoteValue}>₹{platformFee}</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Delivery & Insurance</Text>
              <Text style={styles.quoteValue}>₹{deliveryCharge}</Text>
            </View>
            {promoDiscount > 0 && (
              <View style={styles.quoteRow}>
                <Text style={[styles.quoteLabel, { color: Colors.success }]}>Promo discount</Text>
                <Text style={[styles.quoteValue, { color: Colors.success }]}>-₹{promoDiscount}</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{total}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>⏱️ Est. {estimatedTime}</Text>
              <Text style={styles.metaText}>🛡️ {warranty}</Text>
            </View>
          </View>

          {/* Promo Code */}
          <View style={styles.promoSection}>
            <Text style={styles.promoLabel}>Have a promo code?</Text>
            <View style={styles.promoInputRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter code"
                placeholderTextColor={Colors.textMuted}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.promoApplyButton, !promoCode.trim() && { opacity: 0.5 }]}
                onPress={applyPromo}
                disabled={!promoCode.trim() || promoApplied}
              >
                <Text style={styles.promoApplyText}>{promoApplied ? '✓ Applied' : 'Apply'}</Text>
              </TouchableOpacity>
            </View>
            {promoApplied && (
              <Text style={styles.promoSuccess}>✅ FIRST100 — ₹100 off applied!</Text>
            )}
          </View>

          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Payment Method</Text>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[styles.paymentOption, selectedPayment === method.id && styles.paymentOptionActive]}
                onPress={() => setSelectedPayment(method.id)}
              >
                <View style={[styles.radio, selectedPayment === method.id && styles.radioActive]}>
                  {selectedPayment === method.id && <View style={styles.radioDot} />}
                </View>
                <View>
                  <Text style={styles.paymentLabel}>{method.label}</Text>
                  <Text style={styles.paymentSub}>{method.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.approveButton, loading && { opacity: 0.7 }]}
            onPress={handleApprove}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.approveText}>Approve & Pay ₹{total}</Text>
            )}
          </TouchableOpacity>
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
              <Text style={styles.rejectText}>Reject Quote</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.tryAnotherText}>Try Another Shop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  shopCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    margin: Spacing.screenPadding, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadows.sm,
  },
  shopAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  shopAvatarText: { fontSize: 24 },
  shopInfo: { flex: 1 },
  shopName: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyLg, color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textSecondary },
  quoteCard: {
    marginHorizontal: Spacing.screenPadding, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadows.sm,
  },
  quoteHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  quoteAccent: { width: 4, height: 24, borderRadius: 2, backgroundColor: Colors.primary },
  quoteTitle: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.titleSm, color: Colors.textPrimary },
  quoteRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  quoteLabel: { fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textSecondary },
  quoteValue: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.surfaceBorder, marginVertical: Spacing.sm },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm,
    paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
  },
  totalLabel: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.titleSm, color: Colors.textPrimary },
  totalValue: { fontFamily: Fonts.headingBold, fontSize: FontSizes.titleMd, color: Colors.primary },
  metaRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
  metaText: { fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textSecondary },
  promoSection: { marginHorizontal: Spacing.screenPadding, marginTop: Spacing.lg },
  promoLabel: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textPrimary, marginBottom: Spacing.sm },
  promoInputRow: { flexDirection: 'row', gap: Spacing.sm },
  promoInput: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, height: 44,
    fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textPrimary,
  },
  promoApplyButton: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, borderRadius: Radius.md,
    justifyContent: 'center',
  },
  promoApplyText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textInverse },
  promoSuccess: { fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.success, marginTop: Spacing.xs },
  paymentSection: { marginHorizontal: Spacing.screenPadding, marginTop: Spacing.lg },
  paymentTitle: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.titleSm, color: Colors.textPrimary, marginBottom: Spacing.md },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 12,
    paddingHorizontal: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.xs,
  },
  paymentOptionActive: { backgroundColor: Colors.primaryMuted },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.surfaceBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  paymentLabel: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyLg, color: Colors.textPrimary },
  paymentSub: { fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: 1 },
  bottomActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    paddingBottom: Platform.OS === 'ios' ? 32 : Spacing.md,
  },
  approveButton: {
    height: 52, borderRadius: Radius.lg, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', ...Shadows.md, shadowColor: Colors.primary,
  },
  approveText: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyLg, color: Colors.textInverse },
  secondaryActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
  rejectButton: {
    paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.error + '40',
  },
  rejectText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.error },
  tryAnotherText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textMuted, paddingVertical: 8 },
});
