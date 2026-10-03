/**
 * Help & Support Screen — FAQs, 24/7 Helpline, and Ticket Submission
 * Matches PRD Section 2.1 & 4.7
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  HelpCircle,
  Phone,
  MessageSquare,
  Mail,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Package,
  Clock,
  ShieldCheck,
  Send,
  ExternalLink,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    id: '1',
    category: 'Escrow & Payments',
    question: 'How does RepairBee Escrow Payment protect me?',
    answer:
      'When you approve a workshop quote, your payment is held securely in an independent platform escrow account. Funds are released to the workshop only AFTER our runner delivers your fixed device back and you confirm delivery.',
  },
  {
    id: '2',
    category: 'Pickup & Security',
    question: 'What is the Tamper-Proof Barcoded Pouch?',
    answer:
      'For maximum security, our verified runner places your phone or tablet into an individually barcoded, sealed security pouch right in front of you. The barcode is scanned and logged into your order timeline.',
  },
  {
    id: '3',
    category: 'Quotes & Pricing',
    question: 'Can a repair workshop change the price later?',
    answer:
      'No. Workshops cannot start repair work or charge additional costs without sending you a revision quote. You have full control to approve or reject any quote beforehand.',
  },
  {
    id: '4',
    category: 'Warranty & Claims',
    question: 'How do I claim my 30 / 90 / 180-day Warranty?',
    answer:
      'Visit "My Warranties" from your profile. Active warranties feature a 1-tap "Claim Warranty" button that creates a free linked re-repair order with complimentary doorstep pickup.',
  },
  {
    id: '5',
    category: 'Cancellations',
    question: 'Can I cancel my repair order for a full refund?',
    answer:
      'Yes. You can cancel your repair request free of charge anytime before our delivery runner is dispatched for pickup. 100% of your funds are refunded immediately to your wallet or original payment source.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>('1');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Order Tracking');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = ['Order Tracking', 'Billing & Escrow', 'Device Quality', 'Warranty Claim', 'Other'];

  const toggleFAQ = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCall = () => {
    Linking.openURL('tel:+918049281900').catch(() => {
      Alert.alert('Phone Helpline', 'Toll-free customer care: +91 80 4928 1900 (9 AM - 9 PM IST)');
    });
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/918049281900?text=Hi%20RepairBee%20Support,%20I%20need%20assistance%20with%20my%20repair%20order.').catch(() => {
      Alert.alert('WhatsApp Care', 'Message our verified agent on WhatsApp: +91 80 4928 1900');
    });
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@repairbee.com?subject=RepairBee%20Customer%20Support').catch(() => {
      Alert.alert('Email Support', 'Write to our senior escalation desk: support@repairbee.com');
    });
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert('Incomplete Form', 'Please provide a subject and description of your issue.');
      return;
    }

    try {
      setSubmitting(true);
      await new Promise((r) => setTimeout(r, 800)); // simulate quick dispatch
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '🐝 Support Ticket Created',
        `Ticket #${Math.floor(100000 + Math.random() * 900000)} has been logged. Our priority desk will review and contact you within 30 minutes.`,
        [{ text: 'OK', onPress: () => { setTicketSubject(''); setTicketMessage(''); } }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Help & 24/7 Support',
          headerTintColor: Colors.primary,
          headerStyle: { backgroundColor: Colors.surface },
          headerTitleStyle: { fontFamily: Fonts.headingSemiBold, fontSize: 17 },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Quick Contact Hero */}
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>We're here to help you</Text>
            <Text style={styles.heroSub}>
              Have questions about your order, repair timeline, or escrow guarantee? Speak directly with our team.
            </Text>

            <View style={styles.contactRow}>
              <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8} onPress={handleCall}>
                <View style={[styles.contactIconCircle, { backgroundColor: '#eff6ff' }]}>
                  <Phone size={18} color="#2563eb" />
                </View>
                <Text style={styles.contactBtnText}>Call Helpline</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8} onPress={handleWhatsApp}>
                <View style={[styles.contactIconCircle, { backgroundColor: '#f0fdf4' }]}>
                  <MessageSquare size={18} color="#16a34a" />
                </View>
                <Text style={styles.contactBtnText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8} onPress={handleEmail}>
                <View style={[styles.contactIconCircle, { backgroundColor: '#fef2f2' }]}>
                  <Mail size={18} color="#dc2626" />
                </View>
                <Text style={styles.contactBtnText}>Email Desk</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Shortcuts */}
          <Text style={styles.sectionHeader}>Quick Actions</Text>
          <View style={styles.shortcutsRow}>
            <TouchableOpacity
              style={styles.shortcutCard}
              onPress={() => router.push('/(tabs)/orders')}
            >
              <Package size={20} color={Colors.primary} />
              <Text style={styles.shortcutTitle}>Track Orders</Text>
              <Text style={styles.shortcutSub}>View live runner & repair state</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutCard}
              onPress={() => router.push('/warranties')}
            >
              <ShieldCheck size={20} color={Colors.success} />
              <Text style={styles.shortcutTitle}>My Warranties</Text>
              <Text style={styles.shortcutSub}>Claim free re-repair coverage</Text>
            </TouchableOpacity>
          </View>

          {/* FAQ Accordion */}
          <Text style={styles.sectionHeader}>Frequently Asked Questions</Text>
          {FAQS.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <View key={faq.id} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  activeOpacity={0.7}
                  onPress={() => toggleFAQ(faq.id)}
                >
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  {isExpanded ? (
                    <ChevronUp size={18} color={Colors.primary} />
                  ) : (
                    <ChevronDown size={18} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqAnswerBox}>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    <View style={styles.faqCategoryPill}>
                      <Text style={styles.faqCategoryText}>{faq.category}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {/* Create Support Ticket Form */}
          <View style={styles.ticketSection}>
            <Text style={styles.sectionHeader}>Request Callback / Open Ticket</Text>
            <Text style={styles.ticketSub}>
              Fill out the details below and a senior customer advocate will review your case.
            </Text>

            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryChip, ticketCategory === c && styles.categoryChipActive]}
                  onPress={() => setTicketCategory(c)}
                >
                  <Text style={[styles.categoryChipText, ticketCategory === c && styles.categoryChipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Subject *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Need update on iPhone repair #2E200F"
              placeholderTextColor={Colors.textMuted}
              value={ticketSubject}
              onChangeText={setTicketSubject}
            />

            <Text style={styles.inputLabel}>Message Details *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your issue or question in detail..."
              placeholderTextColor={Colors.textMuted}
              value={ticketMessage}
              onChangeText={setTicketMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.submitBtn}
              activeOpacity={0.8}
              onPress={handleSubmitTicket}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <>
                  <Send size={16} color={Colors.textInverse} />
                  <Text style={styles.submitBtnText}>Submit Support Request</Text>
                </>
              )}
            </TouchableOpacity>
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
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  heroTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  heroSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  contactBtn: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 11,
    color: Colors.textPrimary,
  },
  sectionHeader: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  shortcutTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  shortcutSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  faqCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  faqQuestion: {
    flex: 1,
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginRight: Spacing.sm,
  },
  faqAnswerBox: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.sm,
  },
  faqAnswer: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  faqCategoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    marginTop: 8,
  },
  faqCategoryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.primary,
  },
  ticketSection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.md,
    ...Shadows.sm,
  },
  ticketSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  categoryScroll: {
    marginBottom: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.textInverse,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  textArea: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    minHeight: 90,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
    ...Shadows.sm,
  },
  submitBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textInverse,
  },
});
