/**
 * Settings & Account Preferences Screen
 * Matches PRD Section 2.1 & 4.1
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  User,
  Phone,
  Mail,
  Bell,
  MessageSquare,
  Shield,
  Lock,
  Globe,
  Check,
  LogOut,
  ChevronRight,
  Save,
  Server,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';
import { useAuthStore } from '../src/stores/authStore';
import { api } from '../src/api/client';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);

  // Edit profile form
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Notification preferences
  const [notifPush, setNotifPush] = useState(true);
  const [notifWhatsApp, setNotifWhatsApp] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  // Security preferences
  const [biometricLock, setBiometricLock] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English (EN)');

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Name cannot be empty.');
      return;
    }

    try {
      setSavingProfile(true);
      const res = await api.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });

      const updatedUser = res.data?.data || { name: name.trim(), phone: phone.trim() };
      updateUser(updatedUser);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Profile Updated', 'Your profile details have been successfully saved.');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update profile.';
      Alert.alert('Update Failed', msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of RepairBee?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Settings & Preferences',
          headerTintColor: Colors.primary,
          headerStyle: { backgroundColor: Colors.surface },
          headerTitleStyle: { fontFamily: Fonts.headingSemiBold, fontSize: 17 },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Section: Profile Info */}
          <Text style={styles.sectionHeader}>Account Information</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <User size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Phone size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.fieldLabel}>Email Address (Read-only)</Text>
            <View style={[styles.inputWrapper, styles.disabledInput]}>
              <Mail size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <Text style={styles.readOnlyText}>{user?.email || 'customer@repairbee.com'}</Text>
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.8}
            >
              {savingProfile ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <>
                  <Save size={16} color={Colors.textInverse} />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Section: Notification Channels */}
          <Text style={styles.sectionHeader}>Notification Preferences</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <View style={styles.switchTitleRow}>
                  <Bell size={16} color={Colors.primary} />
                  <Text style={styles.switchTitle}>Push Notifications</Text>
                </View>
                <Text style={styles.switchSub}>Instant alerts for pickup, quotes & delivery</Text>
              </View>
              <Switch
                value={notifPush}
                onValueChange={setNotifPush}
                trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <View style={styles.switchTitleRow}>
                  <MessageSquare size={16} color="#16a34a" />
                  <Text style={styles.switchTitle}>WhatsApp Status Updates</Text>
                </View>
                <Text style={styles.switchSub}>Runner location link & diagnostic reports</Text>
              </View>
              <Switch
                value={notifWhatsApp}
                onValueChange={setNotifWhatsApp}
                trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <View style={styles.switchTitleRow}>
                  <Phone size={16} color="#2563eb" />
                  <Text style={styles.switchTitle}>SMS Security OTPs</Text>
                </View>
                <Text style={styles.switchSub}>Pickup handover and delivery confirmation OTPs</Text>
              </View>
              <Switch
                value={notifSms}
                onValueChange={setNotifSms}
                trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <View style={styles.switchTitleRow}>
                  <Mail size={16} color="#d97706" />
                  <Text style={styles.switchTitle}>Email Invoices</Text>
                </View>
                <Text style={styles.switchSub}>Itemized GST tax invoice after completion</Text>
              </View>
              <Switch
                value={notifEmail}
                onValueChange={setNotifEmail}
                trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
              />
            </View>
          </View>

          {/* Section: Security & System */}
          <Text style={styles.sectionHeader}>Security & App System</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <View style={styles.switchTitleRow}>
                  <Lock size={16} color={Colors.primary} />
                  <Text style={styles.switchTitle}>Biometric App Lock</Text>
                </View>
                <Text style={styles.switchSub}>Require Fingerprint or Face ID on launch</Text>
              </View>
              <Switch
                value={biometricLock}
                onValueChange={setBiometricLock}
                trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() =>
                Alert.alert('Language', 'Current language: English (Default). Additional regional languages coming soon.')
              }
            >
              <View style={styles.menuLeft}>
                <Globe size={16} color={Colors.primary} />
                <Text style={styles.menuLabel}>Language</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{selectedLanguage}</Text>
                <ChevronRight size={14} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.menuRow}>
              <View style={styles.menuLeft}>
                <Server size={16} color={Colors.success} />
                <Text style={styles.menuLabel}>System Service Health</Text>
              </View>
              <View style={styles.menuRight}>
                <View style={styles.onlineDot} />
                <Text style={[styles.menuValue, { color: Colors.success }]}>Online (v1.0.0)</Text>
              </View>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={handleLogout}>
            <LogOut size={18} color={Colors.error} />
            <Text style={styles.logoutBtnText}>Sign Out from Device</Text>
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
  sectionHeader: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  fieldLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  disabledInput: {
    backgroundColor: Colors.surfaceDim,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  readOnlyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  saveBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textInverse,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchInfo: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  switchTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  switchSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: 4,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error + '40',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  logoutBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
  },
});
