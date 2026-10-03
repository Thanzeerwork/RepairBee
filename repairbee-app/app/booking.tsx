/**
 * Booking Wizard — Multi-step repair request creation
 * Supports photo/video capture & uploads, real products & issue types,
 * and live interactive Location Pinning on Map with GPS reverse geocoding.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform, Image, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  ArrowLeft, X, Camera, ChevronRight, Check,
  Smartphone, Laptop, Tv, AirVent, Refrigerator, WashingMachine,
  Zap, Calendar, MapPin, Wrench, Cpu, Plus,
  Navigation, Crosshair, Compass, CheckCircle2, ChevronUp, ChevronDown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';
import { api } from '../src/api/client';

const FALLBACK_DEVICES = [
  { id: 'af068870-1fb2-4ae7-8b46-7065248e9f78', product_name: 'Phone', category: 'electronics' },
  { id: 'd52a1fb5-1075-4bab-b7c4-e7dc7ebe6656', product_name: 'Laptop', category: 'electronics' },
  { id: '381c7075-d51b-4470-8549-a925fc8702d2', product_name: 'Tablet', category: 'electronics' },
  { id: '49ba2e4d-4bcc-42f2-9a4c-662d1fe87284', product_name: 'Desktop', category: 'electronics' },
  { id: 'c7c8fa91-3bd2-4041-aca6-b2cbec945a15', product_name: 'TV', category: 'appliances' },
  { id: '65cac882-a97a-4686-9877-d952a0e4d20f', product_name: 'AC', category: 'appliances' },
  { id: '2ef76574-8fc2-40d4-8431-f14f4dfc73ed', product_name: 'Fridge', category: 'appliances' },
  { id: '3cee1510-18fe-4c02-b097-66450280ec0e', product_name: 'Washing Machine', category: 'appliances' },
];

const STEPS = ['Device', 'Issue', 'Details', 'Schedule', 'Address'];
type RepairType = 'scheduled' | 'sos';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

const PRESET_AREAS = [
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, city: 'Bangalore', pincode: '560038' },
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245, city: 'Bangalore', pincode: '560034' },
  { name: 'HSR Layout', lat: 12.9121, lng: 77.6446, city: 'Bangalore', pincode: '560102' },
  { name: 'MG Road', lat: 12.9756, lng: 77.6066, city: 'Bangalore', pincode: '560001' },
  { name: 'Whitefield', lat: 12.9698, lng: 77.7500, city: 'Bangalore', pincode: '560066' },
  { name: 'Marine Drive', lat: 9.9790, lng: 76.2755, city: 'Kochi', pincode: '682031' },
];

export default function BookingWizard() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; productId?: string; productName?: string; isSos?: string }>();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // Real Database Lists
  const [products, setProducts] = useState<any[]>(FALLBACK_DEVICES);
  const [issueTypes, setIssueTypes] = useState<any[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

  // Selected State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [deviceBrand, setDeviceBrand] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [description, setDescription] = useState('');
  const [repairType, setRepairType] = useState<RepairType>(params.isSos === 'true' ? 'sos' : 'scheduled');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  // Photos State (up to 5 photos)
  const [photos, setPhotos] = useState<string[]>([]);

  // Address selection & Location Pinning State
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [customAddress, setCustomAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [customCity, setCustomCity] = useState('Bangalore');
  const [customPincode, setCustomPincode] = useState('560038');
  const [locating, setLocating] = useState(false);
  const [pinCoords, setPinCoords] = useState<LocationCoords | null>({ latitude: 12.9716, longitude: 77.5946 });
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapAddressPreview, setMapAddressPreview] = useState('Central Bangalore (12.9716, 77.5946)');

  // Load Real Products & Addresses from DB
  useEffect(() => {
    async function initData() {
      try {
        const [prodRes, addrRes] = await Promise.allSettled([
          api.getProducts(),
          api.getAddresses(),
        ]);

        if (prodRes.status === 'fulfilled') {
          const raw = prodRes.value.data?.data || {};
          const flattened = Array.isArray(raw)
            ? raw
            : [...(raw.electronics || []), ...(raw.appliances || [])];
          if (flattened.length > 0) {
            setProducts(flattened);
            // Auto-select if productId param passed
            if (params.productId) {
              const matched = flattened.find((p: any) => p.id === params.productId);
              if (matched) {
                handleSelectProduct(matched);
                setStep(1);
              }
            } else if (params.category) {
              const matched = flattened.find((p: any) =>
                p.category?.toLowerCase() === params.category?.toLowerCase() ||
                p.product_name?.toLowerCase().includes(params.category?.toLowerCase() || '')
              );
              if (matched) {
                handleSelectProduct(matched);
                setStep(1);
              }
            }
          }
        }

        if (addrRes.status === 'fulfilled') {
          const addrs = addrRes.value.data?.data || [];
          setSavedAddresses(addrs);
          if (addrs.length > 0) {
            const def = addrs.find((a: any) => a.isDefault || a.is_default) || addrs[0];
            setSelectedAddressId(def.id);
            if (def.lat && def.lng) {
              setPinCoords({ latitude: Number(def.lat), longitude: Number(def.lng) });
            }
          }
        }
      } catch (e) {}
    }
    initData();
  }, []);

  // When product is selected, load its real issue types from DB
  const handleSelectProduct = async (prod: any) => {
    setSelectedProduct(prod);
    setSelectedIssueIds([]);
    setLoadingIssues(true);
    try {
      const res = await api.getIssueTypes(prod.id);
      setIssueTypes(res.data?.data || []);
    } catch {
      setIssueTypes([]);
    } finally {
      setLoadingIssues(false);
    }
  };

  const toggleIssue = (issueId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIssueIds((prev) =>
      prev.includes(issueId) ? prev.filter((i) => i !== issueId) : [...prev, issueId]
    );
  };

  // --- Photo & Media Picker Handlers ---
  const handleAddPhoto = () => {
    if (photos.length >= 5) {
      Alert.alert('Upload Limit', 'You can upload up to 5 photos of your device.');
      return;
    }

    Alert.alert(
      'Add Device Photos',
      'Attach clear photos showing the issue or damage:',
      [
        {
          text: '📷 Take Photo',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(
                  'Camera Permission Required',
                  'Camera access is required to take photos of your damaged device.'
                );
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                quality: 0.8,
                allowsEditing: false,
              });
              if (!result.canceled && result.assets && result.assets[0]?.uri) {
                setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 5));
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (err: any) {
              Alert.alert('Camera Error', err.message || 'Unable to open camera.');
            }
          },
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(
                  'Gallery Permission Required',
                  'Photo library access is required to select photos.'
                );
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsMultipleSelection: true,
                selectionLimit: 5 - photos.length,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const newUris = result.assets.map((a) => a.uri);
                setPhotos((prev) => [...prev, ...newUris].slice(0, 5));
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (err: any) {
              Alert.alert('Gallery Error', err.message || 'Unable to open photo library.');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // --- Location Pinning & GPS Handlers ---
  const handleDetectGPS = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permission so RepairBee can detect your doorstep for runner pickup.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      setPinCoords({ latitude, longitude });

      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocoded && geocoded.length > 0) {
          const place = geocoded[0];
          const parts = [
            place.name,
            place.streetNumber,
            place.street,
            place.district,
            place.subregion,
          ].filter(Boolean);
          const formatted = parts.join(', ');

          setCustomAddress(formatted || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          if (place.name && place.street && place.name !== place.street) {
            setLandmark(`Near ${place.name}`);
          }
          if (place.city || place.subregion) {
            setCustomCity(place.city || place.subregion || 'Bangalore');
          }
          if (place.postalCode) {
            setCustomPincode(place.postalCode);
          }
          setMapAddressPreview(formatted || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch (geoErr) {
        setCustomAddress(`Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        setMapAddressPreview(`Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      }

      setSelectedAddressId('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('📍 Location Pinned', 'Your exact doorstep GPS location has been pinned.');
    } catch (err: any) {
      Alert.alert('GPS Location Error', err.message || 'Could not acquire GPS position.');
    } finally {
      setLocating(false);
    }
  };

  // Adjust pin coordinates by micro-steps (~30 meters)
  const nudgePin = async (dLat: number, dLng: number) => {
    const current = pinCoords || { latitude: 12.9716, longitude: 77.5946 };
    const nextCoords = {
      latitude: Number((current.latitude + dLat).toFixed(6)),
      longitude: Number((current.longitude + dLng).toFixed(6)),
    };
    setPinCoords(nextCoords);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const geocoded = await Location.reverseGeocodeAsync(nextCoords);
      if (geocoded && geocoded.length > 0) {
        const place = geocoded[0];
        const parts = [place.name, place.streetNumber, place.street, place.subregion].filter(Boolean);
        setMapAddressPreview(parts.join(', ') || `${nextCoords.latitude}, ${nextCoords.longitude}`);
      }
    } catch {}
  };

  const applyPresetArea = async (preset: typeof PRESET_AREAS[0]) => {
    setPinCoords({ latitude: preset.lat, longitude: preset.lng });
    setCustomCity(preset.city);
    setCustomPincode(preset.pincode);
    setLandmark(`Near ${preset.name} Central`);
    setCustomAddress(`${preset.name}, Main Road`);
    setMapAddressPreview(`${preset.name}, ${preset.city}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const confirmMapPin = () => {
    setMapModalVisible(false);
    setSelectedAddressId('');
    if (mapAddressPreview && !customAddress) {
      setCustomAddress(mapAddressPreview);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!selectedProduct;
      case 1: return selectedIssueIds.length > 0;
      case 2: return !!deviceBrand.trim() && !!deviceModel.trim();
      case 3: return repairType === 'sos' || (!!selectedDate && !!selectedSlot);
      case 4: return !!selectedAddressId || !!customAddress.trim();
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let addressId = selectedAddressId;

      // If user provided a new address or pinned on map, save it to the DB first
      if (!addressId && customAddress.trim()) {
        try {
          const addrLine = landmark.trim()
            ? `${customAddress.trim()} (Landmark: ${landmark.trim()})`
            : customAddress.trim();

          const addrRes = await api.addAddress({
            label: 'home',
            address_line: addrLine,
            city: customCity.trim() || 'Bangalore',
            pincode: customPincode.trim() || '560038',
            lat: pinCoords ? pinCoords.latitude : 12.9716,
            lng: pinCoords ? pinCoords.longitude : 77.5946,
            is_default: true,
          });
          addressId = addrRes.data?.data?.id;
        } catch (e) {}
      }

      const scheduledAtIso = repairType === 'scheduled' && selectedDate
        ? new Date(`${selectedDate}T10:00:00.000Z`).toISOString()
        : undefined;

      const fullDescription = `${deviceBrand.trim()} ${deviceModel.trim()} — ${description.trim()}`.trim();

      let res;
      if (photos.length > 0) {
        const formData = new FormData();
        formData.append('product_id', selectedProduct.id);
        formData.append('issue_ids', JSON.stringify(selectedIssueIds));
        formData.append('description', fullDescription);
        formData.append('order_type', repairType);
        if (scheduledAtIso) {
          formData.append('scheduled_at', scheduledAtIso);
        }
        if (addressId) {
          formData.append('pickup_address_id', addressId);
        }
        photos.forEach((uri, idx) => {
          const filename = uri.split('/').pop() || `device_${idx}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          formData.append('media', {
            uri,
            name: filename,
            type,
          } as any);
        });
        res = await api.createRepairOrder(formData);
      } else {
        const payload: Record<string, any> = {
          product_id: selectedProduct.id,
          issue_ids: selectedIssueIds,
          description: fullDescription,
          order_type: repairType,
        };
        if (scheduledAtIso) payload.scheduled_at = scheduledAtIso;
        if (addressId) payload.pickup_address_id = addressId;
        res = await api.createRepairOrder(payload);
      }

      const newOrder = res.data?.data;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '🐝 Repair Request Created!',
        `Your order #${newOrder?.order_number || ''} has been registered. Nearby certified workshops have been notified to send price quotes.`,
        [
          {
            text: 'Track Order',
            onPress: () => router.replace(newOrder?.id ? `/order/${newOrder.id}` : '/(tabs)/orders'),
          },
        ]
      );
    } catch (err: any) {
      const msg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || err.message || 'Failed to submit repair request.';
      Alert.alert('Booking Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const getProductIcon = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('phone')) return { icon: Smartphone, color: '#3b82f6' };
    if (n.includes('laptop')) return { icon: Laptop, color: '#8b5cf6' };
    if (n.includes('tablet')) return { icon: Smartphone, color: '#0ea5e9' };
    if (n.includes('desktop')) return { icon: Cpu, color: '#6366f1' };
    if (n.includes('tv') || n.includes('television')) return { icon: Tv, color: '#ef4444' };
    if (n.includes('ac')) return { icon: AirVent, color: '#06b6d4' };
    if (n.includes('fridge') || n.includes('refrigerator')) return { icon: Refrigerator, color: '#059669' };
    if (n.includes('washing') || n.includes('washer')) return { icon: WashingMachine, color: '#f97316' };
    return { icon: Wrench, color: '#d97706' };
  };

  const today = new Date();
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return {
      value: d.toISOString().split('T')[0],
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  });

  const timeSlots = ['9:00 - 11:00 AM', '11:00 AM - 1:00 PM', '1:00 - 3:00 PM', '3:00 - 5:00 PM', '5:00 - 7:00 PM'];

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'New Repair Request' }} />
      <View style={styles.container}>
        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
          </View>
          <View style={styles.stepLabels}>
            {STEPS.map((s, i) => (
              <Text key={s} style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>
                {i < step ? '✓' : `${i + 1}`} {s}
              </Text>
            ))}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Step 0: Real Database Products */}
          {step === 0 && (
            <View>
              <Text style={styles.stepTitle}>What device needs repair?</Text>
              <Text style={styles.stepSub}>Select from our verified device categories</Text>
              <View style={styles.deviceGrid}>
                {products.map((prod) => {
                  const meta = getProductIcon(prod.product_name);
                  const Icon = meta.icon;
                  const isSelected = selectedProduct?.id === prod.id;
                  return (
                    <TouchableOpacity
                      key={prod.id}
                      style={[styles.deviceCard, isSelected && styles.deviceCardSelected]}
                      onPress={() => handleSelectProduct(prod)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.deviceIconWrap, { backgroundColor: meta.color + '15' }, isSelected && { backgroundColor: meta.color + '25' }]}>
                        <Icon size={28} color={isSelected ? meta.color : Colors.textMuted} />
                      </View>
                      <Text style={[styles.deviceLabel, isSelected && { color: Colors.textPrimary, fontFamily: Fonts.headingBold }]}>
                        {prod.product_name}
                      </Text>
                      {isSelected && (
                        <View style={styles.deviceCheck}>
                          <Check size={14} color={Colors.textInverse} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 1: Real Database Issues for Selected Product */}
          {step === 1 && (
            <View>
              <View style={styles.selectedDevicePill}>
                <Text style={styles.pillText}>{selectedProduct?.product_name || 'Selected Device'}</Text>
                <TouchableOpacity onPress={() => setStep(0)}>
                  <X size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.stepTitle}>What's the issue?</Text>
              <Text style={styles.stepSub}>Select one or more symptoms observed</Text>

              {loadingIssues ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
              ) : issueTypes.length > 0 ? (
                issueTypes.map((issue) => {
                  const isSelected = selectedIssueIds.includes(issue.id);
                  return (
                    <TouchableOpacity
                      key={issue.id}
                      style={[styles.issueRow, isSelected && styles.issueRowSelected]}
                      onPress={() => toggleIssue(issue.id)}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Check size={14} color={Colors.textInverse} />}
                      </View>
                      <Text style={[styles.issueText, isSelected && { color: Colors.textPrimary, fontFamily: Fonts.bodySemiBold }]}>
                        {issue.issue_label}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.noIssuesBox}>
                  <Text style={styles.noIssuesText}>General Diagnostic / Hardware Failure</Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>Detailed Symptom Notes</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe any drops, water exposure, or specific behaviors..."
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Step 2: Device Details (With Working Photo & Video Upload) */}
          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>Device Details</Text>
              <Text style={styles.stepSub}>Helps shops verify parts availability before quoting</Text>
              
              <Text style={styles.fieldLabel}>Brand *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Nothing, Apple, Samsung, Dell"
                placeholderTextColor={Colors.textMuted}
                value={deviceBrand}
                onChangeText={setDeviceBrand}
              />

              <Text style={styles.fieldLabel}>Model *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 3a, iPhone 15 Pro, Galaxy S24"
                placeholderTextColor={Colors.textMuted}
                value={deviceModel}
                onChangeText={setDeviceModel}
              />

              {/* Working Photo / Video Upload Box */}
              <TouchableOpacity
                style={styles.photoUploadBox}
                activeOpacity={0.7}
                onPress={handleAddPhoto}
              >
                <View style={styles.photoIconCircle}>
                  <Camera size={26} color={Colors.primary} />
                </View>
                <Text style={styles.photoUploadTitle}>Add Photos / Videos</Text>
                <Text style={styles.photoUploadSub}>{photos.length}/5 files</Text>
              </TouchableOpacity>

              {/* Selected Photo Thumbnails */}
              {photos.length > 0 && (
                <View style={styles.thumbnailsContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {photos.map((uri, idx) => (
                      <View key={idx} style={styles.thumbnailWrap}>
                        <Image source={{ uri }} style={styles.thumbnailImg} />
                        <TouchableOpacity
                          style={styles.deletePhotoBtn}
                          onPress={() => removePhoto(idx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {photos.length < 5 && (
                      <TouchableOpacity style={styles.addMorePhotoBtn} onPress={handleAddPhoto}>
                        <Plus size={22} color={Colors.primary} />
                        <Text style={styles.addMoreText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Step 3: Schedule vs SOS */}
          {step === 3 && (
            <View>
              <Text style={styles.stepTitle}>Choose Service Mode</Text>
              <View style={styles.repairTypeRow}>
                <TouchableOpacity
                  style={[styles.repairTypeCard, repairType === 'scheduled' && styles.repairTypeActive]}
                  onPress={() => setRepairType('scheduled')}
                >
                  <Calendar size={24} color={repairType === 'scheduled' ? Colors.primary : Colors.textMuted} />
                  <Text style={[styles.repairTypeLabel, repairType === 'scheduled' && { color: Colors.primary }]}>Scheduled</Text>
                  <Text style={styles.repairTypeSub}>Pick convenient date & slot</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.repairTypeCard, repairType === 'sos' && styles.sosTypeActive]}
                  onPress={() => setRepairType('sos')}
                >
                  <Zap size={24} color={repairType === 'sos' ? Colors.warning : Colors.textMuted} fill={repairType === 'sos' ? Colors.warning : 'none'} />
                  <Text style={[styles.repairTypeLabel, repairType === 'sos' && { color: Colors.warning }]}>SOS Urgent</Text>
                  <Text style={styles.repairTypeSub}>Pickup in ~60 mins</Text>
                </TouchableOpacity>
              </View>

              {repairType === 'scheduled' && (
                <>
                  <Text style={styles.fieldLabel}>Select Date</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                    {dateOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.dateChip, selectedDate === opt.value && styles.dateChipActive]}
                        onPress={() => setSelectedDate(opt.value)}
                      >
                        <Text style={[styles.dateText, selectedDate === opt.value && styles.dateTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.fieldLabel}>Select Time Slot</Text>
                  <View style={styles.slotGrid}>
                    {timeSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.slotChip, selectedSlot === slot && styles.slotChipActive]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Text style={[styles.slotText, selectedSlot === slot && styles.slotTextActive]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Step 4: Pickup Address with Interactive Location Pinning on Map */}
          {step === 4 && (
            <View>
              <Text style={styles.stepTitle}>Pickup Address</Text>
              <Text style={styles.stepSub}>Where should our verified runner collect your device?</Text>

              {/* Location Pinning Card with Radar Canvas */}
              <View style={styles.mapCard}>
                <View style={styles.mapTextureBox}>
                  <View style={styles.mapGridLineH1} />
                  <View style={styles.mapGridLineH2} />
                  <View style={styles.mapGridLineV1} />
                  <View style={styles.mapGridLineV2} />
                  <View style={styles.mapRoad1} />
                  <View style={styles.mapRoad2} />
                  <View style={styles.mapRadarPulse} />
                  
                  {/* Glowing Location Pin */}
                  <View style={styles.mapCenterPinBox}>
                    <MapPin size={26} color={Colors.error} />
                  </View>

                  <View style={styles.mapTextureOverlay}>
                    <Text style={styles.mapTextureCoords}>
                      {pinCoords
                        ? `${pinCoords.latitude.toFixed(4)}° N, ${pinCoords.longitude.toFixed(4)}° E`
                        : '12.9716° N, 77.5946° E'}
                    </Text>
                  </View>
                </View>

                {/* Map Status & Action Row */}
                <View style={styles.mapActionRow}>
                  <TouchableOpacity
                    style={styles.gpsDetectBtn}
                    onPress={handleDetectGPS}
                    disabled={locating}
                    activeOpacity={0.8}
                  >
                    {locating ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <>
                        <Navigation size={15} color={Colors.textInverse} />
                        <Text style={styles.gpsDetectText}>Use GPS</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pinOnMapBtn}
                    onPress={() => setMapModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Crosshair size={15} color={Colors.primary} />
                    <Text style={styles.pinOnMapText}>Pin on Map</Text>
                  </TouchableOpacity>
                </View>

                {/* Pin info banner */}
                <View style={styles.pinnedAddressBanner}>
                  <CheckCircle2 size={16} color={Colors.success} />
                  <Text style={styles.pinnedAddressText} numberOfLines={1}>
                    {mapAddressPreview || 'Doorstep Location Pinned'}
                  </Text>
                </View>
              </View>

              {/* Saved Addresses List (if available) */}
              {savedAddresses.length > 0 && (
                <View style={styles.addressList}>
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <TouchableOpacity
                        key={addr.id}
                        style={[styles.addressItem, isSelected && styles.addressItemSelected]}
                        onPress={() => {
                          setSelectedAddressId(addr.id);
                          setCustomAddress('');
                        }}
                      >
                        <View style={[styles.radio, isSelected && styles.radioActive]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addressLabelText}>{addr.label || 'Saved Address'}</Text>
                          <Text style={styles.addressStreetText}>{addr.street || addr.address_line}</Text>
                          <Text style={styles.addressCityText}>{addr.city} - {addr.pincode}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Address Form Inputs matching screenshot */}
              <Text style={styles.fieldLabel}>Full Address *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="House/flat number, building, street, area..."
                placeholderTextColor={Colors.textMuted}
                value={customAddress}
                onChangeText={(t) => {
                  setCustomAddress(t);
                  if (t.trim()) setSelectedAddressId('');
                }}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.fieldLabel}>Landmark (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Near..."
                placeholderTextColor={Colors.textMuted}
                value={landmark}
                onChangeText={setLandmark}
              />

              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>City</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    placeholderTextColor={Colors.textMuted}
                    value={customCity}
                    onChangeText={setCustomCity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Pincode</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Pincode"
                    placeholderTextColor={Colors.textMuted}
                    value={customPincode}
                    onChangeText={setCustomPincode}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Interactive Map Pinning Modal */}
        <Modal
          visible={mapModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setMapModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.mapModalSheet}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Pin Doorstep on Map</Text>
                  <Text style={styles.modalSub}>Adjust pin or select neighborhood</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setMapModalVisible(false)}
                >
                  <X size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Interactive Visual Map Area */}
              <View style={styles.interactiveMapCanvas}>
                {/* Visual Streets & Roads */}
                <View style={styles.interactiveRoadH1} />
                <View style={styles.interactiveRoadH2} />
                <View style={styles.interactiveRoadV1} />
                <View style={styles.interactiveRoadV2} />
                <View style={styles.interactivePulseRing} />

                {/* Center Floating Pin */}
                <View style={styles.interactiveFloatingPin}>
                  <MapPin size={36} color={Colors.error} />
                  <View style={styles.pinShadow} />
                </View>

                {/* Top Coordinates Readout */}
                <View style={styles.modalCoordsChip}>
                  <Compass size={14} color={Colors.primary} />
                  <Text style={styles.modalCoordsText}>
                    {pinCoords
                      ? `${pinCoords.latitude.toFixed(5)}, ${pinCoords.longitude.toFixed(5)}`
                      : '12.97160, 77.59460'}
                  </Text>
                </View>

                {/* Directional Nudge Pad for Meter Precision */}
                <View style={styles.nudgePad}>
                  <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudgePin(0.0003, 0)}>
                    <ChevronUp size={16} color="#ffffff" />
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 18 }}>
                    <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudgePin(0, -0.0003)}>
                      <ArrowLeft size={14} color="#ffffff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudgePin(0, 0.0003)}>
                      <ChevronRight size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudgePin(-0.0003, 0)}>
                    <ChevronDown size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Area Presets */}
              <Text style={styles.presetLabel}>Quick Area Select:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                {PRESET_AREAS.map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    style={styles.presetChip}
                    onPress={() => applyPresetArea(item)}
                  >
                    <Text style={styles.presetChipText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Address Preview Bar */}
              <View style={styles.modalAddressBar}>
                <MapPin size={16} color={Colors.primary} />
                <Text style={styles.modalAddressBarText} numberOfLines={2}>
                  {mapAddressPreview || 'Doorstep pin set'}
                </Text>
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={styles.confirmPinButton}
                activeOpacity={0.8}
                onPress={confirmMapPin}
              >
                <Check size={18} color={Colors.textInverse} />
                <Text style={styles.confirmPinButtonText}>Confirm Doorstep Pin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Footer Navigation Buttons matching Screenshots */}
        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity
              style={styles.backStepButton}
              onPress={() => setStep((s) => s - 1)}
              disabled={loading}
            >
              <Text style={styles.backStepText}>Previous</Text>
            </TouchableOpacity>
          )}

          {step < STEPS.length - 1 ? (
            <TouchableOpacity
              style={[styles.nextButton, !canProceed() && styles.buttonDisabled]}
              onPress={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, (!canProceed() || loading) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!canProceed() || loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request 🐝</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  progressSection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  stepLabelActive: {
    color: Colors.primary,
    fontFamily: Fonts.bodySemiBold,
  },
  content: {
    flex: 1,
    padding: Spacing.screenPadding,
  },
  stepTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleMd,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  stepSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  deviceCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    position: 'relative',
    ...Shadows.sm,
  },
  deviceCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  deviceIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  deviceLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  deviceCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDevicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  pillText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.primary,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  issueRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  issueText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    flex: 1,
  },
  noIssuesBox: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  noIssuesText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  fieldLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    minHeight: 80,
  },
  // Photos Section Styles
  photoUploadBox: {
    marginTop: Spacing.lg,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  photoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photoUploadTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  photoUploadSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  thumbnailsContainer: {
    marginTop: Spacing.md,
  },
  thumbnailWrap: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  thumbnailImg: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Shadows.sm,
  },
  addMorePhotoBtn: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  addMoreText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.tiny,
    color: Colors.primary,
    marginTop: 2,
  },
  repairTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  repairTypeCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  repairTypeActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  sosTypeActive: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warningBg,
  },
  repairTypeLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginTop: 6,
  },
  repairTypeSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  dateScroll: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  dateChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 8,
  },
  dateChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  dateTextActive: {
    color: Colors.textInverse,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  slotChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },
  slotTextActive: {
    color: Colors.textInverse,
  },
  // Location Pinning on Map Styles
  mapCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  mapTextureBox: {
    height: 110,
    borderRadius: Radius.lg,
    backgroundColor: '#0f172a',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapGridLineH1: {
    position: 'absolute',
    top: 35,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#1e293b',
  },
  mapGridLineH2: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#1e293b',
  },
  mapGridLineV1: {
    position: 'absolute',
    left: '33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#1e293b',
  },
  mapGridLineV2: {
    position: 'absolute',
    left: '66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#1e293b',
  },
  mapRoad1: {
    position: 'absolute',
    top: 50,
    left: -20,
    right: -20,
    height: 4,
    backgroundColor: '#334155',
    transform: [{ rotate: '-8deg' }],
  },
  mapRoad2: {
    position: 'absolute',
    left: '52%',
    top: -20,
    bottom: -20,
    width: 4,
    backgroundColor: '#334155',
    transform: [{ rotate: '15deg' }],
  },
  mapRadarPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.4)',
  },
  mapCenterPinBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTextureOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  mapTextureCoords: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#cbd5e1',
  },
  mapActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  gpsDetectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  gpsDetectText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textInverse,
  },
  pinOnMapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  pinOnMapText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.primary,
  },
  pinnedAddressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  pinnedAddressText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  addressList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  addressItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  addressLabelText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  addressStreetText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addressCityText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Interactive Map Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  mapModalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
  },
  modalSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  interactiveMapCanvas: {
    height: 220,
    borderRadius: Radius.xl,
    backgroundColor: '#0f172a',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  interactiveRoadH1: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#334155',
  },
  interactiveRoadH2: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#334155',
  },
  interactiveRoadV1: {
    position: 'absolute',
    left: '30%',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#334155',
  },
  interactiveRoadV2: {
    position: 'absolute',
    left: '70%',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#334155',
  },
  interactivePulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.5)',
  },
  interactiveFloatingPin: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  pinShadow: {
    width: 14,
    height: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
  modalCoordsChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalCoordsText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: '#e2e8f0',
  },
  nudgePad: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: Radius.lg,
    padding: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  nudgeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  presetLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  presetScroll: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  presetChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginRight: 8,
  },
  presetChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textPrimary,
  },
  modalAddressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceDim,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  modalAddressBarText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    flex: 1,
  },
  confirmPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    ...Shadows.md,
  },
  confirmPinButtonText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.textInverse,
  },
  // Footer Styles
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  backStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  backStepText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    ...Shadows.sm,
  },
  nextButtonText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textInverse,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    ...Shadows.md,
  },
  submitButtonText: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textInverse,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
