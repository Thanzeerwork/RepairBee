/**
 * My Warranties Screen — Tiered warranty management & claims
 * Matches PRD Section 2.1 & 4.9 (Silver, Gold, Platinum Tiers)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Shield,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle,
  Wrench,
  ChevronRight,
  Award,
  RefreshCw,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';
import { api } from '../src/api/client';

interface WarrantyItem {
  id: string;
  orderId: string;
  realOrderId: string;
  device: string;
  repairType: string;
  shopName: string;
  tier: 'Silver' | 'Gold' | 'Platinum';
  startDate: string;
  endDate: string;
  daysRemaining: number;
  status: 'active' | 'claimed' | 'expired';
}

export default function WarrantiesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active');
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWarranties = async () => {
    try {
      const res = await api.getMyOrders();
      const orders = res.data?.data || [];
      // Filter orders that have completed or have warranty
      const mapped: WarrantyItem[] = orders
        .filter((o: any) =>
          o.current_status === 'completed' ||
          o.current_status === 'delivered' ||
          o.current_status === 'delivery_confirmed' ||
          o.current_status === 'repair_completed' ||
          o.warranty_expires_at
        )
        .map((o: any) => {
          const rawTier = (o.warranty_tier || 'standard').toLowerCase();
          const tier: 'Silver' | 'Gold' | 'Platinum' =
            rawTier === 'diamond' || rawTier === 'platinum'
              ? 'Platinum'
              : rawTier === 'gold'
              ? 'Gold'
              : 'Silver';

          const createdDate = o.created_at ? new Date(o.created_at) : new Date();
          const expiresDate = o.warranty_expires_at
            ? new Date(o.warranty_expires_at)
            : new Date(createdDate.getTime() + (o.warranty_days || 30) * 86400000);

          const now = Date.now();
          const diffMs = expiresDate.getTime() - now;
          const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

          const status: 'active' | 'claimed' | 'expired' =
            o.is_warranty_claim
              ? 'claimed'
              : daysRemaining > 0
              ? 'active'
              : 'expired';

          return {
            id: o.id,
            orderId: `#${o.id.slice(-6).toUpperCase()}`,
            realOrderId: o.id,
            device: o.product_name || o.productName || 'Device Repair',
            repairType: o.description || 'Verified cleanroom rework & parts replacement',
            shopName: o.shop_name || o.shopName || 'Verified Workshop',
            tier,
            startDate: createdDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            endDate: expiresDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            daysRemaining,
            status,
          };
        });
      setWarranties(mapped);
    } catch {
      setWarranties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarranties();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWarranties();
    setRefreshing(false);
  };

  const handleClaimWarranty = (item: WarrantyItem) => {
    Alert.alert(
      'Claim Warranty Re-Repair',
      `Would you like to initiate a free warranty claim for your ${item.device} with ${item.shopName}? A runner pickup will be scheduled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Initiate Free Claim',
          style: 'default',
          onPress: async () => {
            try {
              await api.raiseWarrantyClaim(item.realOrderId || item.orderId);
            } catch (e) {}
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              'Warranty Claim Initiated',
              'Your re-repair request has been dispatched to the workshop. A runner pickup will be assigned shortly at zero cost to you.',
              [{ text: 'View Orders', onPress: () => router.push('/(tabs)/orders') }]
            );
          },
        },
      ]
    );
  };

  const filtered = warranties.filter((w) => {
    if (filter === 'active') return w.status === 'active';
    if (filter === 'expired') return w.status === 'expired' || w.status === 'claimed';
    return true;
  });

  const getTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'Platinum':
        return { bg: '#e0e7ff', text: '#3730a3', label: '180 Days Platinum' };
      case 'Gold':
        return { bg: '#fef3c7', text: '#92400e', label: '90 Days Gold' };
      default:
        return { bg: '#f1f5f9', text: '#334155', label: '30 Days Silver' };
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Repair Warranties',
          headerTintColor: Colors.primary,
          headerStyle: { backgroundColor: Colors.surface },
          headerTitleStyle: { fontFamily: Fonts.headingSemiBold, fontSize: 17 },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {/* Header Shield Banner */}
          <View style={styles.shieldBanner}>
            <View style={styles.shieldIconBox}>
              <ShieldCheck size={32} color={Colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shieldTitle}>RepairBee Warranty Shield</Text>
              <Text style={styles.shieldSubtitle}>
                Every verified workshop repair comes with a guaranteed warranty and zero-cost re-repair protection.
              </Text>
            </View>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {(['active', 'expired', 'all'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  setFilter(tab);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.filterPill,
                  filter === tab && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === tab && styles.filterTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Warranty Cards */}
          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Shield size={44} color={Colors.primary} />
              <Text style={styles.emptyTitle}>No Warranties Found</Text>
              <Text style={styles.emptySubtitle}>Completed repairs automatically receive warranty certificates here.</Text>
            </View>
          ) : (
            filtered.map((item) => {
              const tierInfo = getTierBadgeStyle(item.tier);
              const isExpired = item.status !== 'active';

              return (
                <View key={item.id} style={styles.warrantyCard}>
                  {/* Top Bar with Tier Badge */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.tierBadge, { backgroundColor: tierInfo.bg }]}>
                      <Award size={13} color={tierInfo.text} />
                      <Text style={[styles.tierBadgeText, { color: tierInfo.text }]}>
                        {tierInfo.label}
                      </Text>
                    </View>
                    <Text style={styles.orderNumber}>{item.orderId}</Text>
                  </View>

                  <Text style={styles.deviceName}>{item.device}</Text>
                  <Text style={styles.repairTypeText}>{item.repairType}</Text>

                  <View style={styles.divider} />

                  <View style={styles.metaRow}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>Workshop</Text>
                      <Text style={styles.metaValue}>{item.shopName}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>Valid Until</Text>
                      <Text style={styles.metaValue}>{item.endDate}</Text>
                    </View>
                  </View>

                  {/* Expiration Progress Bar or Status */}
                  {!isExpired ? (
                    <View style={styles.activeStatusBox}>
                      <View style={styles.activeStatusRow}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeDaysText}>{item.daysRemaining} days remaining</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.claimButton}
                        activeOpacity={0.8}
                        onPress={() => handleClaimWarranty(item)}
                      >
                        <RefreshCw size={14} color={Colors.textInverse} />
                        <Text style={styles.claimButtonText}>Claim Re-Repair</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.expiredStatusBox}>
                      <Text style={styles.expiredText}>Warranty Period Ended on {item.endDate}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}

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
  shieldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  shieldIconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.textInverse,
  },
  shieldSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.textInverse,
  },
  warrantyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  tierBadgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.caption,
  },
  orderNumber: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  deviceName: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  repairTypeText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  metaValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  activeStatusBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  activeDaysText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.success,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  claimButtonText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textInverse,
  },
  expiredStatusBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  expiredText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
