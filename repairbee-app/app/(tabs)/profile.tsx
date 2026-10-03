/**
 * Profile Tab — User profile, wallet, settings & auth options
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, Wallet, Package, MapPin, Users, Tag, Shield, HelpCircle,
  Settings, Lock, FileText, LogOut, LogIn, ChevronRight, Copy, Share2,
  Activity, Bell, Edit3,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/api/client';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshProfile } = useAuthStore();
  const [activeCount, setActiveCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refreshProfile();
        api.getMyOrders({ status: 'active' })
          .then((res) => {
            const list = res.data?.data || [];
            setActiveCount(list.length);
          })
          .catch(() => {});
      } else {
        setActiveCount(0);
      }
    }, [user])
  );

  const firstName = user?.name?.split(' ')[0] || 'Guest';

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of RepairBee?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const copyReferralCode = async () => {
    if (user?.referralCode) {
      await Clipboard.setStringAsync(user.referralCode);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied', `Referral code "${user.referralCode}" copied.`);
    }
  };

  const navigateItem = (path: string, requiresAuth = false) => {
    if (requiresAuth && !user) {
      router.push('/(auth)/login');
    } else {
      router.push(path as any);
    }
  };

  const menuItems = [
    { icon: User, label: 'Edit Profile & Avatar', sub: 'Custom avatar persona, contact & info', auth: true, onPress: () => navigateItem('/edit-profile', true) },
    { icon: Package, label: 'My Orders', badge: activeCount > 0 ? `${activeCount} active` : undefined, auth: true, onPress: () => navigateItem('/(tabs)/orders', true) },
    { icon: MapPin, label: 'Saved Addresses', auth: true, onPress: () => navigateItem('/addresses', true) },
    { icon: Shield, label: 'My Warranties', sub: 'Guaranteed repair protection', auth: true, onPress: () => navigateItem('/warranties', true) },
    { icon: Activity, label: 'Hardware Diagnostics', sub: 'Pre-repair health scanning', auth: false, onPress: () => navigateItem('/diagnostics') },
    { icon: Bell, label: 'Notifications', auth: true, onPress: () => navigateItem('/notifications', true) },
    { icon: Users, label: 'Referral Program', sub: 'Earn ₹50 per referral', auth: true, onPress: () => navigateItem('/(tabs)/rewards', true) },
    { icon: Tag, label: 'Promo Codes', sub: 'Active discounts & coupons', auth: true, onPress: () => navigateItem('/promos', true) },
    null, // divider
    { icon: HelpCircle, label: 'Help & Support', sub: '24/7 Helpline & FAQs', auth: false, onPress: () => navigateItem('/support') },
    { icon: Settings, label: 'Settings', sub: 'Preferences & account info', auth: true, onPress: () => navigateItem('/settings', true) },
    { icon: Lock, label: 'Privacy Policy', auth: false, onPress: () => navigateItem('/privacy') },
    { icon: FileText, label: 'Terms of Service', auth: false, onPress: () => navigateItem('/terms') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        {/* User Card OR Login Option Card */}
        {!user ? (
          <View style={styles.loginCard}>
            <View style={styles.loginAvatar}>
              <User size={36} color={Colors.primary} />
            </View>
            <Text style={styles.loginCardTitle}>Sign in to RepairBee</Text>
            <Text style={styles.loginCardSubtitle}>
              Log in to manage orders, view warranties, track live runners and access your wallet.
            </Text>
            <TouchableOpacity
              style={styles.loginCardButton}
              activeOpacity={0.85}
              onPress={() => router.push('/(auth)/login')}
            >
              <LogIn size={18} color={Colors.textInverse} />
              <Text style={styles.loginCardButtonText}>Log In / Sign Up</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              {user.profilePicUrl && (user.profilePicUrl.startsWith('http') || user.profilePicUrl.startsWith('file:') || user.profilePicUrl.startsWith('/')) ? (
                <Image source={{ uri: user.profilePicUrl }} style={styles.avatarImage} />
              ) : user.profilePicUrl ? (
                <Text style={{ fontSize: 32 }}>{user.profilePicUrl}</Text>
              ) : (
                <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{user.name}</Text>
              <TouchableOpacity
                style={styles.editPill}
                activeOpacity={0.8}
                onPress={() => router.push('/edit-profile')}
              >
                <Edit3 size={12} color={Colors.primary} />
                <Text style={styles.editPillText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.phone && <Text style={styles.userPhone}>📱 {user.phone}</Text>}
          </View>
        )}

        {/* Wallet (Only for logged-in users) */}
        {user && (
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <Wallet size={20} color={Colors.textInverse} />
              <Text style={styles.walletLabel}>Wallet Balance</Text>
            </View>
            <Text style={styles.walletAmount}>₹{user?.walletBalance ?? 0}</Text>
            <View style={styles.walletActions}>
              <TouchableOpacity style={styles.walletButton} onPress={() => router.push('/wallet')}>
                <Text style={styles.walletButtonText}>+ Add Money</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.walletButton} onPress={() => router.push('/wallet')}>
                <Text style={styles.walletButtonText}>Wallet Ledger</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Referral Banner (Only for logged-in users) */}
        {user && (
          <View style={styles.referralCard}>
            <Text style={styles.referralTitle}>🎁 Invite friends, earn ₹50!</Text>
            <View style={styles.referralCodeRow}>
              <Text style={styles.referralCode}>{user?.referralCode || 'RBEE50'}</Text>
              <TouchableOpacity onPress={copyReferralCode} style={styles.copyButton}>
                <Copy size={14} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton}>
                <Share2 size={14} color={Colors.textInverse} />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, i) => {
            if (!item) {
              return <View key={`divider-${i}`} style={styles.divider} />;
            }
            const IconComponent = item.icon;
            return (
              <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress}>
                <IconComponent size={20} color={Colors.textSecondary} />
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.sub && <Text style={styles.menuSub}>{item.sub}</Text>}
                </View>
                {item.badge && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                )}
                <ChevronRight size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Auth Button: Log Out if signed in, Log In if guest */}
        {user ? (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <LogOut size={18} color={Colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginBottomButton}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <LogIn size={18} color={Colors.textInverse} />
            <Text style={styles.loginBottomButtonText}>Log In to Your Account</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.version}>RepairBee v1.0.0</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: {
    fontFamily: Fonts.headingBold, fontSize: FontSizes.titleLg,
    color: Colors.textPrimary, paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.md,
  },
  loginCard: {
    alignItems: 'center', backgroundColor: Colors.surface, margin: Spacing.screenPadding,
    padding: Spacing.lg, borderRadius: Radius.xl, ...Shadows.md,
    borderWidth: 1.5, borderColor: Colors.primary + '30',
  },
  loginAvatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryMuted,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
    borderWidth: 2, borderColor: Colors.primary,
  },
  loginCardTitle: {
    fontFamily: Fonts.headingBold, fontSize: FontSizes.titleMd,
    color: Colors.textPrimary, marginTop: 4,
  },
  loginCardSubtitle: {
    fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary,
    textAlign: 'center', marginTop: 4, lineHeight: 20, paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  loginCardButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, width: '100%', paddingVertical: 13,
    borderRadius: Radius.lg, ...Shadows.sm,
  },
  loginCardButtonText: {
    fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyMd, color: Colors.textInverse,
  },
  userCard: {
    alignItems: 'center', backgroundColor: Colors.surface, margin: Spacing.screenPadding,
    padding: Spacing.lg, borderRadius: Radius.xl, ...Shadows.sm,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryMuted,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.primary,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sm },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  editPillText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.tiny, color: Colors.primaryDark },
  avatarText: { fontFamily: Fonts.headingBold, fontSize: FontSizes.displayMd, color: Colors.primary },
  userName: {
    fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.titleMd,
    color: Colors.textPrimary,
  },
  userEmail: { fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textSecondary, marginTop: 2 },
  userPhone: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textMuted, marginTop: 4 },
  walletCard: {
    marginHorizontal: Spacing.screenPadding, backgroundColor: Colors.primary,
    borderRadius: Radius.xl, padding: Spacing.lg, ...Shadows.lg,
  },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  walletLabel: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyLg, color: 'rgba(255,255,255,0.9)' },
  walletAmount: { fontFamily: Fonts.headingBold, fontSize: FontSizes.displayLg, color: Colors.textInverse, marginTop: 4 },
  walletActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  walletButton: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.md,
  },
  walletButtonText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textInverse },
  referralCard: {
    marginHorizontal: Spacing.screenPadding, marginTop: Spacing.md, backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  referralTitle: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textPrimary },
  referralCodeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  referralCode: {
    fontFamily: Fonts.headingBold, fontSize: FontSizes.titleMd, color: Colors.primary,
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.sm, letterSpacing: 2, overflow: 'hidden',
  },
  copyButton: { padding: 8 },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.md, marginLeft: 'auto',
  },
  shareButtonText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textInverse },
  menuSection: { marginTop: Spacing.lg, paddingHorizontal: Spacing.screenPadding },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  menuContent: { flex: 1 },
  menuLabel: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyLg, color: Colors.textPrimary },
  menuSub: { fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: 1 },
  menuBadge: {
    backgroundColor: Colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  menuBadgeText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.labelSm, color: Colors.primary },
  divider: { height: Spacing.md },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.screenPadding, marginTop: Spacing.lg, paddingVertical: 14,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '30',
  },
  logoutText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyLg, color: Colors.error },
  loginBottomButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.screenPadding, marginTop: Spacing.lg, paddingVertical: 14,
    borderRadius: Radius.lg, backgroundColor: Colors.primary, ...Shadows.sm,
  },
  loginBottomButtonText: {
    fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyLg, color: Colors.textInverse,
  },
  version: {
    fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textMuted,
    textAlign: 'center', marginTop: Spacing.md,
  },
});
