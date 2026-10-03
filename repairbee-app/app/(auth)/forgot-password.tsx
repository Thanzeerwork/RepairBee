/**
 * Forgot Password & Password Recovery Flow
 * 2-step verification: Email lookup -> 6-digit OTP & new password
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { api } from '../../src/api/client';
import * as Haptics from 'expo-haptics';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  // Steps: 'request' | 'verify' | 'success'
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');

  // Form State
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  // Timer for resend
  useEffect(() => {
    let timer: any;
    if (step === 'verify' && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleRequestCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email address.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setError('Please enter a valid email address.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.forgotPassword(trimmed);
      const data = res.data?.data;

      // In dev mode: if code is provided in response, store it as a handy hint
      if (data?.code) {
        setDevCodeHint(data.code);
        setCode(data.code); // auto-fill for testing convenience
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCountdown(30);
      setCanResend(false);
      setStep('verify');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send recovery code. Please try again.';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.forgotPassword(email.trim().toLowerCase());
      const data = res.data?.data;
      if (data?.code) {
        setDevCodeHint(data.code);
        setCode(data.code);
      }
      setCountdown(30);
      setCanResend(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Code Resent', 'A fresh 6-digit recovery code has been sent.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unable to resend code right now.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode || trimmedCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must include at least 1 uppercase letter and 1 number.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.resetPassword({
        email: email.trim().toLowerCase(),
        code: trimmedCode,
        password: newPassword,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('success');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to reset password. Please check your code.';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step === 'verify') setStep('request');
                else router.back();
              }}
            >
              <ArrowLeft size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account Recovery</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Step 1: Request Recovery Code */}
          {step === 'request' && (
            <View style={styles.contentWrap}>
              <View style={styles.iconContainer}>
                <KeyRound size={36} color={Colors.primary} />
              </View>

              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                No worries! Enter the email address associated with your RepairBee account and we will send you a 6-digit recovery code.
              </Text>

              {error && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Registered Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. rahul@example.com"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      setError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleRequestCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textInverse} />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Recovery Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLoginRow}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text style={styles.backToLoginMuted}>Remember your password? </Text>
                <Text style={styles.backToLoginHighlight}>Log in</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Verify Code & Set New Password */}
          {step === 'verify' && (
            <View style={styles.contentWrap}>
              <View style={styles.iconContainer}>
                <ShieldCheck size={36} color={Colors.primary} />
              </View>

              <Text style={styles.title}>Enter Recovery Code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit verification code to{' '}
                <Text style={styles.emailHighlight}>{email}</Text>. Enter it below along with your new password.
              </Text>

              {devCodeHint && (
                <View style={styles.devHintBox}>
                  <Text style={styles.devHintTitle}>⚡ Quick Test Code</Text>
                  <Text style={styles.devHintText}>
                    Use test code: <Text style={{ fontFamily: Fonts.headingBold }}>{devCodeHint}</Text>
                  </Text>
                </View>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* 6-Digit Code Input */}
              <View style={styles.inputGroup}>
                <View style={styles.codeHeaderRow}>
                  <Text style={styles.inputLabel}>6-Digit Recovery Code</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setStep('request');
                      setError(null);
                    }}
                  >
                    <Text style={styles.changeEmailText}>Change email</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <KeyRound size={18} color={Colors.textMuted} />
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="123456"
                    placeholderTextColor={Colors.textMuted}
                    value={code}
                    onChangeText={(t) => {
                      setCode(t.replace(/[^0-9]/g, '').slice(0, 6));
                      setError(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="At least 8 characters (1 uppercase, 1 digit)"
                    placeholderTextColor={Colors.textMuted}
                    value={newPassword}
                    onChangeText={(t) => {
                      setNewPassword(t);
                      setError(null);
                    }}
                    secureTextEntry={!showPassword}
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

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your new password"
                    placeholderTextColor={Colors.textMuted}
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      setError(null);
                    }}
                    secureTextEntry={!showConfirm}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? (
                      <EyeOff size={18} color={Colors.textMuted} />
                    ) : (
                      <Eye size={18} color={Colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Resend Link */}
              <View style={styles.resendRow}>
                {canResend ? (
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResendCode}
                    disabled={loading}
                  >
                    <RefreshCw size={14} color={Colors.primary} />
                    <Text style={styles.resendActiveText}>Resend code</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.resendCountdownText}>
                    Resend code in <Text style={{ fontFamily: Fonts.bodySemiBold }}>{countdown}s</Text>
                  </Text>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textInverse} />
                ) : (
                  <Text style={styles.primaryButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Success State */}
          {step === 'success' && (
            <View style={[styles.contentWrap, styles.successWrap]}>
              <View style={styles.successIconBox}>
                <CheckCircle2 size={56} color={Colors.success} />
              </View>

              <Text style={styles.successTitle}>Password Changed!</Text>
              <Text style={styles.successSubtitle}>
                Your password has been successfully updated. You can now use your new password to sign into your RepairBee account.
              </Text>

              <View style={styles.securityPouchBadge}>
                <ShieldCheck size={18} color={Colors.primary} />
                <Text style={styles.securityPouchText}>
                  Your account is secured with end-to-end credential hashing.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Proceed to Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  contentWrap: {
    paddingTop: Spacing.xl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emailHighlight: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  devHintBox: {
    backgroundColor: '#fffbeb',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  devHintTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.caption,
    color: '#92400e',
    marginBottom: 2,
  },
  devHintText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: '#b45309',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorBg,
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.error,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  codeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  changeEmailText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.primary,
  },
  inputLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    height: 52,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  codeInput: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleMd,
    letterSpacing: 4,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginTop: -Spacing.xs,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  resendActiveText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.primary,
  },
  resendCountdownText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  primaryButtonText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.textInverse,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  backToLoginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  backToLoginMuted: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  backToLoginHighlight: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.primary,
  },
  successWrap: {
    alignItems: 'center',
    paddingTop: Spacing.xxl * 1.5,
  },
  successIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  securityPouchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginBottom: Spacing.xxl,
    marginHorizontal: Spacing.md,
  },
  securityPouchText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.primaryDark,
  },
});
