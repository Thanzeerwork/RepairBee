/**
 * Register Screen — Create new customer account
 * Matches Stitch design: Register Screen
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff, Check, Gift } from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { register: signup, isLoading, clearError } = useAuthStore();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    referralCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [localError, setLocalError] = useState('');

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError();
    setLocalError('');
  };

  const handleRegister = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setLocalError('Please fill in all fields.');
      return;
    }
    if (form.password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(form.password)) {
      setLocalError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      setLocalError('Password must contain at least one number.');
      return;
    }
    if (form.password !== form.confirm) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (!agreedTerms) {
      setLocalError('Please agree to the Terms of Service.');
      return;
    }

    const rawPhone = form.phone.trim().replace(/\s+/g, '');
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone}`;

    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: formattedPhone,
        password: form.password,
        referralCode: form.referralCode.trim() ? form.referralCode.trim().toUpperCase() : undefined,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const fields = [
    { key: 'name', placeholder: 'Full Name', icon: User, keyboard: 'default' as const, autoComplete: 'name' as const },
    { key: 'email', placeholder: 'Email address', icon: Mail, keyboard: 'email-address' as const, autoComplete: 'email' as const },
    { key: 'phone', placeholder: 'Phone number', icon: Phone, keyboard: 'phone-pad' as const, autoComplete: 'tel' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subtitle}>Join RepairBee to get your devices repaired!</Text>

          {localError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{localError}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {fields.map((f) => {
              const IconComponent = f.icon;
              return (
                <View key={f.key} style={styles.inputWrapper}>
                  <IconComponent size={18} color={Colors.textMuted} />
                  {f.key === 'phone' && <Text style={styles.phonePrefix}>+91</Text>}
                  <TextInput
                    style={styles.input}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    value={form[f.key as keyof typeof form]}
                    onChangeText={(t) => updateField(f.key, t)}
                    keyboardType={f.keyboard}
                    autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                    autoComplete={f.autoComplete}
                  />
                </View>
              );
            })}

            {/* Password */}
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                value={form.password}
                onChangeText={(t) => updateField('password', t)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} color={Colors.textMuted} /> : <Eye size={18} color={Colors.textMuted} />}
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={Colors.textMuted}
                value={form.confirm}
                onChangeText={(t) => updateField('confirm', t)}
                secureTextEntry={!showPassword}
              />
            </View>

            {/* Referral Code (Optional) */}
            <View style={styles.inputWrapper}>
              <Gift size={18} color={form.referralCode ? Colors.primary : Colors.textMuted} />
              <TextInput
                style={[
                  styles.input,
                  form.referralCode
                    ? { fontFamily: Fonts.headingBold, color: Colors.primary, letterSpacing: 1.5 }
                    : null,
                ]}
                placeholder="Referral Code (Optional — Get ₹100 Off)"
                placeholderTextColor={Colors.textMuted}
                value={form.referralCode}
                onChangeText={(t) => updateField('referralCode', t.toUpperCase().trim())}
                autoCapitalize="characters"
                maxLength={20}
              />
              {form.referralCode.length > 0 && (
                <View style={styles.appliedChip}>
                  <Text style={styles.appliedChipText}>🎁 ₹100 OFF</Text>
                </View>
              )}
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreedTerms(!agreedTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreedTerms && styles.checkboxChecked]}>
                {agreedTerms && <Check size={14} color={Colors.textInverse} />}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, isLoading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign up with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.googleButton} activeOpacity={0.7}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Sign up with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  backButton: { marginTop: Spacing.md, width: 44, height: 44, justifyContent: 'center' },
  heading: {
    fontFamily: Fonts.headingBold, fontSize: FontSizes.displayMd, color: Colors.textPrimary, marginTop: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.body, fontSize: FontSizes.bodyLg, color: Colors.textSecondary, marginTop: Spacing.xs,
  },
  errorBanner: {
    backgroundColor: Colors.errorBg, padding: Spacing.md, borderRadius: Radius.md,
    marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.error + '30',
  },
  errorText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.error },
  form: { marginTop: Spacing.lg },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, height: 52, gap: Spacing.sm, marginBottom: Spacing.md,
  },
  phonePrefix: {
    fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyLg, color: Colors.textSecondary,
    borderRightWidth: 1, borderRightColor: Colors.surfaceBorder, paddingRight: Spacing.sm,
  },
  input: { flex: 1, fontFamily: Fonts.body, fontSize: FontSizes.bodyLg, color: Colors.textPrimary },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.lg },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: Colors.surfaceBorder,
    justifyContent: 'center', alignItems: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  termsText: { flex: 1, fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textSecondary, lineHeight: 20 },
  termsLink: { fontFamily: Fonts.bodySemiBold, color: Colors.primary },
  registerButton: {
    backgroundColor: Colors.primary, height: 52, borderRadius: Radius.lg,
    justifyContent: 'center', alignItems: 'center', ...Shadows.md, shadowColor: Colors.primary,
  },
  registerButtonText: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyLg, color: Colors.textInverse },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg, gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.surfaceBorder },
  dividerText: { fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textMuted },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: Spacing.sm,
  },
  googleIcon: { fontFamily: Fonts.headingBold, fontSize: FontSizes.titleMd, color: '#4285F4' },
  googleText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyLg, color: Colors.textPrimary },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  loginText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textSecondary },
  loginLink: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyMd, color: Colors.primary },
  appliedChip: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  appliedChipText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.caption,
    color: Colors.primaryDark,
  },
});
