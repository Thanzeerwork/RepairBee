/**
 * Login Screen — Email/password + Google OAuth
 * Matches Stitch design: Login Screen
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both email and password.');
      return;
    }
    setLocalError('');
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const displayError = localError || error;

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
          {/* Logo */}
          <View style={styles.logoSection}>
            <Text style={styles.logoEmoji}>🐝</Text>
            <Text style={styles.logoText}>RepairBee</Text>
          </View>

          {/* Heading */}
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to manage your repairs</Text>

          {/* Error */}
          {displayError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearError(); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearError(); }}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={18} color={Colors.textMuted} />
                  ) : (
                    <Eye size={18} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Button */}
            <TouchableOpacity style={styles.googleButton} activeOpacity={0.7}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Register</Text>
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
  logoSection: { alignItems: 'center', marginTop: Spacing.xxl },
  logoEmoji: { fontSize: 48 },
  logoText: {
    fontFamily: Fonts.headingBold, fontSize: FontSizes.titleLg, color: Colors.textPrimary, marginTop: 4,
  },
  heading: {
    fontFamily: Fonts.headingBold, fontSize: FontSizes.displayMd, color: Colors.textPrimary,
    textAlign: 'center', marginTop: Spacing.lg,
  },
  subtitle: {
    fontFamily: Fonts.body, fontSize: FontSizes.bodyLg, color: Colors.textSecondary,
    textAlign: 'center', marginTop: Spacing.xs,
  },
  errorBanner: {
    backgroundColor: Colors.errorBg, padding: Spacing.md, borderRadius: Radius.md,
    marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.error + '30',
  },
  errorText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.error, textAlign: 'center' },
  form: { marginTop: Spacing.lg },
  inputGroup: { marginBottom: Spacing.md },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, height: 52, gap: Spacing.sm,
  },
  input: {
    flex: 1, fontFamily: Fonts.body, fontSize: FontSizes.bodyLg, color: Colors.textPrimary,
  },
  forgotLink: { alignSelf: 'flex-end', marginBottom: Spacing.lg },
  forgotText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.primary },
  loginButton: {
    backgroundColor: Colors.primary, height: 52, borderRadius: Radius.lg,
    justifyContent: 'center', alignItems: 'center', ...Shadows.md, shadowColor: Colors.primary,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: {
    fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyLg, color: Colors.textInverse,
  },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg, gap: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.surfaceBorder },
  dividerText: { fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textMuted },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface, gap: Spacing.sm,
  },
  googleIcon: {
    fontFamily: Fonts.headingBold, fontSize: FontSizes.titleMd, color: '#4285F4',
  },
  googleText: {
    fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyLg, color: Colors.textPrimary,
  },
  registerRow: {
    flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg,
  },
  registerText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textSecondary },
  registerLink: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyMd, color: Colors.primary },
});
