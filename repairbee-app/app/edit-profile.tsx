/**
 * User Profile Editor & Avatar Customizer Screen
 * Allows customers to customize their avatar (camera, gallery, or 3D persona emojis),
 * and update their contact details, name, and notification preferences.
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
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  User,
  Phone,
  Mail,
  Check,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  Globe,
  Save,
  RotateCcw,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';
import { useAuthStore } from '../src/stores/authStore';
import { api } from '../src/api/client';

// Persona Avatars
const AVATAR_PERSONAS = [
  { id: 'bee', emoji: '🐝', name: 'Busy Bee' },
  { id: 'tech', emoji: '⚡', name: 'Volt Tech' },
  { id: 'hacker', emoji: '👨‍💻', name: 'Code Master' },
  { id: 'engineer', emoji: '👩‍🔧', name: 'Hardware Pro' },
  { id: 'fox', emoji: '🦊', name: 'Swift Fox' },
  { id: 'rocket', emoji: '🚀', name: 'Rocket Tech' },
  { id: 'vip', emoji: '👑', name: 'VIP Member' },
  { id: 'gem', emoji: '💎', name: 'Diamond Member' },
];

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी (Hindi)' },
  { id: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { id: 'ta', label: 'தமிழ் (Tamil)' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser, refreshProfile } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone?.replace(/^\+91/, '') || '');
  const [altPhone, setAltPhone] = useState('');
  const [avatar, setAvatar] = useState<string>(user?.profilePicUrl || '🐝');
  const [preferredLang, setPreferredLang] = useState('en');
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifySms, setNotifySms] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone?.replace(/^\+91/, '') || '');
      if (user.profilePicUrl) {
        setAvatar(user.profilePicUrl);
      }
    }
  }, [user]);

  // Pick image from gallery
  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatar(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      Alert.alert('Error', 'Unable to pick photo.');
    }
  };

  // Capture photo with camera
  const captureWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required to take a picture.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatar(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      Alert.alert('Error', 'Unable to take photo.');
    }
  };

  // Reset to default initial
  const resetToInitials = () => {
    setAvatar('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Save profile updates
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your full name.');
      return;
    }

    const cleanPhone = phone.trim();
    if (cleanPhone && cleanPhone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setSaving(true);
      const formattedPhone = cleanPhone ? `+91${cleanPhone}` : undefined;

      const payload: Record<string, any> = {
        name: name.trim(),
        profile_pic_url: avatar,
      };
      if (formattedPhone) {
        payload.phone = formattedPhone;
      }

      const res = await api.updateProfile(payload);
      const updatedData = res.data?.data || payload;

      // Update local Zustand store
      updateUser({
        name: updatedData.name || name.trim(),
        phone: updatedData.phone || formattedPhone,
        profilePicUrl: avatar,
      });

      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('Profile Updated', 'Your profile details and avatar have been saved successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        'Update Failed',
        err.response?.data?.message || 'Unable to update profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const isImageAvatar = avatar && (avatar.startsWith('http') || avatar.startsWith('file:') || avatar.startsWith('/'));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.topTitleWrap}>
          <Text style={styles.topTitle}>Edit Profile</Text>
          <Text style={styles.topSub}>Personal info & custom avatar</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]}
          onPress={handleSaveProfile}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <>
              <Check size={16} color={Colors.textInverse} />
              <Text style={styles.saveHeaderBtnText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Avatar Customizer Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarGlowContainer}>
            <View style={styles.avatarCircle}>
              {isImageAvatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : avatar ? (
                <Text style={styles.avatarEmoji}>{avatar}</Text>
              ) : (
                <Text style={styles.avatarInitialText}>
                  {name ? name[0].toUpperCase() : 'B'}
                </Text>
              )}
            </View>

            <View style={styles.verifiedCheckBadge}>
              <ShieldCheck size={14} color={Colors.textInverse} />
            </View>
          </View>

          <Text style={styles.avatarTitle}>Choose Your Avatar</Text>
          <Text style={styles.avatarSub}>
            Pick an animated persona, upload a picture, or use camera
          </Text>

          {/* Quick Photo Upload Actions */}
          <View style={styles.avatarActionsRow}>
            <TouchableOpacity
              style={styles.avatarActionBtn}
              onPress={captureWithCamera}
              activeOpacity={0.8}
            >
              <Camera size={16} color={Colors.primary} />
              <Text style={styles.avatarActionText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarActionBtn}
              onPress={pickFromGallery}
              activeOpacity={0.8}
            >
              <ImageIcon size={16} color={Colors.primary} />
              <Text style={styles.avatarActionText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarActionBtn}
              onPress={resetToInitials}
              activeOpacity={0.8}
            >
              <RotateCcw size={15} color={Colors.textMuted} />
              <Text style={[styles.avatarActionText, { color: Colors.textMuted }]}>Initials</Text>
            </TouchableOpacity>
          </View>

          {/* Persona Emojis Carousel */}
          <View style={styles.personaStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.personaScroll}>
              {AVATAR_PERSONAS.map((p) => {
                const isSelected = avatar === p.emoji;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.personaCard, isSelected && styles.personaCardActive]}
                    onPress={() => {
                      setAvatar(p.emoji);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.personaEmoji}>{p.emoji}</Text>
                    <Text style={[styles.personaName, isSelected && styles.personaNameActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Contact & Personal Information Form */}
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>Personal Information</Text>

          {/* Full Name */}
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <View style={styles.inputWrap}>
            <User size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder="Your Name"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Email (Read-Only) */}
          <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
          <View style={[styles.inputWrap, styles.inputWrapDisabled]}>
            <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputField, { color: Colors.textMuted }]}
              value={user?.email || 'customer@repairbee.com'}
              editable={false}
            />
            <Text style={styles.linkedChip}>Linked</Text>
          </View>

          {/* Primary Phone */}
          <Text style={styles.fieldLabel}>MOBILE PHONE</Text>
          <View style={styles.inputWrap}>
            <Phone size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <View style={styles.countryCodeBadge}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={styles.inputField}
              placeholder="10-digit mobile number"
              placeholderTextColor={Colors.textMuted}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
            />
          </View>

          {/* Alternate Phone */}
          <Text style={styles.fieldLabel}>ALTERNATE PHONE (FOR RUNNER OTP)</Text>
          <View style={styles.inputWrap}>
            <Phone size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <View style={styles.countryCodeBadge}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={styles.inputField}
              placeholder="Secondary contact (optional)"
              placeholderTextColor={Colors.textMuted}
              value={altPhone}
              onChangeText={(t) => setAltPhone(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Communication & Language Preferences */}
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>Communication & Alerts</Text>

          {/* WhatsApp Priority Updates */}
          <TouchableOpacity
            style={styles.preferenceRow}
            activeOpacity={0.8}
            onPress={() => setNotifyWhatsapp(!notifyWhatsapp)}
          >
            <View style={styles.prefIconWrap}>
              <MessageSquare size={18} color={Colors.tertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>WhatsApp Live Telemetry</Text>
              <Text style={styles.prefSub}>Receive live runner ETA, quote invoices, and delivery OTPs</Text>
            </View>
            <View style={[styles.toggleCircle, notifyWhatsapp && styles.toggleCircleActive]}>
              {notifyWhatsapp && <Check size={12} color={Colors.textInverse} />}
            </View>
          </TouchableOpacity>

          {/* SMS Alerts */}
          <TouchableOpacity
            style={styles.preferenceRow}
            activeOpacity={0.8}
            onPress={() => setNotifySms(!notifySms)}
          >
            <View style={styles.prefIconWrap}>
              <Sparkles size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Critical SMS Alerts</Text>
              <Text style={styles.prefSub}>Urgent quote approvals and tamper-proof security pouch pins</Text>
            </View>
            <View style={[styles.toggleCircle, notifySms && styles.toggleCircleActive]}>
              {notifySms && <Check size={12} color={Colors.textInverse} />}
            </View>
          </TouchableOpacity>

          {/* Preferred Language */}
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>PREFERRED APP LANGUAGE</Text>
          <View style={styles.languagePillsWrap}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.languagePill,
                  preferredLang === lang.id && styles.languagePillActive,
                ]}
                onPress={() => setPreferredLang(lang.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.languagePillText,
                    preferredLang === lang.id && styles.languagePillTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account Info / Trust Badge */}
        <View style={styles.accountTrustCard}>
          <View style={styles.trustRow}>
            <ShieldCheck size={20} color={Colors.tertiary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.trustTitle}>RepairBee Verified Profile</Text>
              <Text style={styles.trustSub}>
                Referral Code: {user?.referralCode || 'BEE-PRO'} • 90-Day Warranty Protected
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Big Save Button */}
        <TouchableOpacity
          style={[styles.bigSaveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSaveProfile}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <>
              <Save size={18} color={Colors.textInverse} />
              <Text style={styles.bigSaveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topTitleWrap: {
    flex: 1,
  },
  topTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
  },
  topSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 1,
  },
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  saveHeaderBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.caption,
    color: Colors.textInverse,
  },
  scrollArea: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  avatarGlowContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fef3c7',
    ...Shadows.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 48,
  },
  avatarInitialText: {
    fontFamily: Fonts.headingBold,
    fontSize: 40,
    color: Colors.primary,
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.tertiary,
    borderWidth: 2,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  avatarSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 3,
    marginBottom: 16,
  },
  avatarActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  avatarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  avatarActionText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textPrimary,
  },
  personaStrip: {
    width: '100%',
  },
  personaScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 10,
  },
  personaCard: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    minWidth: 72,
  },
  personaCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#fffbeb',
  },
  personaEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  personaName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.tiny,
    color: Colors.textSecondary,
  },
  personaNameActive: {
    fontFamily: Fonts.bodyBold,
    color: Colors.primaryDark,
  },
  formCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.screenPadding,
    marginTop: 16,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  formCardTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.tiny,
    color: Colors.textMuted,
    marginTop: 12,
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  inputWrapDisabled: {
    backgroundColor: '#f1f5f9',
  },
  inputIcon: {
    marginRight: 8,
  },
  countryCodeBadge: {
    paddingRight: 8,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.surfaceBorder,
  },
  countryCodeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  inputField: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    height: '100%',
  },
  linkedChip: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.tiny,
    color: Colors.tertiary,
    backgroundColor: Colors.tertiaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceDim,
    gap: 12,
  },
  prefIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  prefSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.tiny,
    color: Colors.textMuted,
    marginTop: 2,
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceDim,
  },
  toggleCircleActive: {
    backgroundColor: Colors.tertiary,
    borderColor: Colors.tertiary,
  },
  languagePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  languagePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  languagePillActive: {
    backgroundColor: '#fffbeb',
    borderColor: Colors.primary,
  },
  languagePillText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },
  languagePillTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.primaryDark,
  },
  accountTrustCard: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: 16,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.tertiaryMuted,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trustTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.tertiary,
  },
  trustSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bigSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: Spacing.screenPadding,
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    ...Shadows.sm,
  },
  bigSaveBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textInverse,
  },
});
