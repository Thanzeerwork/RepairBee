/**
 * Rating Screen — Rate shop and runner after delivery confirmation
 * Matches Stitch design: Rating & Review
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Star, X } from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { api } from '../../src/api/client';
import * as Haptics from 'expo-haptics';

const SHOP_TAGS = ['Fast service', 'Good quality', 'Friendly staff', 'Fair price', 'Clean work', 'Professional'];
const RUNNER_TAGS = ['On time', 'Careful handling', 'Polite', 'Fast delivery'];
const TIP_OPTIONS = [20, 50, 100];

export default function RatingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const [shopRating, setShopRating] = useState(0);
  const [runnerRating, setRunnerRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedShopTags, setSelectedShopTags] = useState<string[]>([]);
  const [selectedRunnerTags, setSelectedRunnerTags] = useState<string[]>([]);
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const handleSubmit = async () => {
    if (shopRating === 0) {
      Alert.alert('Rating Required', 'Please rate the repair shop.');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitRating(orderId!, {
        shopRating,
        runnerRating,
        reviewText,
        shopTags: selectedShopTags,
        runnerTags: selectedRunnerTags,
        tipAmount,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('🎉 Thank you!', 'Your review helps other customers.', [
        { text: 'Done', onPress: () => router.replace('/(tabs)/orders') },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, setRating: (v: number) => void, size = 32) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => {
            setRating(star);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Star
            size={size}
            color={star <= rating ? Colors.star : Colors.starEmpty}
            fill={star <= rating ? Colors.star : 'none'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Success Banner */}
        <View style={styles.successBanner}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Repair Complete!</Text>
          <Text style={styles.successSub}>Your device has been delivered successfully</Text>
        </View>

        {/* Rate Shop */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How was QuickFix Electronics?</Text>
          <View style={styles.ratingCard}>
            <View style={styles.shopInfo}>
              <View style={styles.shopAvatar}>
                <Text style={styles.shopAvatarText}>🔧</Text>
              </View>
              <Text style={styles.shopName}>QuickFix Electronics</Text>
            </View>
            {renderStars(shopRating, setShopRating)}
            {shopRating > 0 && (
              <Text style={styles.ratingLabel}>
                {shopRating === 5 ? 'Excellent!' : shopRating === 4 ? 'Great!' : shopRating === 3 ? 'Good' : shopRating === 2 ? 'Fair' : 'Poor'}
              </Text>
            )}
          </View>

          <TextInput
            style={styles.reviewInput}
            placeholder="Share your experience (optional)"
            placeholderTextColor={Colors.textMuted}
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{reviewText.length}/500</Text>

          <View style={styles.tagsWrap}>
            {SHOP_TAGS.map((tag) => {
              const isSelected = selectedShopTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, isSelected && styles.tagSelected]}
                  onPress={() => toggleTag(tag, selectedShopTags, setSelectedShopTags)}
                >
                  <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Rate Runner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How was the delivery?</Text>
          <View style={styles.ratingCard}>
            <View style={styles.shopInfo}>
              <View style={styles.runnerAvatar}>
                <Text style={styles.shopAvatarText}>🚴</Text>
              </View>
              <Text style={styles.shopName}>Rahul K.</Text>
            </View>
            {renderStars(runnerRating, setRunnerRating, 28)}
          </View>

          <View style={styles.tagsWrap}>
            {RUNNER_TAGS.map((tag) => {
              const isSelected = selectedRunnerTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, isSelected && styles.tagSelected]}
                  onPress={() => toggleTag(tag, selectedRunnerTags, setSelectedRunnerTags)}
                >
                  <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tip Runner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tip your runner?</Text>
          <View style={styles.tipRow}>
            {TIP_OPTIONS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[styles.tipChip, tipAmount === amount && styles.tipChipActive]}
                onPress={() => setTipAmount(tipAmount === amount ? null : amount)}
              >
                <Text style={[styles.tipText, tipAmount === amount && styles.tipTextActive]}>
                  ₹{amount}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.tipChip, tipAmount !== null && !TIP_OPTIONS.includes(tipAmount) && styles.tipChipActive]}
              onPress={() => setTipAmount(0)}
            >
              <Text style={styles.tipText}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.submitText}>Submit Review</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.screenPadding, paddingTop: 56 },
  closeButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceDim,
    justifyContent: 'center', alignItems: 'center',
  },
  successBanner: { alignItems: 'center', paddingVertical: Spacing.lg },
  successEmoji: { fontSize: 56 },
  successTitle: {
    fontFamily: Fonts.headingBold, fontSize: FontSizes.titleLg, color: Colors.success, marginTop: Spacing.sm,
  },
  successSub: { fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textSecondary, marginTop: 4 },
  section: { paddingHorizontal: Spacing.screenPadding, marginTop: Spacing.lg },
  sectionTitle: {
    fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.titleSm, color: Colors.textPrimary, marginBottom: Spacing.md,
  },
  ratingCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadows.sm,
  },
  shopInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  shopAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  runnerAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.infoBg,
    justifyContent: 'center', alignItems: 'center',
  },
  shopAvatarText: { fontSize: 20 },
  shopName: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyLg, color: Colors.textPrimary },
  starsRow: { flexDirection: 'row', gap: Spacing.sm },
  ratingLabel: {
    fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.primary, marginTop: Spacing.sm,
  },
  reviewInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
    fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textPrimary,
    minHeight: 80, marginTop: Spacing.md,
  },
  charCount: {
    fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textMuted,
    textAlign: 'right', marginTop: 4,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  tag: {
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  tagSelected: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  tagText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textSecondary },
  tagTextSelected: { color: Colors.primary },
  tipRow: { flexDirection: 'row', gap: Spacing.sm },
  tipChip: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  tipChipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  tipText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textSecondary },
  tipTextActive: { color: Colors.primary },
  submitSection: { paddingHorizontal: Spacing.screenPadding, marginTop: Spacing.xl, alignItems: 'center' },
  submitButton: {
    width: '100%', height: 52, borderRadius: Radius.lg, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', ...Shadows.md, shadowColor: Colors.primary,
  },
  submitText: { fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyLg, color: Colors.textInverse },
  skipText: {
    fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.bodyMd, color: Colors.textMuted, marginTop: Spacing.md,
  },
});
