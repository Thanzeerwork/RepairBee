/**
 * Orders Screen — My active and completed repair orders
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, MessageCircle, Package } from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { api } from '../../src/api/client';
import { useFocusEffect } from 'expo-router';

type TabType = 'active' | 'completed' | 'cancelled';

export default function OrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [orders, setOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const res = await api.getMyOrders({ status: activeTab });
      setOrders(res.data.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [activeTab])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const getStatusColor = (status: string) => {
    if (status.includes('completed') || status.includes('delivered') || status.includes('confirmed'))
      return Colors.success;
    if (status.includes('progress') || status.includes('pickup'))
      return Colors.primary;
    if (status.includes('cancelled'))
      return Colors.error;
    return Colors.secondaryMuted;
  };

  const formatStatus = (status: string) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const renderOrder = ({ item }: { item: any }) => {
    const status = item.current_status || item.currentStatus || 'repair_requested';
    const productName = item.product_name || item.productName || 'Device Repair';
    const shopName = item.shop_name || item.shopName || 'Pending shop quotes';
    const quoteAmount = item.quote_amount || item.quoteAmount || item.total_amount || null;
    const orderNum = item.order_number || item.id?.slice(-6).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/order/${item.id}`)}
      >
        <View style={styles.orderHeader}>
          <View style={[styles.statusChip, { backgroundColor: getStatusColor(status) + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
              {formatStatus(status)}
            </Text>
          </View>
          <Text style={styles.orderId}>#{orderNum}</Text>
        </View>

        <Text style={styles.orderDevice}>{productName}</Text>
        <Text style={styles.orderIssue}>{item.description || 'Repair request'}</Text>

        <View style={styles.orderMeta}>
          <Text style={styles.orderShop}>{shopName}</Text>
          <Text style={styles.orderAmount}>{quoteAmount ? `₹${quoteAmount}` : 'Quote pending'}</Text>
        </View>

      {activeTab === 'active' && (
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => router.push(`/order/${item.id}`)}
          >
            <Package size={14} color={Colors.primary} />
            <Text style={styles.trackButtonText}>Track</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <MessageCircle size={14} color={Colors.textSecondary} />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'completed' && !item.hasRating && (
        <TouchableOpacity
          style={styles.rateButton}
          onPress={() => router.push(`/rating/${item.id}`)}
        >
          <Text style={styles.rateButtonText}>⭐ Rate this repair</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>My Orders</Text>

      {/* Tab Filters */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No {activeTab} orders</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'active'
                ? 'Book a repair to get started!'
                : `Your ${activeTab} orders will appear here.`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: {
    fontFamily: Fonts.headingBold, fontSize: FontSizes.titleLg,
    color: Colors.textPrimary, paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.md,
  },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.screenPadding,
    marginTop: Spacing.md, gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textInverse },
  list: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.md, paddingBottom: 32 },
  orderCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm,
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: Radius.full, gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.caption },
  orderId: { fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textMuted },
  orderDevice: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyLg, color: Colors.textPrimary },
  orderIssue: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary, marginTop: 2 },
  orderMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  orderShop: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.caption, color: Colors.textMuted },
  orderAmount: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyMd, color: Colors.textPrimary },
  orderActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  trackButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  trackButtonText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.primary },
  chatButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceDim, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  chatButtonText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textSecondary },
  rateButton: {
    marginTop: Spacing.sm, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.primaryMuted, alignItems: 'center',
  },
  rateButtonText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.titleMd, color: Colors.textPrimary },
  emptySubtitle: {
    fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textSecondary,
    textAlign: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.xl,
  },
});
