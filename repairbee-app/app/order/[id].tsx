/**
 * Order Detail / Tracking Screen — Full order timeline
 * Matches Stitch design: Order Tracking
 */
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  MessageCircle, Phone, ArrowRight, CheckCircle2, Circle,
  Clock, AlertCircle, XCircle, Package, Truck, Wrench, Shield,
  Star, ShieldAlert, FileText, Navigation, ChevronRight,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { api } from '../../src/api/client';

const STATUS_STEPS = [
  { key: 'requested', label: 'Repair Requested', icon: Package },
  { key: 'quoted', label: 'Quote Sent', icon: Clock },
  { key: 'approved', label: 'Quote Approved', icon: CheckCircle2 },
  { key: 'paid', label: 'Payment Confirmed', icon: CheckCircle2 },
  { key: 'pickup_assigned', label: 'Pickup Assigned', icon: Truck },
  { key: 'picked_up', label: 'Picked Up', icon: Truck },
  { key: 'received_at_shop', label: 'Received at Shop', icon: Wrench },
  { key: 'diagnosis_complete', label: 'Diagnosis Complete', icon: Wrench },
  { key: 'repair_in_progress', label: 'Repair in Progress', icon: Wrench },
  { key: 'repair_completed', label: 'Repair Completed', icon: CheckCircle2 },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
  { key: 'confirmed', label: 'Confirmed by Customer', icon: Shield },
];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadOrder = async () => {
    try {
      setErrorMsg(null);
      const res = await api.getOrderById(id!);
      const data = res.data.data;
      setOrder({
        ...data,
        productName: data.product_name || data.productName,
        shopName: data.shop_name || data.shopName,
        shopRating: data.shop_rating || data.shopRating,
        quoteAmount: data.quote_amount || data.quoteAmount,
        paymentMethod: data.payment_method || data.paymentMethod,
        currentStatus: data.current_status || data.currentStatus,
        statusLogs: data.status_logs || data.statusLogs || [],
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Unable to load order details from database.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrder(); }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrder();
    setRefreshing(false);
  };

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    return STATUS_STEPS.findIndex((s) => s.key === order.currentStatus);
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Repair Order',
      'Are you sure you want to cancel this repair request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelOrder(id!);
              Alert.alert('Order Cancelled', 'Your repair order has been cancelled.');
              loadOrder();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Could not cancel order.');
            }
          },
        },
      ]
    );
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (errorMsg || !order) {
    return (
      <View style={styles.loadingContainer}>
        <AlertCircle size={44} color={Colors.error} />
        <Text style={styles.errorTitle}>Order Unavailable</Text>
        <Text style={styles.errorSubtitle}>{errorMsg || 'Order record not found in database.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOrder}>
          <Text style={styles.retryButtonText}>Refresh Order</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentIdx = getCurrentStepIndex();
  const completedStatuses = new Set((order.statusLogs || []).map((l: any) => l.status));

  return (
    <>
      <Stack.Screen options={{ headerTitle: `Order #${id?.slice(-6).toUpperCase()}` }} />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: Colors.primary + '15' }]}>
          <Wrench size={20} color={Colors.primary} />
          <Text style={[styles.statusBannerText, { color: Colors.primary }]}>
            {STATUS_STEPS[currentIdx]?.label || order.currentStatus}
          </Text>
        </View>

        {/* Device Info */}
        <View style={styles.infoCard}>
          <Text style={styles.deviceName}>{order.productName} — {order.description}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shop:</Text>
            <Text style={styles.infoValue}>{order.shopName} ⭐ {order.shopRating}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Quote:</Text>
            <Text style={styles.infoValue}>₹{order.quoteAmount}</Text>
            <View style={styles.paidChip}>
              <Text style={styles.paidChipText}>Paid via {order.paymentMethod}</Text>
            </View>
          </View>
        </View>

        {/* Quote Banner if Quote Received */}
        {currentIdx === 1 && (
          <TouchableOpacity
            style={styles.quoteActionCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/quote/${id}`)}
          >
            <View style={styles.quoteIconCircle}>
              <Clock size={20} color={Colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quoteActionTitle}>Quote Ready for Review</Text>
              <Text style={styles.quoteActionSub}>Review cost breakdown, warranty tier, and approve</Text>
            </View>
            <ArrowRight size={18} color={Colors.primary} />
          </TouchableOpacity>
        )}

        {/* Payment Banner if Quote Approved but Unpaid */}
        {currentIdx === 2 && (
          <TouchableOpacity
            style={[styles.quoteActionCard, { borderColor: Colors.primary }]}
            activeOpacity={0.8}
            onPress={() => router.push(`/payment/${id}`)}
          >
            <View style={[styles.quoteIconCircle, { backgroundColor: Colors.primary }]}>
              <Shield size={20} color={Colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quoteActionTitle}>Escrow Payment Pending</Text>
              <Text style={styles.quoteActionSub}>Lock ₹{order.quoteAmount} in Escrow to dispatch runner</Text>
            </View>
            <ArrowRight size={18} color={Colors.primary} />
          </TouchableOpacity>
        )}

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>Order Timeline</Text>
          {STATUS_STEPS.map((step, i) => {
            const isCompleted = completedStatuses.has(step.key);
            const isCurrent = step.key === order.currentStatus;
            const isPending = !isCompleted && !isCurrent;
            const logEntry = (order.statusLogs || []).find((l: any) => l.status === step.key);

            return (
              <View key={step.key} style={styles.timelineItem}>
                {/* Connector line */}
                {i > 0 && (
                  <View
                    style={[
                      styles.connector,
                      {
                        backgroundColor: isCompleted || isCurrent
                          ? Colors.success
                          : Colors.surfaceBorder,
                      },
                    ]}
                  />
                )}

                {/* Dot */}
                <View
                  style={[
                    styles.dot,
                    isCompleted && styles.dotCompleted,
                    isCurrent && styles.dotCurrent,
                    isPending && styles.dotPending,
                  ]}
                >
                  {isCompleted && <CheckCircle2 size={14} color={Colors.textInverse} />}
                  {isCurrent && <Clock size={14} color={Colors.textInverse} />}
                  {isPending && <Circle size={8} color={Colors.textMuted} />}
                </View>

                {/* Content */}
                <View style={[styles.timelineContent, isCurrent && styles.timelineContentActive]}>
                  <Text
                    style={[
                      styles.timelineLabel,
                      isPending && { color: Colors.textMuted },
                      isCurrent && { color: Colors.primary, fontFamily: Fonts.headingSemiBold },
                    ]}
                  >
                    {step.label}
                  </Text>
                  {logEntry && (
                    <Text style={styles.timelineTime}>{formatTime(logEntry.timestamp)}</Text>
                  )}
                  {logEntry?.note ? (
                    <Text style={styles.timelineNote}>{logEntry.note}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.chatShopButton}
            onPress={() => router.push(`/chat/${id}?type=shop`)}
          >
            <MessageCircle size={18} color={Colors.primary} />
            <Text style={styles.chatShopText}>Chat with Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatRunnerButton}
            onPress={() => router.push(`/chat/${id}?type=runner`)}
          >
            <MessageCircle size={18} color={Colors.textSecondary} />
            <Text style={styles.chatRunnerText}>Chat with Runner</Text>
          </TouchableOpacity>
        </View>

        {/* Live Runner GPS Tracking Map Button */}
        <TouchableOpacity
          style={styles.liveTrackingButton}
          activeOpacity={0.85}
          onPress={() => router.push(`/tracking/${id}`)}
        >
          <View style={styles.liveTrackingPulseWrap}>
            <View style={styles.liveTrackingPulseDot} />
            <Navigation size={18} color={Colors.textInverse} style={{ transform: [{ rotate: '45deg' }] }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.liveTrackingButtonTitle}>Live Runner GPS Tracking</Text>
            <Text style={styles.liveTrackingButtonSub}>Swiggy-style live bike route, ETA & speed</Text>
          </View>
          <ChevronRight size={18} color={Colors.textInverse} />
        </TouchableOpacity>

        {/* Tax Invoice CTA */}
        <TouchableOpacity
          style={styles.invoiceButton}
          activeOpacity={0.8}
          onPress={() => router.push(`/invoice/${id}`)}
        >
          <FileText size={16} color={Colors.primary} />
          <Text style={styles.invoiceButtonText}>View Tax Invoice & Warranty Stamp</Text>
        </TouchableOpacity>

        {/* Post-Delivery Actions */}
        {currentIdx >= 11 && (
          <View style={styles.postDeliveryActions}>
            <TouchableOpacity
              style={styles.ratingButton}
              activeOpacity={0.8}
              onPress={() => router.push(`/rating/${id}`)}
            >
              <Star size={18} color={Colors.textInverse} fill={Colors.textInverse} />
              <Text style={styles.ratingButtonText}>Rate Workshop & Runner</Text>
            </TouchableOpacity>

            <View style={styles.postDeliveryRow}>
              <TouchableOpacity
                style={styles.disputeButton}
                activeOpacity={0.8}
                onPress={() => router.push(`/dispute/${id}`)}
              >
                <ShieldAlert size={16} color={Colors.error} />
                <Text style={styles.disputeButtonText}>Raise Dispute (48h)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.warrantyShieldButton}
                activeOpacity={0.8}
                onPress={() => router.push('/warranties')}
              >
                <Shield size={16} color={Colors.primary} />
                <Text style={styles.warrantyShieldText}>Warranty Shield</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentIdx < 10 && (
          <TouchableOpacity style={styles.cancelLink} onPress={handleCancel}>
            <XCircle size={16} color={Colors.error} />
            <Text style={styles.cancelText}>Cancel Order</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorTitle: { fontFamily: Fonts.headingBold, fontSize: FontSizes.titleSm, color: Colors.textPrimary, marginTop: Spacing.md },
  errorSubtitle: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: Spacing.lg },
  retryButton: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  retryButtonText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodySm, color: Colors.textInverse },
  container: { flex: 1, backgroundColor: Colors.background },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.screenPadding, marginTop: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: Radius.lg,
  },
  statusBannerText: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyLg },
  quoteActionCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#fffbeb', borderWidth: 1.5, borderColor: '#f59e0b',
    marginHorizontal: Spacing.screenPadding, marginTop: Spacing.md,
    padding: Spacing.md, borderRadius: Radius.lg, ...Shadows.sm,
  },
  quoteIconCircle: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center',
  },
  quoteActionTitle: {
    fontFamily: Fonts.headingBold, fontSize: FontSizes.bodyMd, color: '#92400e',
  },
  quoteActionSub: {
    fontFamily: Fonts.body, fontSize: FontSizes.caption, color: '#b45309', marginTop: 2,
  },
  infoCard: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadows.sm,
  },
  deviceName: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.titleSm, color: Colors.textPrimary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  infoLabel: { fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textMuted },
  infoValue: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textPrimary },
  paidChip: {
    backgroundColor: Colors.successBg, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full, marginLeft: 'auto',
  },
  paidChipText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.labelSm, color: Colors.success },
  timelineSection: {
    marginHorizontal: Spacing.screenPadding, marginTop: Spacing.lg,
  },
  timelineTitle: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.titleSm, color: Colors.textPrimary, marginBottom: Spacing.md },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48, position: 'relative' },
  connector: { position: 'absolute', left: 11, top: -20, width: 2, height: 20, zIndex: -1 },
  dot: {
    width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.sm,
  },
  dotCompleted: { backgroundColor: Colors.success },
  dotCurrent: { backgroundColor: Colors.primary },
  dotPending: { backgroundColor: Colors.surfaceDim, borderWidth: 1, borderColor: Colors.surfaceBorder },
  timelineContent: { flex: 1, paddingBottom: Spacing.md },
  timelineContentActive: {
    backgroundColor: Colors.primaryMuted, marginLeft: -Spacing.sm, paddingLeft: Spacing.sm,
    paddingVertical: Spacing.sm, borderRadius: Radius.md,
  },
  timelineLabel: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textPrimary },
  timelineTime: { fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: 2 },
  timelineNote: { fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  actions: {
    flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.screenPadding, marginTop: Spacing.lg,
  },
  chatShopButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  chatShopText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.primary },
  chatRunnerButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceDim, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  chatRunnerText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textSecondary },
  liveTrackingButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.screenPadding, marginTop: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderRadius: Radius.xl, backgroundColor: Colors.primary,
    ...Shadows.md,
  },
  liveTrackingPulseWrap: {
    position: 'relative',
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center', alignItems: 'center',
  },
  liveTrackingPulseDot: {
    position: 'absolute', top: 3, right: 3,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#22c55e', borderWidth: 1.5, borderColor: Colors.primary,
  },
  liveTrackingButtonTitle: {
    fontFamily: Fonts.headingBold, fontSize: FontSizes.bodyMd, color: Colors.textInverse,
  },
  liveTrackingButtonSub: {
    fontFamily: Fonts.body, fontSize: FontSizes.caption, color: 'rgba(255, 255, 255, 0.85)', marginTop: 2,
  },
  invoiceButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: Spacing.screenPadding, marginTop: Spacing.md,
    paddingVertical: 13, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primary + '35',
  },
  invoiceButtonText: {
    fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyMd, color: Colors.primary,
  },
  postDeliveryActions: {
    marginHorizontal: Spacing.screenPadding, marginTop: Spacing.md, gap: Spacing.sm,
  },
  ratingButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: Radius.lg,
    ...Shadows.md,
  },
  ratingButtonText: {
    fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyMd, color: Colors.textInverse,
  },
  postDeliveryRow: {
    flexDirection: 'row', gap: Spacing.sm,
  },
  disputeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.error,
    paddingVertical: Spacing.sm, borderRadius: Radius.md,
  },
  disputeButtonText: {
    fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.caption, color: Colors.error,
  },
  warrantyShieldButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary,
    paddingVertical: Spacing.sm, borderRadius: Radius.md,
  },
  warrantyShieldText: {
    fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.caption, color: Colors.primary,
  },
  cancelLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: Spacing.md, paddingVertical: Spacing.sm,
  },
  cancelText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.error },
});
