/**
 * Shop Detail Screen — View verified workshop profile, ratings, specialties
 * Fetches real data from PostgreSQL / Express API
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Star, MapPin, Clock, Shield, MessageCircle, Phone, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { api } from '../../src/api/client';

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShop() {
      try {
        setLoading(true);
        if (id) {
          const res = await api.getShopById(id);
          setShop(res.data.data);
        }
      } catch (err: any) {
        Alert.alert('Error', 'Unable to load shop details.');
      } finally {
        setLoading(false);
      }
    }
    fetchShop();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Workshop not found.</Text>
      </View>
    );
  }

  const ratingVal = Number(shop.avg_rating || 5.0).toFixed(1);
  const fullAddress = [shop.address, shop.city, shop.pincode].filter(Boolean).join(', ');

  return (
    <>
      <Stack.Screen options={{ headerTitle: shop.shop_name || 'Workshop Profile' }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.shopAvatar}>
            <Text style={styles.avatarEmoji}>🔧</Text>
          </View>
          <Text style={styles.shopName}>{shop.shop_name}</Text>
          <Text style={styles.shopOwner}>Managed by {shop.owner_name || 'Certified Workshop Partner'}</Text>

          <View style={styles.ratingRow}>
            <Star size={16} color={Colors.star} fill={Colors.star} />
            <Text style={styles.ratingText}>{ratingVal}</Text>
            <Text style={styles.reviewCount}>({shop.total_ratings || 0} customer reviews)</Text>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={14} color={Colors.textMuted} />
            <Text style={styles.locationText}>{fullAddress || 'Bangalore, Karnataka'}</Text>
          </View>

          {shop.opening_time && (
            <View style={styles.hoursRow}>
              <Clock size={14} color={Colors.success} />
              <Text style={styles.hoursText}>
                Open Today • {shop.opening_time.slice(0, 5)} - {shop.closing_time ? shop.closing_time.slice(0, 5) : '21:00'}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Direct Helpline', `Workshop support line: +91 80 4928 1900`)}
          >
            <Phone size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Call Workshop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/booking?shopId=${shop.id}`)}
          >
            <MessageCircle size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Request Quote</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Workshop</Text>
          <Text style={styles.aboutText}>
            {shop.description || 'Verified electronics & home appliance repair center equipped with modern diagnostic tools and cleanroom repair benches.'}
          </Text>
        </View>

        {/* Trust Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RepairBee Verified Guarantees</Text>
          <View style={styles.badgeList}>
            {[
              { icon: Shield, title: 'RepairBee Escrow Protected', desc: 'Payment held safely until you confirm delivery' },
              { icon: CheckCircle2, title: 'Guaranteed Warranty Shield', desc: 'Includes minimum 30-day verified re-repair warranty' },
              { icon: Clock, title: 'Tracked Doorstep Pickup', desc: 'Secure tamper-evident runner pickup & drop-off' },
            ].map((b, i) => {
              const IconComp = b.icon;
              return (
                <View key={i} style={styles.badgeItem}>
                  <View style={styles.badgeIcon}>
                    <IconComp size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.badgeTitle}>{b.title}</Text>
                    <Text style={styles.badgeDesc}>{b.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Direct Booking CTA */}
        <View style={styles.ctaBox}>
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.8}
            onPress={() => router.push(`/booking?shopId=${shop.id}`)}
          >
            <Text style={styles.ctaButtonText}>Book Repair with this Workshop</Text>
            <ArrowRight size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textMuted },
  headerCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    ...Shadows.sm,
  },
  shopAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarEmoji: { fontSize: 32 },
  shopName: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleMd,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  shopOwner: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  ratingText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  reviewCount: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  hoursText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.success,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  actionText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.primary,
  },
  section: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  aboutText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  badgeList: {
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  badgeDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  ctaBox: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.lg,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.xl,
    ...Shadows.md,
  },
  ctaButtonText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textInverse,
  },
});
