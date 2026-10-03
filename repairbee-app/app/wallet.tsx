/**
 * Wallet Screen — Digital repair balance, instant top-ups, and escrow ledger
 * Matches PRD Section 2.1, 4.5 & 4.12
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Sparkles,
  Clock,
  ChevronRight,
  CreditCard,
  Lock,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';
import { useAuthStore } from '../src/stores/authStore';
import { api } from '../src/api/client';

interface Transaction {
  id: string;
  order_id?: string;
  amount: number | string;
  method?: string;
  escrow_status?: string;
  created_at: string;
  product_name?: string;
}

export default function WalletScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [balance, setBalance] = useState<number>(user?.walletBalance ?? 0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [addingMoney, setAddingMoney] = useState(false);

  const quickAmounts = ['200', '500', '1000', '2000'];

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await api.getWallet();
      const data = res.data?.data || {};
      const newBal = typeof data.balance === 'number' ? data.balance : Number(data.balance || 0);
      setBalance(newBal);
      setTransactions(data.transactions || []);
      updateUser({ walletBalance: newBal });
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWallet();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWallet();
    setRefreshing(false);
  };

  const handleTopUp = async () => {
    const val = parseFloat(topUpAmount);
    if (!val || val < 10) {
      Alert.alert('Invalid Amount', 'Please enter at least ₹10 to top up your balance.');
      return;
    }

    try {
      setAddingMoney(true);
      const res = await api.topUpWallet(val);
      const newBal = res.data?.data?.balance ?? balance + val;
      setBalance(newBal);
      updateUser({ walletBalance: newBal });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('🎉 Balance Added!', `₹${val} has been deposited into your RepairBee wallet.`);
      fetchWallet();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Top-up failed.';
      Alert.alert('Top-up Error', msg);
    } finally {
      setAddingMoney(false);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'RepairBee Wallet',
          headerTintColor: Colors.primary,
          headerStyle: { backgroundColor: Colors.surface },
          headerTitleStyle: { fontFamily: Fonts.headingSemiBold, fontSize: 17 },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {/* Honeycomb Golden Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.cardHeader}>
              <View style={styles.walletIconCircle}>
                <Wallet size={20} color={Colors.textInverse} />
              </View>
              <View style={styles.escrowChip}>
                <Lock size={12} color="#fef3c7" />
                <Text style={styles.escrowChipText}>Escrow Protected</Text>
              </View>
            </View>

            <Text style={styles.balanceLabel}>Available Repair Credits</Text>
            <Text style={styles.balanceAmount}>₹{balance.toLocaleString('en-IN')}</Text>

            <View style={styles.cardFooter}>
              <View style={styles.cardInfoItem}>
                <Text style={styles.cardInfoLabel}>Account Status</Text>
                <Text style={styles.cardInfoVal}>Verified Customer</Text>
              </View>
              <View style={styles.cardInfoItem}>
                <Text style={styles.cardInfoLabel}>Auto-Release</Text>
                <Text style={styles.cardInfoVal}>On Delivery</Text>
              </View>
            </View>
          </View>

          {/* Quick Top-Up Section */}
          <View style={styles.topUpCard}>
            <Text style={styles.sectionTitle}>Add Money to Wallet</Text>
            <Text style={styles.topUpSub}>Instant top-up for 1-tap quote approval & checkout</Text>

            <View style={styles.amountInputRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="numeric"
                placeholder="500"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Quick chips */}
            <View style={styles.chipsRow}>
              {quickAmounts.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.chip, topUpAmount === amt && styles.chipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTopUpAmount(amt);
                  }}
                >
                  <Text style={[styles.chipText, topUpAmount === amt && styles.chipTextActive]}>
                    +₹{amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.addMoneyBtn}
              activeOpacity={0.8}
              onPress={handleTopUp}
              disabled={addingMoney}
            >
              {addingMoney ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <>
                  <Plus size={18} color={Colors.textInverse} />
                  <Text style={styles.addMoneyBtnText}>Deposit ₹{topUpAmount || 0}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Escrow Guarantee Banner */}
          <View style={styles.escrowBanner}>
            <ShieldCheck size={22} color={Colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.escrowBannerTitle}>100% Escrow Guarantee</Text>
              <Text style={styles.escrowBannerSub}>
                Funds are released to the workshop only after you inspect the device and approve return delivery.
              </Text>
            </View>
          </View>

          {/* Transaction History Section */}
          <View style={styles.historyHeaderRow}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Clock size={32} color={Colors.textMuted} />
              <Text style={styles.emptyHistoryTitle}>No Recent Transactions</Text>
              <Text style={styles.emptyHistorySub}>
                Your wallet top-ups, referral rewards, and repair escrow releases will appear here.
              </Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const isCredit = tx.method === 'wallet_topup' || tx.method === 'referral';
              const isEscrow = tx.escrow_status === 'held';

              return (
                <View key={tx.id} style={styles.txCard}>
                  <View
                    style={[
                      styles.txIconCircle,
                      isCredit
                        ? { backgroundColor: Colors.successLight }
                        : { backgroundColor: Colors.primaryLight },
                    ]}
                  >
                    {isCredit ? (
                      <ArrowDownLeft size={18} color={Colors.success} />
                    ) : (
                      <ArrowUpRight size={18} color={Colors.primary} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>
                      {isCredit
                        ? 'Wallet Deposit'
                        : tx.product_name
                        ? `${tx.product_name} Repair Payment`
                        : 'Repair Escrow Payment'}
                    </Text>
                    <Text style={styles.txDate}>{formatTimestamp(tx.created_at)}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmount, isCredit ? { color: Colors.success } : { color: Colors.textPrimary }]}>
                      {isCredit ? `+₹${tx.amount}` : `-₹${tx.amount}`}
                    </Text>
                    <View
                      style={[
                        styles.txStatusPill,
                        isEscrow
                          ? { backgroundColor: '#fef3c7' }
                          : { backgroundColor: Colors.surfaceDim },
                      ]}
                    >
                      <Text
                        style={[
                          styles.txStatusText,
                          isEscrow ? { color: '#b45309' } : { color: Colors.textSecondary },
                        ]}
                      >
                        {isEscrow ? 'Held in Escrow' : 'Completed'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

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
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  walletIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  escrowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  escrowChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: '#ffffff',
  },
  balanceLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontFamily: Fonts.headingBold,
    fontSize: 32,
    color: Colors.textInverse,
    marginBottom: Spacing.lg,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: Spacing.sm,
  },
  cardInfoItem: {},
  cardInfoLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  cardInfoVal: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.textInverse,
    marginTop: 2,
  },
  topUpCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
  },
  topUpSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    marginBottom: Spacing.md,
  },
  currencySymbol: {
    fontFamily: Fonts.headingBold,
    fontSize: 24,
    color: Colors.primary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: Fonts.headingBold,
    fontSize: 24,
    color: Colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
  },
  addMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    ...Shadows.sm,
  },
  addMoneyBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textInverse,
  },
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.success + '40',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  escrowBannerTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.caption,
    color: Colors.success,
  },
  escrowBannerSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  refreshText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.primary,
  },
  emptyHistory: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emptyHistoryTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptyHistorySub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  txIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  txDate: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyMd,
  },
  txStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    marginTop: 4,
  },
  txStatusText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
  },
});
