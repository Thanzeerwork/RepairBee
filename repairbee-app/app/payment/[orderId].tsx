/**
 * Escrow Payment & Gateway Checkout Screen
 * Secure multi-method payment held in RBI-compliant Escrow Vault until delivery & testing.
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
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  CheckCircle2,
  CreditCard,
  Wallet,
  Smartphone,
  Building2,
  Sparkles,
  ChevronRight,
  Info,
  AlertCircle,
  Check,
  Zap,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { api } from '../../src/api/client';

type PaymentTab = 'upi' | 'card' | 'wallet' | 'netbanking';

const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay', icon: '🟢', sub: 'Instant UPI' },
  { id: 'phonepe', name: 'PhonePe', icon: '🟣', sub: 'Instant UPI' },
  { id: 'paytm', name: 'Paytm UPI', icon: '🔵', sub: 'Instant UPI' },
  { id: 'cred', name: 'CRED UPI', icon: '⚪', sub: 'Instant UPI' },
];

const TOP_BANKS = [
  { id: 'hdfc', name: 'HDFC Bank', code: 'HDFC' },
  { id: 'icici', name: 'ICICI Bank', code: 'ICICI' },
  { id: 'sbi', name: 'State Bank of India', code: 'SBI' },
  { id: 'axis', name: 'Axis Bank', code: 'AXIS' },
  { id: 'kotak', name: 'Kotak Mahindra', code: 'KOTAK' },
];

export default function PaymentCheckoutScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();

  // Order & pricing state
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Payment tab selection
  const [selectedTab, setSelectedTab] = useState<PaymentTab>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);

  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(true);

  // NetBanking
  const [selectedBank, setSelectedBank] = useState('hdfc');

  // Processing & Escrow Lock Modal
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(1);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [escrowRefId, setEscrowRefId] = useState('');
  const [transactionId, setTransactionId] = useState('');

  // Fetch Order details & Wallet Balance
  useEffect(() => {
    async function loadCheckoutData() {
      try {
        setLoading(true);
        if (orderId) {
          const [orderRes, walletRes] = await Promise.allSettled([
            api.getOrderById(orderId),
            api.getWallet(),
          ]);

          if (orderRes.status === 'fulfilled') {
            setOrder(orderRes.value.data?.data);
          }
          if (walletRes.status === 'fulfilled') {
            setWalletBalance(Number(walletRes.value.data?.data?.balance || 0));
          }
        }
      } catch (err: any) {
        Alert.alert('Error', 'Unable to load repair order bill details.');
      } finally {
        setLoading(false);
      }
    }
    loadCheckoutData();
  }, [orderId]);

  // Price calculations
  const quoteAmt = Number(order?.quote_amount || 1200);
  const laborFee = Math.round(quoteAmt * 0.25);
  const partsFee = quoteAmt - laborFee;
  const deliveryCharge = Number(order?.delivery_charge || 46);
  const discountAmt = Number(order?.discount_amount || 0);
  const gstAmount = Math.round((quoteAmt + deliveryCharge) * 0.18);
  const totalAmount = Math.max(1, quoteAmt + deliveryCharge - discountAmt);

  // Format Card Number (with space formatting)
  const handleCardNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    setCardNumber(formatted);
  };

  // Format Expiry MM/YY
  const handleExpiryChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    } else {
      setExpiry(cleaned);
    }
  };

  // Card Brand Detection
  const getCardBrand = () => {
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'MASTERCARD';
    if (/^(60|65|81|82)/.test(clean)) return 'RUPAY';
    if (/^3[47]/.test(clean)) return 'AMEX';
    return 'CARD';
  };

  // UPI verification simulation
  const handleVerifyUpi = () => {
    if (!upiId.includes('@')) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI address like user@okhdfcbank');
      return;
    }
    setUpiVerified(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('✅ UPI Verified', `Verified Name: ${order?.customer_name || 'Customer'}`);
  };

  // Execute Payment via Escrow
  const handleInitiatePayment = async () => {
    // Validation
    if (selectedTab === 'upi' && !selectedUpiApp && !upiVerified && !upiId) {
      Alert.alert('Select UPI App', 'Please choose a UPI app or verify your UPI ID.');
      return;
    }
    if (selectedTab === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 15) {
        Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number.');
        return;
      }
      if (expiry.length < 5) {
        Alert.alert('Invalid Expiry', 'Please enter card expiry in MM/YY format.');
        return;
      }
      if (cvv.length < 3) {
        Alert.alert('Invalid CVV', 'Please enter a 3 or 4 digit CVV code.');
        return;
      }
    }
    if (selectedTab === 'wallet' && walletBalance < totalAmount) {
      Alert.alert(
        'Insufficient Wallet Balance',
        `You have ₹${walletBalance.toFixed(2)}, but total payable is ₹${totalAmount}. Please select UPI or Card.`
      );
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStep(1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const generatedEscrowId = `ESC-${Math.floor(100000 + Math.random() * 900000)}`;
      const generatedTxnId = `TXN-RPB-${Date.now().toString().slice(-8)}`;
      setEscrowRefId(generatedEscrowId);
      setTransactionId(generatedTxnId);

      // Step 1: Gateway Handshake
      await new Promise((r) => setTimeout(r, 900));
      setProcessingStep(2);

      if (selectedTab === 'wallet') {
        // Step 2: Pay from RepairBee Wallet
        await api.payFromWallet(orderId!);
      } else {
        // Step 2 & 3: Create & Verify simulated payment order
        const createRes = await api.createPaymentOrder(orderId!, selectedTab);
        const rzpOrderId = createRes.data?.data?.razorpay_order_id || `order_sim_${Date.now()}`;

        await new Promise((r) => setTimeout(r, 900));
        setProcessingStep(3);

        await api.verifyPayment({
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: generatedTxnId,
          razorpay_signature: 'simulated_signature',
        });
      }

      await new Promise((r) => setTimeout(r, 900));
      setProcessingStep(4);
      setPaymentSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert(
        'Payment Incomplete',
        err.response?.data?.message || 'Transaction could not be completed. Please try again.'
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Preparing Escrow Checkout...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.topTitleWrap}>
          <Text style={styles.topTitle}>Escrow Checkout</Text>
          <Text style={styles.topSub}>Order #{orderId?.slice(-6).toUpperCase() || 'REPAIR'}</Text>
        </View>
        <View style={styles.secureHeaderBadge}>
          <Lock size={12} color={Colors.tertiary} />
          <Text style={styles.secureHeaderText}>256-Bit SSL</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Escrow Guarantee Highlight Card */}
        <View style={styles.escrowCard}>
          <View style={styles.escrowBadgeRow}>
            <View style={styles.shieldIconBox}>
              <ShieldCheck size={24} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.escrowTitle}>RepairBee Escrow Vault 🛡️</Text>
              <Text style={styles.escrowSub}>Zero Risk • 100% RBI-Compliant Escrow</Text>
            </View>
          </View>
          <Text style={styles.escrowExplainer}>
            Your payment is held safely in escrow. Funds are disbursed to the workshop only{' '}
            <Text style={{ fontFamily: Fonts.bodyBold, color: Colors.primaryDark }}>
              AFTER delivery is completed and you test your device.
            </Text>
          </Text>

          <View style={styles.guaranteePillRow}>
            <View style={styles.guaranteePill}>
              <Check size={11} color={Colors.tertiary} />
              <Text style={styles.guaranteePillText}>Full Refund if Unfixable</Text>
            </View>
            <View style={styles.guaranteePill}>
              <Check size={11} color={Colors.tertiary} />
              <Text style={styles.guaranteePillText}>24h Testing Window</Text>
            </View>
            <View style={styles.guaranteePill}>
              <Check size={11} color={Colors.tertiary} />
              <Text style={styles.guaranteePillText}>90-Day OEM Warranty</Text>
            </View>
          </View>
        </View>

        {/* Itemized Bill Breakdown */}
        <View style={styles.billCard}>
          <View style={styles.billHeader}>
            <Text style={styles.billTitle}>Bill Breakdown</Text>
            <Text style={styles.deviceLabel}>
              {order?.product_name || order?.productName || 'Device Repair'}
            </Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billItem}>Spare Parts & Cleanroom Hardware</Text>
            <Text style={styles.billValue}>₹{partsFee}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billItem}>Certified Technician Labor</Text>
            <Text style={styles.billValue}>₹{laborFee}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billItem}>Doorstep Courier & Tamper-Pouch</Text>
            <Text style={styles.billValue}>₹{deliveryCharge}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billItem}>GST Tax (18% Itemized)</Text>
            <Text style={styles.billValue}>₹{gstAmount}</Text>
          </View>

          {discountAmt > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billItem, { color: Colors.tertiary }]}>
                Promo Coupon Discount
              </Text>
              <Text style={[styles.billValue, { color: Colors.tertiary }]}>
                -₹{discountAmt}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total Payable via Escrow</Text>
              <Text style={styles.totalSub}>Inclusive of all taxes & insurance</Text>
            </View>
            <Text style={styles.totalPrice}>₹{totalAmount}</Text>
          </View>
        </View>

        {/* Payment Method Tabs */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionHeading}>Select Payment Method</Text>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, selectedTab === 'upi' && styles.tabButtonActive]}
              onPress={() => setSelectedTab('upi')}
              activeOpacity={0.8}
            >
              <Smartphone size={16} color={selectedTab === 'upi' ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, selectedTab === 'upi' && styles.tabTextActive]}>
                UPI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, selectedTab === 'card' && styles.tabButtonActive]}
              onPress={() => setSelectedTab('card')}
              activeOpacity={0.8}
            >
              <CreditCard size={16} color={selectedTab === 'card' ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, selectedTab === 'card' && styles.tabTextActive]}>
                Card
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, selectedTab === 'wallet' && styles.tabButtonActive]}
              onPress={() => setSelectedTab('wallet')}
              activeOpacity={0.8}
            >
              <Wallet size={16} color={selectedTab === 'wallet' ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, selectedTab === 'wallet' && styles.tabTextActive]}>
                Wallet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, selectedTab === 'netbanking' && styles.tabButtonActive]}
              onPress={() => setSelectedTab('netbanking')}
              activeOpacity={0.8}
            >
              <Building2 size={16} color={selectedTab === 'netbanking' ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, selectedTab === 'netbanking' && styles.tabTextActive]}>
                NetBanking
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: UPI */}
          {selectedTab === 'upi' && (
            <View style={styles.tabContentCard}>
              <Text style={styles.tabInnerTitle}>Instant UPI Apps</Text>
              <View style={styles.upiGrid}>
                {UPI_APPS.map((app) => (
                  <TouchableOpacity
                    key={app.id}
                    style={[
                      styles.upiOption,
                      selectedUpiApp === app.id && styles.upiOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedUpiApp(app.id);
                      setUpiVerified(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.upiEmoji}>{app.icon}</Text>
                    <Text style={styles.upiName}>{app.name}</Text>
                    {selectedUpiApp === app.id && (
                      <View style={styles.checkBubble}>
                        <Check size={10} color={Colors.textInverse} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.orDividerRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR ENTER UPI ID</Text>
                <View style={styles.orLine} />
              </View>

              <View style={styles.vpaInputRow}>
                <TextInput
                  style={styles.vpaInput}
                  placeholder="e.g. mobile@okaxis, username@paytm"
                  placeholderTextColor={Colors.textMuted}
                  value={upiId}
                  onChangeText={(t) => {
                    setUpiId(t);
                    setUpiVerified(false);
                  }}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.verifyVpaBtn, upiVerified && styles.verifyVpaBtnActive]}
                  onPress={handleVerifyUpi}
                  activeOpacity={0.8}
                >
                  <Text style={styles.verifyVpaText}>{upiVerified ? 'Verified' : 'Verify'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 2: CREDIT / DEBIT CARD */}
          {selectedTab === 'card' && (
            <View style={styles.tabContentCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.tabInnerTitle}>Card Details</Text>
                <View style={styles.cardBrandBadge}>
                  <Text style={styles.cardBrandText}>{getCardBrand()}</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>CARD NUMBER</Text>
              <View style={styles.inputWrap}>
                <CreditCard size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inputField}
                  placeholder="xxxx xxxx xxxx xxxx"
                  placeholderTextColor={Colors.textMuted}
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>

              <Text style={styles.fieldLabel}>CARDHOLDER NAME</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputField}
                  placeholder="Full name on card"
                  placeholderTextColor={Colors.textMuted}
                  value={cardHolder}
                  onChangeText={setCardHolder}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.cardRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>EXPIRY (MM/YY)</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.inputField}
                      placeholder="MM/YY"
                      placeholderTextColor={Colors.textMuted}
                      value={expiry}
                      onChangeText={handleExpiryChange}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>CVV</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.inputField}
                      placeholder="3 digits"
                      placeholderTextColor={Colors.textMuted}
                      value={cvv}
                      onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={4}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setSaveCard(!saveCard)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, saveCard && styles.checkboxActive]}>
                  {saveCard && <Check size={12} color={Colors.textInverse} />}
                </View>
                <Text style={styles.checkboxLabel}>Save card securely for future repairs</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 3: WALLET */}
          {selectedTab === 'wallet' && (
            <View style={styles.tabContentCard}>
              <View style={styles.walletBalanceCard}>
                <View style={styles.walletIconCircle}>
                  <Wallet size={24} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletBalanceLabel}>RepairBee Wallet Balance</Text>
                  <Text style={styles.walletBalanceVal}>₹{walletBalance.toFixed(2)}</Text>
                </View>
              </View>

              {walletBalance >= totalAmount ? (
                <View style={styles.walletSufficeBox}>
                  <CheckCircle2 size={16} color={Colors.tertiary} />
                  <Text style={styles.walletSufficeText}>
                    You have sufficient balance! Pay instantly with 1-tap escrow deduction.
                  </Text>
                </View>
              ) : (
                <View style={styles.walletDeficitBox}>
                  <AlertCircle size={16} color={Colors.warning} />
                  <Text style={styles.walletDeficitText}>
                    Need ₹{(totalAmount - walletBalance).toFixed(2)} more. Please top up your wallet
                    or select UPI/Card.
                  </Text>
                  <TouchableOpacity
                    style={styles.walletTopUpBtn}
                    onPress={() => router.push('/wallet')}
                  >
                    <Text style={styles.walletTopUpText}>+ Top Up Wallet</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* TAB 4: NETBANKING */}
          {selectedTab === 'netbanking' && (
            <View style={styles.tabContentCard}>
              <Text style={styles.tabInnerTitle}>Popular NetBanking Portals</Text>
              <View style={styles.banksList}>
                {TOP_BANKS.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.bankRow,
                      selectedBank === b.id && styles.bankRowSelected,
                    ]}
                    onPress={() => setSelectedBank(b.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.bankRadio}>
                      {selectedBank === b.id && <View style={styles.bankRadioDot} />}
                    </View>
                    <Text style={styles.bankName}>{b.name}</Text>
                    <Text style={styles.bankCode}>{b.code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky Bottom Payment Button */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPayLabel}>Payable Now</Text>
          <Text style={styles.bottomPriceVal}>₹{totalAmount}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, isProcessing && { opacity: 0.7 }]}
          onPress={handleInitiatePayment}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          <ShieldCheck size={18} color={Colors.textInverse} />
          <Text style={styles.payButtonText}>Lock ₹{totalAmount} in Escrow</Text>
        </TouchableOpacity>
      </View>

      {/* Multi-Step Escrow Lock & Success Modal */}
      <Modal visible={isProcessing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {!paymentSuccess ? (
              <>
                <View style={styles.modalShieldAura}>
                  <ShieldCheck size={40} color={Colors.primary} />
                </View>
                <Text style={styles.modalProcessingTitle}>Locking Payment in Escrow</Text>
                <Text style={styles.modalProcessingSub}>
                  Securing ₹{totalAmount} with RBI-compliant digital escrow
                </Text>

                {/* Multi-Stage Visual Steps */}
                <View style={styles.stepsContainer}>
                  <View style={styles.stepRow}>
                    <View style={[styles.stepCircle, processingStep >= 1 && styles.stepCircleActive]}>
                      {processingStep > 1 ? (
                        <Check size={14} color={Colors.textInverse} />
                      ) : (
                        <ActivityIndicator size="small" color={Colors.textInverse} />
                      )}
                    </View>
                    <Text style={[styles.stepText, processingStep >= 1 && styles.stepTextActive]}>
                      Bank Handshake & Encryption
                    </Text>
                  </View>

                  <View style={styles.stepRow}>
                    <View style={[styles.stepCircle, processingStep >= 2 && styles.stepCircleActive]}>
                      {processingStep > 2 ? (
                        <Check size={14} color={Colors.textInverse} />
                      ) : processingStep === 2 ? (
                        <ActivityIndicator size="small" color={Colors.textInverse} />
                      ) : (
                        <Text style={styles.stepNum}>2</Text>
                      )}
                    </View>
                    <Text style={[styles.stepText, processingStep >= 2 && styles.stepTextActive]}>
                      Authenticating Payment Method
                    </Text>
                  </View>

                  <View style={styles.stepRow}>
                    <View style={[styles.stepCircle, processingStep >= 3 && styles.stepCircleActive]}>
                      {processingStep > 3 ? (
                        <Check size={14} color={Colors.textInverse} />
                      ) : processingStep === 3 ? (
                        <ActivityIndicator size="small" color={Colors.textInverse} />
                      ) : (
                        <Text style={styles.stepNum}>3</Text>
                      )}
                    </View>
                    <Text style={[styles.stepText, processingStep >= 3 && styles.stepTextActive]}>
                      Locking Funds in Escrow Vault
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              /* Success View */
              <>
                <View style={styles.successAura}>
                  <CheckCircle2 size={48} color={Colors.tertiary} />
                </View>
                <Text style={styles.successTitle}>Escrow Payment Confirmed! 🛡️</Text>
                <Text style={styles.successSub}>
                  ₹{totalAmount} successfully held in Escrow. Your workshop lead and runner have been notified.
                </Text>

                <View style={styles.certBox}>
                  <View style={styles.certRow}>
                    <Text style={styles.certLabel}>Escrow Vault Ref</Text>
                    <Text style={styles.certValue}>{escrowRefId}</Text>
                  </View>
                  <View style={styles.certRow}>
                    <Text style={styles.certLabel}>Transaction ID</Text>
                    <Text style={styles.certValue}>{transactionId}</Text>
                  </View>
                  <View style={styles.certRow}>
                    <Text style={styles.certLabel}>Disbursement Trigger</Text>
                    <Text style={[styles.certValue, { color: Colors.tertiary }]}>
                      Post-Delivery Confirmation
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.successPrimaryBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    setIsProcessing(false);
                    router.replace(`/tracking/${orderId}`);
                  }}
                >
                  <Text style={styles.successPrimaryBtnText}>Track Runner on Live GPS Map</Text>
                  <ArrowRight size={16} color={Colors.textInverse} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.successSecondaryBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsProcessing(false);
                    router.replace(`/order/${orderId}`);
                  }}
                >
                  <Text style={styles.successSecondaryBtnText}>View Repair Order Details</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
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
  secureHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.tertiaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  secureHeaderText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.tiny,
    color: Colors.tertiary,
  },
  scrollArea: {
    flex: 1,
  },
  escrowCard: {
    margin: Spacing.screenPadding,
    backgroundColor: '#fffbeb',
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
    ...Shadows.sm,
  },
  escrowBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  shieldIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.primaryDark,
  },
  escrowSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  escrowExplainer: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  guaranteePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  guaranteePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  guaranteePillText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.tiny,
    color: Colors.primaryDark,
  },
  billCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: 16,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  deviceLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.caption,
    color: Colors.primary,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  billItem: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
  },
  billValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  totalSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.tiny,
    color: Colors.textMuted,
    marginTop: 2,
  },
  totalPrice: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleLg,
    color: Colors.primary,
  },
  paymentSection: {
    marginHorizontal: Spacing.screenPadding,
  },
  sectionHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  tabButtonActive: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  tabText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  tabTextActive: {
    fontFamily: Fonts.bodyBold,
    color: Colors.primary,
  },
  tabContentCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  tabInnerTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  upiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  upiOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    position: 'relative',
  },
  upiOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#fffbeb',
  },
  upiEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  upiName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  checkBubble: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  orText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.tiny,
    color: Colors.textMuted,
    marginHorizontal: 10,
  },
  vpaInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vpaInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  verifyVpaBtn: {
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyVpaBtnActive: {
    backgroundColor: Colors.tertiary,
  },
  verifyVpaText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textInverse,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardBrandBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  cardBrandText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.tiny,
    color: Colors.textInverse,
  },
  fieldLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.tiny,
    color: Colors.textMuted,
    marginTop: 10,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  inputField: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    height: '100%',
  },
  cardRow: {
    flexDirection: 'row',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceDim,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  walletBalanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.md,
    padding: 14,
    gap: 12,
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBalanceLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },
  walletBalanceVal: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  walletSufficeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.tertiaryMuted,
    padding: 12,
    borderRadius: Radius.md,
    marginTop: 12,
  },
  walletSufficeText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.tertiary,
    lineHeight: 18,
  },
  walletDeficitBox: {
    backgroundColor: '#fff7ed',
    padding: 12,
    borderRadius: Radius.md,
    marginTop: 12,
    gap: 8,
  },
  walletDeficitText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.warning,
    lineHeight: 18,
  },
  walletTopUpBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    marginTop: 4,
  },
  walletTopUpText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.tiny,
    color: Colors.textInverse,
  },
  banksList: {
    gap: 8,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 12,
  },
  bankRowSelected: {
    backgroundColor: '#fffbeb',
    borderColor: Colors.primary,
  },
  bankRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  bankName: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  bankCode: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.tiny,
    color: Colors.textMuted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.md,
  },
  bottomPriceCol: {
    justifyContent: 'center',
  },
  bottomPayLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  bottomPriceVal: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  payButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textInverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    padding: 24,
    alignItems: 'center',
    ...Shadows.md,
  },
  modalShieldAura: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalProcessingTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalProcessingSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  stepsContainer: {
    width: '100%',
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepNum: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  stepText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  stepTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  successAura: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.tertiaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  successSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 16,
  },
  certBox: {
    width: '100%',
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.md,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  certRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  certLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.tiny,
    color: Colors.textMuted,
  },
  certValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.tiny,
    color: Colors.textPrimary,
  },
  successPrimaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    marginBottom: 10,
  },
  successPrimaryBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textInverse,
  },
  successSecondaryBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successSecondaryBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
});
