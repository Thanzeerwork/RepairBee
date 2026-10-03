/**
 * Saved Addresses Screen — Manage customer pickup/delivery addresses
 * Matches PRD Section 2.1 & 4.2
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import {
  MapPin,
  Plus,
  Trash2,
  Home,
  Briefcase,
  Navigation,
  Check,
  ChevronRight,
  Sparkles,
  Crosshair,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';
import { api } from '../src/api/client';

interface Address {
  id: string;
  label: string;
  street?: string;
  address_line?: string;
  landmark?: string;
  city: string;
  pincode: string;
  isDefault?: boolean;
  is_default?: boolean;
  lat?: number | string;
  lng?: number | string;
}

export default function AddressesScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [label, setLabel] = useState('Home');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Bangalore');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await api.getAddresses();
      setAddresses(res.data?.data || []);
    } catch (e) {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [])
  );

  const handleDetectGPS = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please allow location permission so we can detect your doorstep.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocoded && geocoded.length > 0) {
        const place = geocoded[0];
        const parts = [place.name, place.streetNumber, place.street, place.district].filter(Boolean);
        const streetStr = parts.join(', ');
        if (streetStr) setStreet(streetStr);
        if (place.name && place.street && place.name !== place.street) {
          setLandmark(`Near ${place.name}`);
        }
        if (place.city || place.subregion) {
          setCity(place.city || place.subregion || 'Bangalore');
        }
        if (place.postalCode) {
          setPincode(place.postalCode);
        }
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('📍 Location Detected', 'Doorstep location captured successfully.');
    } catch (err: any) {
      Alert.alert('Location Error', err.message || 'Could not fetch current GPS location.');
    } finally {
      setLocating(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!street.trim() || !city.trim() || !pincode.trim()) {
      Alert.alert('Required Fields', 'Please fill in street address, city, and pincode.');
      return;
    }

    try {
      setSaving(true);
      const fullAddressLine = landmark.trim()
        ? `${street.trim()} (Landmark: ${landmark.trim()})`
        : street.trim();

      const payload = {
        label: label.toLowerCase(),
        address_line: fullAddressLine,
        city: city.trim(),
        pincode: pincode.trim(),
        is_default: isDefault,
      };

      await api.addAddress(payload);
      await fetchAddresses();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);

      // Reset form
      setStreet('');
      setLandmark('');
      setPincode('');
      setIsDefault(false);
    } catch (err: any) {
      const msg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || err.message || 'Failed to save address.';
      Alert.alert('Save Address Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAddress(id);
          } catch (e) {}
          setAddresses((prev) => prev.filter((a) => a.id !== id));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const setDefault = async (id: string) => {
    try {
      await api.setDefaultAddress(id);
    } catch (e) {}
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
        is_default: a.id === id,
      }))
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Saved Addresses',
          headerTintColor: Colors.primary,
          headerStyle: { backgroundColor: Colors.surface },
          headerTitleStyle: { fontFamily: Fonts.headingSemiBold, fontSize: 17 },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Action */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Pickup & Delivery Locations</Text>
              <Text style={styles.headerSubtitle}>Manage your verified locations for swift doorstep runner pickups</Text>
            </View>
          </View>

          {/* Add Address CTA Button */}
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => setModalVisible(true)}
          >
            <View style={styles.addIconCircle}>
              <Plus size={20} color={Colors.textInverse} />
            </View>
            <Text style={styles.addButtonText}>Add New Address</Text>
          </TouchableOpacity>

          {/* Address List */}
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : addresses.length === 0 ? (
            <View style={styles.emptyCard}>
              <MapPin size={48} color={Colors.primary} />
              <Text style={styles.emptyTitle}>No Addresses Saved</Text>
              <Text style={styles.emptyDesc}>Add your home or office address for 1-tap repair requests.</Text>
            </View>
          ) : (
            addresses.map((item) => {
              const isDef = item.isDefault || item.is_default;
              const streetLine = item.address_line || item.street || '';
              const labelStr = (item.label || 'Home').toLowerCase();
              const isHome = labelStr.includes('home');
              const isWork = labelStr.includes('work') || labelStr.includes('office');

              return (
                <View key={item.id} style={[styles.addressCard, isDef && styles.addressCardDefault]}>
                  <View style={styles.addressTop}>
                    <View style={styles.labelBadge}>
                      {isHome ? (
                        <Home size={14} color={Colors.primary} />
                      ) : isWork ? (
                        <Briefcase size={14} color={Colors.primary} />
                      ) : (
                        <MapPin size={14} color={Colors.primary} />
                      )}
                      <Text style={styles.labelText}>{item.label?.toUpperCase() || 'ADDRESS'}</Text>
                      {isDef && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.streetText}>{streetLine}</Text>
                  {item.landmark ? (
                    <Text style={styles.landmarkText}>Landmark: {item.landmark}</Text>
                  ) : null}
                  <Text style={styles.cityText}>{item.city} — {item.pincode}</Text>

                  {!isDef && (
                    <TouchableOpacity
                      style={styles.setDefaultRow}
                      onPress={() => setDefault(item.id)}
                    >
                      <Text style={styles.setDefaultText}>Set as default pickup location</Text>
                      <ChevronRight size={14} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Modal: Add Address */}
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Address</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Label Selector */}
                <Text style={styles.inputLabel}>Address Type</Text>
                <View style={styles.labelButtons}>
                  {['Home', 'Office', 'Other'].map((l) => (
                    <TouchableOpacity
                      key={l}
                      onPress={() => setLabel(l)}
                      style={[
                        styles.labelChoice,
                        label === l && styles.labelChoiceActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.labelChoiceText,
                          label === l && styles.labelChoiceTextActive,
                        ]}
                      >
                        {l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* GPS Detect Banner */}
                <TouchableOpacity
                  style={styles.gpsBannerBtn}
                  onPress={handleDetectGPS}
                  disabled={locating}
                  activeOpacity={0.8}
                >
                  <Navigation size={15} color={Colors.primary} />
                  <Text style={styles.gpsBannerText}>
                    {locating ? 'Detecting current location...' : 'Use Current GPS Location / Doorstep'}
                  </Text>
                  {locating && <ActivityIndicator size="small" color={Colors.primary} />}
                </TouchableOpacity>

                {/* Street */}
                <Text style={styles.inputLabel}>House / Flat / Street *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 402, Golden Nest, 5th Main"
                  placeholderTextColor={Colors.textMuted}
                  value={street}
                  onChangeText={setStreet}
                />

                {/* Landmark */}
                <Text style={styles.inputLabel}>Landmark (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Near Metro Station / Supermarket"
                  placeholderTextColor={Colors.textMuted}
                  value={landmark}
                  onChangeText={setLandmark}
                />

                {/* City & Pincode */}
                <View style={styles.inputRow}>
                  <View style={{ flex: 1, marginRight: Spacing.sm }}>
                    <Text style={styles.inputLabel}>City *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={city}
                      onChangeText={setCity}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Pincode *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 560038"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      value={pincode}
                      onChangeText={setPincode}
                    />
                  </View>
                </View>

                {/* Default Switch */}
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Set as default address</Text>
                  <Switch
                    value={isDefault}
                    onValueChange={setIsDefault}
                    trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
                  />
                </View>

                {/* Submit CTA */}
                <TouchableOpacity
                  style={styles.saveButton}
                  activeOpacity={0.8}
                  onPress={handleSaveAddress}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Address</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
  headerRow: {
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  addIconCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.primary,
  },
  addressCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  addressCardDefault: {
    borderColor: Colors.primary,
  },
  addressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  defaultBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    marginLeft: 6,
  },
  defaultBadgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 9,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  deleteButton: {
    padding: 6,
  },
  streetText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  landmarkText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cityText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  setDefaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  setDefaultText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.primary,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
  },
  modalCancel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
  },
  inputLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  labelButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  labelChoice: {
    flex: 1,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  labelChoiceActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  labelChoiceText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  labelChoiceTextActive: {
    color: Colors.primary,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  switchLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  saveButtonText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textInverse,
  },
  gpsBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  gpsBannerText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.primary,
  },
});
