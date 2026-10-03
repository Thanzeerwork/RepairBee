/**
 * Workshop Search & Filter Directory Screen
 * Browse verified partner workshops, filter by specialty, rating, proximity, and open hours.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Search,
  X,
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  Phone,
  ArrowRight,
  Sparkles,
  Wrench,
  CheckCircle2,
  Navigation,
  SlidersHorizontal,
  ChevronRight,
  Smartphone,
  Laptop,
  Tv,
  AirVent,
  RotateCcw,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';
import { api } from '../src/api/client';

interface Workshop {
  id: string;
  shop_name: string;
  description: string;
  category: 'electronics' | 'appliances' | 'both';
  address: string;
  city: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  avg_rating: number | string;
  total_ratings: number;
  total_jobs: number;
  opening_time?: string;
  closing_time?: string;
  owner_name?: string;
  distance_km?: number | string;
}

// User reference coordinates in Bangalore center (MG Road / Indiranagar intersection)
const BANGALORE_USER_COORDS = { lat: 12.9716, lng: 77.5946 };

const SPECIALTY_FILTERS = [
  { id: 'all', label: 'All Workshops', icon: Wrench },
  { id: 'smartphones', label: 'Smartphones & Tablets', icon: Smartphone },
  { id: 'laptops', label: 'Laptops & PCs', icon: Laptop },
  { id: 'appliances', label: 'AC & Appliances', icon: AirVent },
  { id: 'tv', label: 'TV & OLED Panels', icon: Tv },
];

export default function WorkshopDirectoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();

  const [shops, setShops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(params.q || '');
  const [selectedSpecialty, setSelectedSpecialty] = useState(params.category || 'all');
  const [filterTopRated, setFilterTopRated] = useState(false);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [sortByNearest, setSortByNearest] = useState(false);

  // Fetch workshops from backend API
  const fetchShops = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams: Record<string, any> = {
        limit: 50,
      };

      if (sortByNearest) {
        queryParams.lat = BANGALORE_USER_COORDS.lat;
        queryParams.lng = BANGALORE_USER_COORDS.lng;
      }
      if (filterTopRated) {
        queryParams.min_rating = 4.8;
      }
      if (searchQuery.trim()) {
        queryParams.search = searchQuery.trim();
      }

      const res = await api.getShops(queryParams);
      const data = res.data?.data || [];
      setShops(data);
    } catch (err: any) {
      console.warn('Failed to fetch shops:', err);
    } finally {
      setLoading(false);
    }
  }, [sortByNearest, filterTopRated, searchQuery]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShops();
    setRefreshing(false);
  };

  // Helper to calculate or extract distance
  const getDistanceText = (shop: Workshop) => {
    if (shop.distance_km !== undefined && shop.distance_km !== null) {
      const d = Number(shop.distance_km);
      return `${d < 1 ? (d * 1000).toFixed(0) + ' m' : d.toFixed(1) + ' km'} away`;
    }
    // Calculate Haversine distance from default user location if lat/lng are present
    if (shop.lat && shop.lng) {
      const lat1 = BANGALORE_USER_COORDS.lat;
      const lon1 = BANGALORE_USER_COORDS.lng;
      const lat2 = Number(shop.lat);
      const lon2 = Number(shop.lng);
      const R = 6371; // km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      return `${dist.toFixed(1)} km away`;
    }
    return 'Bangalore Central';
  };

  // Check if shop is currently open
  const isShopOpen = (shop: Workshop) => {
    if (!shop.opening_time || !shop.closing_time) return true;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = shop.opening_time.split(':').map(Number);
    const [closeH, closeM] = shop.closing_time.split(':').map(Number);
    const openMins = openH * 60 + (openM || 0);
    const closeMins = closeH * 60 + (closeM || 0);
    return currentMins >= openMins && currentMins <= closeMins;
  };

  // Format specialties badges
  const getSpecialtyBadges = (shop: Workshop) => {
    const text = (shop.shop_name + ' ' + (shop.description || '')).toLowerCase();
    const badges: string[] = [];

    if (text.includes('apple') || text.includes('retina') || text.includes('logic board')) {
      badges.push('Apple OEM Certified');
    }
    if (text.includes('motherboard') || text.includes('bga') || text.includes('laptop')) {
      badges.push('BGA Chip Level');
    }
    if (text.includes('oled') || text.includes('panel') || text.includes('tv')) {
      badges.push('OLED Bonding Clinic');
    }
    if (text.includes('ac') || text.includes('inverter') || text.includes('compressor')) {
      badges.push('Inverter Jet Clean');
    }
    if (text.includes('android') || text.includes('oneplus') || text.includes('samsung') || text.includes('pixel')) {
      badges.push('Same-Day Screen Fix');
    }
    if (badges.length === 0) {
      badges.push('Doorstep Diagnostics', 'Certified Bee Partner');
    } else {
      badges.push('90-Day Guarantee');
    }
    return badges.slice(0, 3);
  };

  // Filter and sort the shops
  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      // Specialty category filtering
      if (selectedSpecialty !== 'all') {
        const text = (shop.shop_name + ' ' + (shop.description || '') + ' ' + shop.category).toLowerCase();
        if (selectedSpecialty === 'smartphones') {
          if (!text.includes('apple') && !text.includes('android') && !text.includes('phone') && !text.includes('screen') && !text.includes('pixel')) {
            return false;
          }
        } else if (selectedSpecialty === 'laptops') {
          if (!text.includes('laptop') && !text.includes('chip') && !text.includes('motherboard') && !text.includes('pc') && !text.includes('cooling')) {
            return false;
          }
        } else if (selectedSpecialty === 'appliances') {
          if (!text.includes('ac') && !text.includes('appliance') && !text.includes('fridge') && !text.includes('cool') && !text.includes('inverter')) {
            return false;
          }
        } else if (selectedSpecialty === 'tv') {
          if (!text.includes('tv') && !text.includes('oled') && !text.includes('panel') && !text.includes('audio') && !text.includes('vision')) {
            return false;
          }
        }
      }

      // Open now filter
      if (filterOpenNow && !isShopOpen(shop)) {
        return false;
      }

      return true;
    });
  }, [shops, selectedSpecialty, filterOpenNow]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedSpecialty !== 'all' ||
    filterTopRated ||
    filterOpenNow ||
    sortByNearest;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('all');
    setFilterTopRated(false);
    setFilterOpenNow(false);
    setSortByNearest(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>Repair Workshops</Text>
          <View style={styles.badgeRow}>
            <View style={styles.liveCountBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveCountText}>
                {loading ? 'Searching...' : `${filteredShops.length} Verified Hubs`}
              </Text>
            </View>
            <View style={styles.cityBadge}>
              <MapPin size={11} color={Colors.primary} />
              <Text style={styles.cityText}>Bangalore</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search workshops, localities (Indiranagar, Apple...)"
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <X size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Device & Specialty Category Chips Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {SPECIALTY_FILTERS.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedSpecialty === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedSpecialty(cat.id)}
                  activeOpacity={0.8}
                >
                  <Icon
                    size={14}
                    color={isSelected ? Colors.textInverse : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Quick Filter & Sort Options */}
        <View style={styles.quickFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFiltersContent}
          >
            {/* Top Rated Chip */}
            <TouchableOpacity
              style={[
                styles.quickFilterPill,
                filterTopRated && styles.quickFilterPillActive,
              ]}
              onPress={() => setFilterTopRated(!filterTopRated)}
              activeOpacity={0.8}
            >
              <Star
                size={13}
                color={filterTopRated ? '#d97706' : Colors.textMuted}
                fill={filterTopRated ? '#d97706' : 'none'}
              />
              <Text
                style={[
                  styles.quickFilterText,
                  filterTopRated && styles.quickFilterTextActive,
                ]}
              >
                Top Rated (4.8+)
              </Text>
            </TouchableOpacity>

            {/* Nearest First Chip */}
            <TouchableOpacity
              style={[
                styles.quickFilterPill,
                sortByNearest && styles.quickFilterPillActive,
              ]}
              onPress={() => setSortByNearest(!sortByNearest)}
              activeOpacity={0.8}
            >
              <Navigation
                size={13}
                color={sortByNearest ? Colors.primary : Colors.textMuted}
              />
              <Text
                style={[
                  styles.quickFilterText,
                  sortByNearest && styles.quickFilterTextActive,
                ]}
              >
                Nearest Distance
              </Text>
            </TouchableOpacity>

            {/* Open Now Chip */}
            <TouchableOpacity
              style={[
                styles.quickFilterPill,
                filterOpenNow && styles.quickFilterPillActive,
              ]}
              onPress={() => setFilterOpenNow(!filterOpenNow)}
              activeOpacity={0.8}
            >
              <Clock
                size={13}
                color={filterOpenNow ? Colors.success : Colors.textMuted}
              />
              <Text
                style={[
                  styles.quickFilterText,
                  filterOpenNow && styles.quickFilterTextActive,
                ]}
              >
                Open Now
              </Text>
            </TouchableOpacity>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.resetFilterPill}
                onPress={handleResetFilters}
                activeOpacity={0.8}
              >
                <RotateCcw size={12} color={Colors.textMuted} />
                <Text style={styles.resetFilterText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Directory Banner Information */}
        <View style={styles.infoBanner}>
          <ShieldCheck size={18} color={Colors.primary} />
          <Text style={styles.infoBannerText}>
            Every workshop is physical-verified with background checks & 90-day OEM parts warranty.
          </Text>
        </View>

        {/* Loading Spinner */}
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Finding certified partner workshops...</Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && filteredShops.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🐝</Text>
            <Text style={styles.emptyTitle}>No workshops found</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery
                ? `No matching workshops for "${searchQuery}". Try searching "Apple", "Laptop", or "Indiranagar".`
                : 'No workshops match the selected filter criteria.'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={handleResetFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyResetBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Workshop Cards List */}
        {!loading &&
          filteredShops.map((shop) => {
            const isOpen = isShopOpen(shop);
            const ratingVal = Number(shop.avg_rating || 5.0).toFixed(1);
            const distVal = getDistanceText(shop);
            const specialtyBadges = getSpecialtyBadges(shop);

            return (
              <View key={shop.id} style={styles.shopCard}>
                {/* Header Row with Icon, Name, and Rating */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarEmoji}>
                      {shop.category === 'appliances'
                        ? '❄️'
                        : shop.shop_name.toLowerCase().includes('apple')
                        ? '🍏'
                        : shop.shop_name.toLowerCase().includes('laptop')
                        ? '💻'
                        : shop.shop_name.toLowerCase().includes('tv')
                        ? '📺'
                        : '🔧'}
                    </Text>
                  </View>

                  <View style={styles.headerInfoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.shopName} numberOfLines={1}>
                        {shop.shop_name}
                      </Text>
                      <ShieldCheck size={16} color={Colors.tertiary} />
                    </View>

                    <Text style={styles.ownerText}>
                      Managed by {shop.owner_name || 'Bee Certified Partner'}
                    </Text>

                    <View style={styles.metricsRow}>
                      <View style={styles.ratingBadge}>
                        <Star size={12} color="#b45309" fill="#f59e0b" />
                        <Text style={styles.ratingNum}>{ratingVal}</Text>
                        <Text style={styles.ratingTotal}>({shop.total_ratings || 0})</Text>
                      </View>
                      <View style={styles.dotSeparator} />
                      <View style={styles.distBadge}>
                        <MapPin size={11} color={Colors.textMuted} />
                        <Text style={styles.distText}>{distVal}</Text>
                      </View>
                      <View style={styles.dotSeparator} />
                      <Text style={styles.jobsCompletedText}>
                        {shop.total_jobs || 150}+ fixed
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.shopDescription} numberOfLines={2}>
                  {shop.description || 'Certified multi-brand electronics & home appliance repair hub.'}
                </Text>

                {/* Location Address */}
                <View style={styles.addressRow}>
                  <MapPin size={13} color={Colors.textMuted} />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {[shop.address, shop.city, shop.pincode].filter(Boolean).join(', ')}
                  </Text>
                </View>

                {/* Specialties Tag Chips */}
                <View style={styles.specialtiesWrap}>
                  {specialtyBadges.map((badge, idx) => (
                    <View key={idx} style={styles.specialtyTag}>
                      <Sparkles size={10} color={Colors.primary} />
                      <Text style={styles.specialtyTagText}>{badge}</Text>
                    </View>
                  ))}
                </View>

                {/* Status and Action Buttons */}
                <View style={styles.cardFooter}>
                  <View style={styles.statusCol}>
                    <View style={styles.statusIndicatorRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isOpen ? Colors.success : Colors.textMuted },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusLabel,
                          { color: isOpen ? Colors.success : Colors.textMuted },
                        ]}
                      >
                        {isOpen ? 'Open Now' : 'Closed'}
                      </Text>
                    </View>
                    <Text style={styles.hoursSubtitle}>
                      {shop.opening_time ? `${shop.opening_time.slice(0, 5)} - ${shop.closing_time ? shop.closing_time.slice(0, 5) : '21:00'}` : '9:00 AM - 9:00 PM'}
                    </Text>
                  </View>

                  <View style={styles.actionButtonsRow}>
                    {/* View Details Outline Button */}
                    <TouchableOpacity
                      style={styles.detailsBtn}
                      activeOpacity={0.8}
                      onPress={() => router.push(`/shop/${shop.id}`)}
                    >
                      <Text style={styles.detailsBtnText}>Profile</Text>
                    </TouchableOpacity>

                    {/* Book Repair Direct CTA Button */}
                    <TouchableOpacity
                      style={styles.bookBtn}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: '/booking',
                          params: {
                            category: shop.category === 'both' ? 'electronics' : shop.category,
                          },
                        })
                      }
                    >
                      <Text style={styles.bookBtnText}>Book Repair</Text>
                      <ArrowRight size={14} color={Colors.textInverse} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  titleContainer: {
    flex: 1,
  },
  screenTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  liveCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  liveCountText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.tiny,
    color: Colors.primaryDark,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cityText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },
  searchSection: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    height: '100%',
  },
  clearButton: {
    padding: 6,
  },
  scrollArea: {
    flex: 1,
  },
  carouselContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  categoryScrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  categoryChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  categoryChipText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.textInverse,
    fontFamily: Fonts.bodySemiBold,
  },
  quickFiltersContainer: {
    paddingVertical: 10,
  },
  quickFiltersContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 8,
    alignItems: 'center',
  },
  quickFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  quickFilterPillActive: {
    backgroundColor: '#fffbeb',
    borderColor: Colors.primaryLight,
  },
  quickFilterText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },
  quickFilterTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.primaryDark,
  },
  resetFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceDim,
  },
  resetFilterText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.tiny,
    color: Colors.textMuted,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: 12,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  infoBannerText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.primaryDark,
    lineHeight: 18,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyResetBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  emptyResetBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textInverse,
  },
  shopCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: 14,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  headerInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shopName: {
    flex: 1,
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  ownerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  ratingNum: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.tiny,
    color: '#b45309',
  },
  ratingTotal: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.tiny,
    color: '#b45309',
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
  distBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.tiny,
    color: Colors.textSecondary,
  },
  jobsCompletedText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.tiny,
    color: Colors.tertiary,
  },
  shopDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  addressText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
  specialtiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  specialtyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  specialtyTagText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.tiny,
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceDim,
  },
  statusCol: {
    justifyContent: 'center',
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.caption,
  },
  hoursSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.tiny,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  detailsBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  bookBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.textInverse,
  },
});
