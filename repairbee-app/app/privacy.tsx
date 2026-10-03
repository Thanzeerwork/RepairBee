/**
 * Privacy Policy Screen — Data protection & encryption terms
 * Matches PRD Section 2.1
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Shield, Lock, Eye, Database, CheckCircle2 } from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Privacy Policy',
          headerTintColor: Colors.primary,
          headerStyle: { backgroundColor: Colors.surface },
          headerTitleStyle: { fontFamily: Fonts.headingSemiBold, fontSize: 17 },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.iconCircle}>
              <Lock size={22} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Your Privacy is Protected</Text>
            <Text style={styles.heroSub}>
              RepairBee employs end-to-end data encryption, strict workshop NDAs, and zero-knowledge handling for all repaired customer devices.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Device Data & Confidentiality</Text>
            <Text style={styles.sectionBody}>
              Certified workshops and doorstep runners are bound by strict non-disclosure agreements. Technicians do not access your photos, personal documents, or sensitive applications unless diagnostic troubleshooting explicitly requires hardware-level display inspection under your authorization.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. GPS & Doorstep Location</Text>
            <Text style={styles.sectionBody}>
              Your GPS coordinates and address are only shared with the assigned delivery runner during active pickup and return delivery windows. Once delivery is confirmed, telemetry tracking is permanently archived.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Payment Security & Escrow</Text>
            <Text style={styles.sectionBody}>
              All transactions are processed through RBI-authorized payment gateways (Razorpay/UPI). RepairBee does not store full credit or debit card numbers on our servers. Funds remain in escrow until you approve the repair completion.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Deletion Rights</Text>
            <Text style={styles.sectionBody}>
              You have the right to request deletion of your account and personal history at any time through our Settings menu or by writing to privacy@repairbee.com.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Effective Date: October 2026 • Version 1.0</Text>
            <Text style={styles.footerSub}>RepairBee Technologies Pvt Ltd</Text>
          </View>

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
  heroCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  sectionBody: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  footerSub: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
