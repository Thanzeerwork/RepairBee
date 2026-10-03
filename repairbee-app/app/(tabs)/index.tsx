/**
 * Home Screen — Main dashboard with greeting, categories, active repairs
 * Matches Stitch design: Home Dashboard
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  Search,
  MapPin,
  ChevronRight,
  Smartphone,
  Laptop,
  Tv,
  AirVent,
  Refrigerator,
  WashingMachine,
  Zap,
  ArrowRight,
  Activity,
  Star,
  Wrench,
  Cpu,
  Clock,
  Navigation,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/api/client';

const DEVICE_CATEGORIES = [
  { id: 'smartphone', label: 'Smartphone', icon: Smartphone, color: '#3b82f6' },
  { id: 'laptop', label: 'Laptop', icon: Laptop, color: '#8b5cf6' },
  { id: 'television', label: 'Television', icon: Tv, color: '#ef4444' },
  { id: 'ac', label: 'AC', icon: AirVent, color: '#06b6d4' },
  { id: 'refrigerator', label: 'Fridge', icon: Refrigerator, color: '#059669' },
  { id: 'washing-machine', label: 'Washer', icon: WashingMachine, color: '#f97316' },
];

interface ActiveOrder {
  id: string;
  productName: string;
  issueSummary: string;
  shopName: string;
  currentStatus: string;
  progress: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState('Select Location');

  const firstName = user?.name?.split(' ')[0] || 'there';

  const loadData = async () => {
    try {
      const [ordersRes, notifRes, productsRes, shopsRes, addrsRes] = await Promise.allSettled([
        api.getMyOrders({ status: 'active' }),
        api.getNotifications(),
        api.getProducts(),
        api.getShops(),
        api.getAddresses(),
      ]);

      if (ordersRes.status === 'fulfilled') {
        const rawOrders = ordersRes.value.data?.data || [];
        const formatted = rawOrders.map((o: any) => ({
          id: o.id,
          productName: o.product_name || o.productName || 'Device Repair',
          shopName: o.shop_name || o.shopName || 'Finding best workshop quotes...',
          currentStatus: o.current_status || o.currentStatus || 'repair_requested',
          issueSummary: o.description || o.issueSummary || 'Repair request',
          progress:
            o.current_status === 'delivery_confirmed' || o.current_status === 'delivered'
              ? 100
              : o.current_status === 'repair_in_progress'
              ? 65
              : 25,
        }));
        setActiveOrders(formatted);
      }
      if (notifRes.status === 'fulfilled') {
        const notifData = notifRes.value.data;
        const unreadCount =
          typeof notifData?.unread_count === 'number'
            ? notifData.unread_count
            : (notifData?.data || []).filter(
                (n: any) => n.is_read === false || n.isRead === false
              ).length;
        setNotificationCount(unreadCount);
      }
      if (productsRes.status === 'fulfilled') {
        const raw = productsRes.value.data?.data || {};
        const flattened = Array.isArray(raw)
          ? raw
          : [...(raw.electronics || []), ...(raw.appliances || [])];
        if (flattened.length > 0) {
          setProducts(flattened);
        }
      }
      if (shopsRes.status === 'fulfilled') {
        setShops(shopsRes.value.data?.data || []);
      }
      if (addrsRes.status === 'fulfilled') {
        const addrs = addrsRes.value.data?.data || [];
        if (addrs.length > 0) {
          const defaultAddr = addrs.find((a: any) => a.is_default || a.isDefault) || addrs[0];
          setCurrentLocation(defaultAddr.city || defaultAddr.label || 'Home');
        } else {
          setCurrentLocation('Add Address');
        }
      }
    } catch {
      // Silently handle
    }
  };

  const getProductMeta = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('phone')) return { icon: Smartphone, color: '#3b82f6' };
    if (n.includes('laptop')) return { icon: Laptop, color: '#8b5cf6' };
    if (n.includes('tablet')) return { icon: Smartphone, color: '#0ea5e9' };
    if (n.includes('desktop')) return { icon: Cpu, color: '#6366f1' };
    if (n.includes('tv') || n.includes('television')) return { icon: Tv, color: '#ef4444' };
    if (n.includes('ac')) return { icon: AirVent, color: '#06b6d4' };
    if (n.includes('fridge') || n.includes('refrigerator')) return { icon: Refrigerator, color: '#059669' };
    if (n.includes('washing') || n.includes('washer')) return { icon: WashingMachine, color: '#f97316' };
    if (n.includes('microwave')) return { icon: Zap, color: '#eab308' };
    return { icon: Wrench, color: '#d97706' };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const getStatusColor = (status: string) => {
    if (status.includes('completed') || status.includes('delivered')) return Colors.success;
    if (status.includes('progress') || status.includes('pickup')) return Colors.primary;
    if (status.includes('cancelled')) return Colors.error;
    return Colors.secondaryMuted;
  };

  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
              <TouchableOpacity
                style={styles.locationPill}
                onPress={() => router.push('/addresses')}
              >
                <MapPin size={12} color={Colors.primary} />
                <Text style={styles.locationText}>{currentLocation}</Text>
                <ChevronRight size={12} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => router.push('/notifications')}
          >
            <Bell size={22} color={Colors.textPrimary} />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.7}
          onPress={() => router.push('/shops')}
        >
          <Search size={18} color={Colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search workshops, devices, repairs...</Text>
        </TouchableOpacity>

        {/* Hero Banner */}
        <TouchableOpacity
          style={styles.heroBanner}
          activeOpacity={0.9}
          onPress={() => router.push('/booking')}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Need a repair?</Text>
            <Text style={styles.heroSubtitle}>
              We'll pick up, fix, and deliver{'\n'}back to your doorstep.
            </Text>
            <View style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Book Now</Text>
              <ArrowRight size={16} color={Colors.textPrimary} />
            </View>
          </View>
          <View style={styles.heroBee}>
            <Text style={styles.heroBeeEmoji}>🐝</Text>
          </View>
        </TouchableOpacity>

        {/* SOS Banner */}
        <TouchableOpacity
          style={styles.sosBanner}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/booking', params: { isSos: 'true' } })}
        >
          <Zap size={18} color={Colors.warning} fill={Colors.warning} />
          <Text style={styles.sosText}>Need urgent repair? Try </Text>
          <Text style={styles.sosHighlight}>SOS Mode</Text>
          <Text style={styles.sosText}> — pickup in 60 mins!</Text>
        </TouchableOpacity>

        {/* Hardware Diagnostics Banner */}
        <TouchableOpacity
          style={styles.diagBanner}
          activeOpacity={0.8}
          onPress={() => router.push('/diagnostics')}
        >
          <View style={styles.diagIconWrap}>
            <Activity size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.diagTitle}>Run Hardware Diagnostic Scan</Text>
            <Text style={styles.diagSub}>Test display, touch digitizer, taptic & sound</Text>
          </View>
          <ChevronRight size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Device Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What needs fixing?</Text>
          <View style={styles.categoryGrid}>
            {(products.length > 0 ? products : DEVICE_CATEGORIES).map((item: any) => {
              const name = item.product_name || item.label;
              const meta = getProductMeta(name);
              const IconComponent = meta.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.categoryCard}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/booking',
                      params: {
                        productId: item.id,
                        category: item.category || item.id,
                        productName: name,
                      },
                    })
                  }
                >
                  <View style={[styles.categoryIconWrap, { backgroundColor: meta.color + '15' }]}>
                    <IconComponent size={24} color={meta.color} />
                  </View>
                  <Text style={styles.categoryLabel}>{name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Active Repairs */}
        {activeOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Active Repairs</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeOrders.slice(0, 2).map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/order/${order.id}`)}
              >
                <View style={styles.orderHeader}>
                  <View
                    style={[
                      styles.statusChip,
                      { backgroundColor: getStatusColor(order.currentStatus) + '15' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(order.currentStatus) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(order.currentStatus) },
                      ]}
                    >
                      {formatStatus(order.currentStatus)}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textMuted} />
                </View>
                <Text style={styles.orderDevice}>{order.productName}</Text>
                <Text style={styles.orderIssue}>{order.issueSummary}</Text>
                <Text style={styles.orderShop}>{order.shopName}</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${order.progress}%`,
                        backgroundColor: getStatusColor(order.currentStatus),
                      },
                    ]}
                  />
                </View>

                {/* Live GPS Track Shortcut */}
                <View style={styles.orderTrackingRow}>
                  <TouchableOpacity
                    style={styles.orderTrackButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/tracking/${order.id}`);
                    }}
                    activeOpacity={0.8}
                  >
                    <Navigation size={12} color={Colors.primary} />
                    <Text style={styles.orderTrackButtonText}>Live GPS Map</Text>
                  </TouchableOpacity>
                  <Text style={styles.orderEstText}>Live Telemetry Active</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {activeOrders.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyBee}>🐝</Text>
            <Text style={styles.emptyTitle}>No active repairs</Text>
            <Text style={styles.emptySubtitle}>
              Your device needs fixing? Tap the + button below to get started!
            </Text>
          </View>
        )}

        {/* Verified Workshops from Database */}
        {shops.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Verified Local Workshops</Text>
              <TouchableOpacity onPress={() => router.push('/shops')}>
                <Text style={styles.seeAll}>See All ({shops.length})</Text>
              </TouchableOpacity>
            </View>
            {shops.map((shop) => (
              <TouchableOpacity
                key={shop.id}
                style={styles.realShopCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/shop/${shop.id}`)}
              >
                <View style={styles.realShopIconBox}>
                  <Wrench size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.realShopTitleRow}>
                    <Text style={styles.realShopName}>{shop.shop_name}</Text>
                    <View style={styles.realShopRatingBadge}>
                      <Star size={12} color="#d97706" fill="#d97706" />
                      <Text style={styles.realShopRatingText}>
                        {Number(shop.avg_rating || 5.0).toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.realShopDesc} numberOfLines={1}>
                    {shop.description || 'Verified electronics & appliance repair hub'}
                  </Text>
                  <View style={styles.realShopMetaRow}>
                    <Text style={styles.realShopCity}>📍 {shop.address || shop.city || 'Bangalore'}</Text>
                    {shop.opening_time && (
                      <Text style={styles.realShopHours}>
                        🕒 {shop.opening_time.slice(0, 5)} - {shop.closing_time ? shop.closing_time.slice(0, 5) : '21:00'}
                      </Text>
                    )}
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleMd,
    color: Colors.primary,
  },
  greeting: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: Fonts.label,
    fontSize: 9,
    color: Colors.textInverse,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  searchPlaceholder: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
  },
  heroBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleLg,
    color: Colors.textInverse,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.textInverse,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    gap: 6,
  },
  heroButtonText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  heroBee: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBeeEmoji: {
    fontSize: 48,
  },
  sosBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningBg,
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    gap: 6,
  },
  sosText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },
  sosHighlight: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.warning,
  },
  diagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  diagIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diagTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  diagSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  section: {
    marginTop: Spacing.sectionGap,
    paddingHorizontal: Spacing.screenPadding,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  seeAll: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
  },
  orderDevice: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  orderIssue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  orderShop: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceDim,
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  orderTrackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  orderTrackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  orderTrackButtonText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.caption,
    color: Colors.primary,
  },
  orderEstText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyBee: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.titleMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  realShopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  realShopIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  realShopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  realShopName: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    flex: 1,
  },
  realShopRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  realShopRatingText: {
    fontFamily: Fonts.headingBold,
    fontSize: 11,
    color: '#92400e',
  },
  realShopDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  realShopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  realShopCity: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  realShopHours: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.success,
  },
});
