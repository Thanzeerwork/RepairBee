/**
 * Rewards Tab — Honeycomb Rewards hub & Referral Tracker
 * Shows real loyalty profile, points, tier, and live status of referred friends
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  Gift,
  Star,
  Trophy,
  Zap,
  Shield,
  Sparkles,
  Copy,
  Users,
  CheckCircle2,
  Clock,
  Wrench,
  Share2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/stores/authStore';

export default function RewardsScreen() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<any>(null);
  const [referralStats, setReferralStats] = useState<{
    total_referrals: number;
    completed: number;
    total_rewards: number;
    referrals: any[];
  }>({
    total_referrals: 0,
    completed: 0,
    total_rewards: 0,
    referrals: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [rewardsRes, statsRes] = await Promise.allSettled([
        api.getRewards(),
        api.getReferralStats(),
      ]);

      if (rewardsRes.status === 'fulfilled') {
        setProfile(rewardsRes.value.data?.data);
      } else {
        setProfile({
          total_points: user?.walletBalance ? Math.floor(user.walletBalance * 2) : 0,
          tier: {
            name: 'Worker Bee',
            icon: '🐝',
            cashMultiplier: '1.0x',
            referralBonus: 50,
            warrantyDays: 30,
          },
          referralCode: user?.referralCode || 'REPAIRBEE50',
        });
      }

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data?.data || {};
        setReferralStats({
          total_referrals: Number(d.total_referrals || 0),
          completed: Number(d.completed || 0),
          total_rewards: Number(d.total_rewards || 0),
          referrals: d.referrals || [],
        });
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const myCode = profile?.referralCode || user?.referralCode || 'RBEE50';

  const copyReferral = async () => {
    await Clipboard.setStringAsync(myCode);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', `Referral code "${myCode}" copied to clipboard.`);
  };

  const shareReferral = async () => {
    try {
      await Share.share({
        message: `Use my RepairBee referral code "${myCode}" to get ₹100 OFF your first doorstep device repair! Quick pickup, certified workshops & guaranteed escrow protection. Download RepairBee today!`,
      });
    } catch {
      // User cancelled share
    }
  };

  const tier = profile?.tier || {
    name: 'Worker Bee',
    icon: '🐝',
    cashMultiplier: '1.0x',
    referralBonus: 50,
    warrantyDays: 30,
  };

  const points = profile?.total_points ?? profile?.points ?? 0;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <Text style={styles.title}>🐝 Honeycomb Rewards</Text>

        {/* Real Points Card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsTop}>
            <Trophy size={28} color={Colors.textInverse} />
            <Text style={styles.pointsLabel}>Honeycomb Balance</Text>
          </View>
          <Text style={styles.pointsValue}>{points}</Text>
          <Text style={styles.pointsSub}>Points redeemable on any repair booking</Text>
          <View style={styles.tierBadge}>
            <Text style={{ fontSize: 16 }}>{tier.icon || '🐝'}</Text>
            <Text style={styles.tierText}>{tier.name} ({tier.cashMultiplier || '1.0x'} Cashback)</Text>
          </View>
        </View>

        {/* Real Referral Box */}
        <View style={styles.referralCard}>
          <View style={styles.referralTop}>
            <Users size={20} color={Colors.primary} />
            <Text style={styles.referralHeading}>Your Personal Referral Code</Text>
          </View>
          <Text style={styles.referralDesc}>
            Friends get <Text style={{ fontFamily: Fonts.bodySemiBold, color: Colors.textPrimary }}>₹100 discount</Text>, you receive <Text style={{ fontFamily: Fonts.bodySemiBold, color: Colors.primary }}>₹50 wallet credit</Text> upon their first completed repair.
          </Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{myCode}</Text>
            <View style={styles.referralActions}>
              <TouchableOpacity style={styles.copyBtn} onPress={copyReferral} activeOpacity={0.8}>
                <Copy size={16} color={Colors.primary} />
                <Text style={styles.copyBtnText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={shareReferral} activeOpacity={0.8}>
                <Share2 size={16} color={Colors.textInverse} />
                <Text style={styles.shareBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Referral Tracker Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Referred Friends & Status</Text>
            </View>
            <View style={styles.refCountChip}>
              <Text style={styles.refCountText}>{referralStats.total_referrals} friends</Text>
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Invited</Text>
              <Text style={styles.metricValue}>{referralStats.total_referrals}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Repairs Done</Text>
              <Text style={[styles.metricValue, { color: Colors.success }]}>{referralStats.completed}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Earned</Text>
              <Text style={[styles.metricValue, { color: Colors.primary }]}>₹{referralStats.total_rewards}</Text>
            </View>
          </View>

          {/* List of Referred People with Statuses */}
          {referralStats.referrals.length > 0 ? (
            referralStats.referrals.map((item, idx) => {
              const isCompleted = item.stageKey === 'repair_completed';
              const isInProgress = item.stageKey === 'repair_in_progress';
              const isSignedUp = item.stageKey === 'signed_up';

              return (
                <View key={item.id || idx} style={styles.referralItemCard}>
                  {/* Top: Avatar, Name & Status Pill */}
                  <View style={styles.refereeHeaderRow}>
                    <View style={styles.refereeAvatarBox}>
                      <Text style={styles.refereeAvatarText}>
                        {(item.referee_name || 'U')[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.refereeName}>{item.referee_name || 'Friend'}</Text>
                      <Text style={styles.refereeJoined}>
                        Joined {formatDate(item.created_at || item.referee_joined_at)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.badgeBg || '#dbeafe' }]}>
                      {isCompleted && <CheckCircle2 size={12} color={Colors.success} />}
                      {isInProgress && <Wrench size={12} color={Colors.warning} />}
                      {isSignedUp && <Clock size={12} color={Colors.info} />}
                      <Text style={[styles.statusBadgeText, { color: item.badgeColor || Colors.primary }]}>
                        {item.stageTitle}
                      </Text>
                    </View>
                  </View>

                  {/* Visual 3-Stage Progress Timeline */}
                  <View style={styles.progressTimeline}>
                    {/* Step 1: Signed Up */}
                    <View style={styles.timelineStep}>
                      <View style={[styles.stepDot, styles.stepDotDone]}>
                        <CheckCircle2 size={10} color={Colors.textInverse} />
                      </View>
                      <Text style={[styles.stepText, styles.stepTextDone]}>Signed Up</Text>
                    </View>
                    <View style={[styles.stepLine, (isInProgress || isCompleted) && styles.stepLineDone]} />

                    {/* Step 2: Booked Repair */}
                    <View style={styles.timelineStep}>
                      <View style={[styles.stepDot, (isInProgress || isCompleted) ? styles.stepDotDone : styles.stepDotPending]}>
                        {(isInProgress || isCompleted) ? (
                          <CheckCircle2 size={10} color={Colors.textInverse} />
                        ) : (
                          <View style={styles.dotInnerEmpty} />
                        )}
                      </View>
                      <Text style={[styles.stepText, (isInProgress || isCompleted) ? styles.stepTextDone : styles.stepTextPending]}>
                        In Repair
                      </Text>
                    </View>
                    <View style={[styles.stepLine, isCompleted && styles.stepLineDone]} />

                    {/* Step 3: Repair Delivered & Reward */}
                    <View style={styles.timelineStep}>
                      <View style={[styles.stepDot, isCompleted ? styles.stepDotDone : styles.stepDotPending]}>
                        {isCompleted ? (
                          <CheckCircle2 size={10} color={Colors.textInverse} />
                        ) : (
                          <View style={styles.dotInnerEmpty} />
                        )}
                      </View>
                      <Text style={[styles.stepText, isCompleted ? styles.stepTextDone : styles.stepTextPending]}>
                        ₹50 Credited
                      </Text>
                    </View>
                  </View>

                  {/* Descriptive Explainer */}
                  <Text style={styles.refereeDesc}>{item.stageDescription}</Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyReferralBox}>
              <View style={styles.emptyReferralIcon}>
                <Users size={32} color={Colors.primary} />
              </View>
              <Text style={styles.emptyReferralTitle}>No Friends Referred Yet</Text>
              <Text style={styles.emptyReferralSub}>
                Share your referral code <Text style={{ fontFamily: Fonts.headingBold, color: Colors.primary }}>{myCode}</Text> with friends. When they complete their first repair, you'll earn ₹50 in your wallet and they get ₹100 off!
              </Text>
              <TouchableOpacity style={styles.emptyShareBtn} onPress={shareReferral} activeOpacity={0.85}>
                <Share2 size={16} color={Colors.textInverse} />
                <Text style={styles.emptyShareBtnText}>Share Referral Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Real Tier Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Tier Privileges</Text>
          {[
            { icon: '🛡️', title: `${tier.warrantyDays || 30}-Day Warranty Shield`, desc: 'Automatic zero-cost re-repair protection' },
            { icon: '⚡', title: `${tier.cashMultiplier || '1.0x'} Cashback Multiplier`, desc: 'Earn points faster on every completed order' },
            { icon: '🎁', title: `₹${tier.referralBonus || 50} Referral Payout`, desc: 'Credited directly to in-app wallet' },
          ].map((item, i) => (
            <View key={i} style={styles.earnCard}>
              <Text style={styles.earnIcon}>{item.icon}</Text>
              <View style={styles.earnContent}>
                <Text style={styles.earnTitle}>{item.title}</Text>
                <Text style={styles.earnDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Redeem Opportunities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Redeem Points at Checkout</Text>
          {[
            { title: '₹100 Repair Discount', cost: '100 pts', minPoints: 100 },
            { title: 'Free Doorstep Runner Pickup', cost: '150 pts', minPoints: 150 },
            { title: '₹250 Platinum Repair Voucher', cost: '250 pts', minPoints: 250 },
          ].map((item, i) => {
            const unlocked = points >= item.minPoints;
            return (
              <View key={i} style={[styles.redeemCard, !unlocked && styles.redeemLocked]}>
                <View>
                  <Text style={styles.redeemTitle}>{item.title}</Text>
                  <Text style={styles.redeemCost}>Requires {item.cost}</Text>
                </View>
                <View style={[styles.redeemButton, !unlocked && styles.redeemButtonLocked]}>
                  <Text style={[styles.redeemButtonText, !unlocked && { color: Colors.textMuted }]}>
                    {unlocked ? 'Available' : 'Locked'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleLg,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
  },
  pointsCard: {
    margin: Spacing.screenPadding,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.lg,
  },
  pointsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pointsLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodyLg,
    color: 'rgba(255,255,255,0.9)',
  },
  pointsValue: {
    fontFamily: Fonts.headingBold,
    fontSize: 52,
    color: Colors.textInverse,
  },
  pointsSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  tierText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textInverse,
  },
  referralCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.screenPadding,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  referralTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  referralHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  referralDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  codeText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  referralActions: {
    flexDirection: 'row',
    gap: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  copyBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.primary,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  shareBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textInverse,
  },
  section: {
    paddingHorizontal: Spacing.screenPadding,
    marginTop: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
  },
  refCountChip: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  refCountText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.labelSm,
    color: Colors.primary,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  metricLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  metricValue: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  referralItemCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  refereeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  refereeAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  refereeAvatarText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.primary,
  },
  refereeName: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  refereeJoined: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.labelSm,
  },
  progressTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  timelineStep: {
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: {
    backgroundColor: Colors.success,
  },
  stepDotPending: {
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  dotInnerEmpty: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceBorder,
  },
  stepText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.tiny || 10,
  },
  stepTextDone: {
    color: Colors.textPrimary,
    fontFamily: Fonts.bodySemiBold,
  },
  stepTextPending: {
    color: Colors.textMuted,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.surfaceBorder,
    marginBottom: 16,
  },
  stepLineDone: {
    backgroundColor: Colors.success,
  },
  refereeDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceDim,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  emptyReferralBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emptyReferralIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptyReferralTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  emptyReferralSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  emptyShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    ...Shadows.sm,
  },
  emptyShareBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textInverse,
  },
  earnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  earnIcon: { fontSize: 24 },
  earnContent: { flex: 1 },
  earnTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  earnDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 1,
  },
  redeemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  redeemLocked: { opacity: 0.5 },
  redeemTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  redeemCost: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  redeemButton: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  redeemButtonLocked: { backgroundColor: Colors.surfaceDim },
  redeemButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.primary,
  },
});
