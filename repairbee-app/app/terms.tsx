/**
 * Terms of Service Screen — Marketplace terms & warranties
 * Matches PRD Section 2.1
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { FileText, ShieldCheck, Scale, AlertTriangle } from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';

export default function TermsOfServiceScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Terms of Service',
          headerTintColor: Colors.primary,
          headerStyle: { backgroundColor: Colors.surface },
          headerTitleStyle: { fontFamily: Fonts.headingSemiBold, fontSize: 17 },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.iconCircle}>
              <Scale size={22} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Customer Agreement & Terms</Text>
            <Text style={styles.heroSub}>
              Please review the guidelines governing doorstep pickup, repair execution, quotes, and escrow protections on RepairBee.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Marketplace Role</Text>
            <Text style={styles.sectionBody}>
              RepairBee operates as a two-sided technology platform connecting verified local repair workshops, background-checked delivery partners, and consumers. Repair warranties are backed by both the servicing workshop and the RepairBee Escrow Guarantee.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Quote Approval & Escrow Payment</Text>
            <Text style={styles.sectionBody}>
              Workshops provide itemized quotes based on your initial request and hardware inspection. Once you approve a quote, funds are safely placed in escrow. You maintain the right to reject revised quotes before repair work commences.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. 30–180 Day Tiered Warranty</Text>
            <Text style={styles.sectionBody}>
              All completed repairs carry mandatory warranty protection (Silver 30 days, Gold 90 days, or Diamond 180 days). If the serviced fault reoccurs during the warranty term, a complimentary re-repair order is arranged with no transit fees.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Dispute Resolution Policy</Text>
            <Text style={styles.sectionBody}>
              Customers can raise a formal dispute within 48 hours of return delivery. Disputed funds remain frozen in escrow while platform arbiters inspect the cleanroom QC report, runner pouch photo evidence, and technician logs.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Last Revised: October 2026</Text>
            <Text style={styles.footerSub}>RepairBee Technologies Pvt Ltd • Bangalore, India</Text>
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
