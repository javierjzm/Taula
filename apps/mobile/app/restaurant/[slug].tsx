import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CUISINE_TYPES } from '@/constants/andorra';
import { Colors } from '@/constants/colors';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type {
  RestaurantDetail,
  OpeningHours,
  ApiResponse,
  PaginatedResponse,
} from '@taula/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 320;

interface Review {
  id: string;
  userName: string;
  userAvatar: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

const DAY_KEYS: Record<number, string> = {
  1: 'day_mon',
  2: 'day_tue',
  3: 'day_wed',
  4: 'day_thu',
  5: 'day_fri',
  6: 'day_sat',
  7: 'day_sun',
};

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={Colors.star}
        />
      ))}
    </View>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <View style={st.reviewCard}>
      <View style={st.reviewHeader}>
        {review.userAvatar ? (
          <Image source={{ uri: review.userAvatar }} style={st.reviewAvatar} />
        ) : (
          <View style={[st.reviewAvatar, st.reviewAvatarPlaceholder]}>
            <Text style={st.reviewAvatarLetter}>
              {review.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={st.reviewName}>{review.userName}</Text>
          <Text style={st.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <StarRow rating={review.rating} size={12} />
      </View>
      {review.comment ? (
        <Text style={st.reviewComment}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

function RestaurantMiniMap({
  latitude,
  longitude,
  name,
  onPress,
}: {
  latitude: number;
  longitude: number;
  name: string;
  onPress: () => void;
}) {
  const isExpoGo = Constants.appOwnership === 'expo';
  if (Platform.OS === 'web' || isExpoGo) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={st.mapContainer}>
        <View style={[st.miniMap, { backgroundColor: Colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="map-outline" size={40} color={Colors.textTertiary} />
          <Text style={{ color: Colors.textSecondary, fontSize: 13, marginTop: 8 }}>
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Text>
        </View>
        <Text style={st.mapLabel} numberOfLines={1}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  }

  let MapboxGL: any;
  try {
    MapboxGL = require('@rnmapbox/maps').default;
  } catch {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={st.mapContainer}>
        <View style={[st.miniMap, { backgroundColor: Colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="map-outline" size={40} color={Colors.textTertiary} />
          <Text style={{ color: Colors.textSecondary, fontSize: 13, marginTop: 8 }}>
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Text>
        </View>
        <Text style={st.mapLabel} numberOfLines={1}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={st.mapContainer}>
      <MapboxGL.MapView
        style={st.miniMap}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
      >
        <MapboxGL.Camera
          centerCoordinate={[longitude, latitude]}
          zoomLevel={15}
          animationMode="none"
        />
        <MapboxGL.PointAnnotation id="restaurant-pin" coordinate={[longitude, latitude]}>
          <View style={st.mapMarker}>
            <Ionicons name="restaurant" size={14} color={Colors.white} />
          </View>
        </MapboxGL.PointAnnotation>
      </MapboxGL.MapView>
      <Text style={st.mapLabel} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

function HoursTable({ hours, t }: { hours: OpeningHours[]; t: (k: string) => string }) {
  const today = new Date().getDay();
  const todayIso = today === 0 ? 7 : today;
  const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <View style={st.hoursTable}>
      {sorted.map((h) => {
        const isCurrent = h.dayOfWeek === todayIso;
        const dayKey = DAY_KEYS[h.dayOfWeek] ?? 'day_mon';
        return (
          <View
            key={h.dayOfWeek}
            style={[st.hoursRow, isCurrent && st.hoursRowToday]}
          >
            <Text style={[st.hoursDay, isCurrent && st.hoursDayToday]}>
              {t(`restaurant.${dayKey}`)}
            </Text>
            {isCurrent && (
              <View style={st.todayDot} />
            )}
            <Text style={[st.hoursTime, isCurrent && st.hoursTimeToday]}>
              {h.isClosed
                ? t('restaurant.closed')
                : `${h.openTime} – ${h.closeTime}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function RestaurantDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { requireAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info');

  const {
    data: restaurantRes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['restaurant', slug],
    queryFn: () => api<ApiResponse<RestaurantDetail>>(`/restaurants/${slug}`),
    enabled: !!slug,
  });

  const restaurant = restaurantRes?.data;

  const { data: reviewsRes, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', slug],
    queryFn: () =>
      api<PaginatedResponse<Review>>(`/restaurants/${slug}/reviews`),
    enabled: !!slug && activeTab === 'reviews',
  });

  const reviews = reviewsRes?.data ?? [];

  const handleReserve = () => {
    if (!restaurant) return;
    requireAuth(() => {
      router.push(
        `/reservation/new?restaurantId=${restaurant.id}&slug=${slug}&name=${encodeURIComponent(restaurant.name)}`,
      );
    });
  };

  const openMap = () => {
    if (!restaurant) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${restaurant.latitude},${restaurant.longitude}`,
      android: `google.navigation:q=${restaurant.latitude},${restaurant.longitude}`,
    }) || `https://maps.google.com/?q=${restaurant.latitude},${restaurant.longitude}`;
    Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <View style={st.centerScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={st.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (isError || !restaurant) {
    return (
      <View style={st.centerScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={st.errorText}>{t('common.error')}</Text>
        <TouchableOpacity style={st.retryBtn} onPress={() => refetch()}>
          <Text style={st.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={st.scrollView}
        stickyHeaderIndices={[2]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Hero image */}
        <View style={st.hero}>
          {restaurant.coverImage ? (
            <Image
              source={{ uri: restaurant.coverImage }}
              style={st.heroImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[st.heroImage, st.heroPlaceholder]}>
              <Ionicons name="restaurant-outline" size={56} color={Colors.textTertiary} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)', Colors.background]}
            style={st.heroGradient}
          />
          <View style={[st.heroNav, { paddingTop: insets.top + 4 }]}>
            <TouchableOpacity style={st.heroBtn} onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Restaurant info header */}
        <View style={st.infoHeader}>
          <View style={st.nameRow}>
            <Text style={st.name} numberOfLines={2}>{restaurant.name}</Text>
          </View>

          <View style={st.metaRow}>
            <View style={st.ratingPill}>
              <Ionicons name="star" size={14} color={Colors.star} />
              <Text style={st.ratingValue}>{restaurant.avgRating.toFixed(1)}</Text>
              <Text style={st.ratingCount}>({restaurant.reviewCount})</Text>
            </View>
            <Text style={st.priceDots}>
              {'€'.repeat(restaurant.priceRange)}
              <Text style={{ color: Colors.textTertiary }}>
                {'€'.repeat(4 - restaurant.priceRange)}
              </Text>
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {restaurant.cuisineType.map((c) => {
              const match = CUISINE_TYPES.find((ct) => ct.id === c);
              return (
                <View key={c} style={st.cuisineChip}>
                  <Text style={st.cuisineChipText}>{match ? match.label : c}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={st.addressRow}>
            <Ionicons name="location-outline" size={15} color={Colors.accent} />
            <Text style={st.addressText} numberOfLines={2}>{restaurant.address}</Text>
          </View>
        </View>

        {/* Tab bar (sticky) */}
        <View style={st.tabBarWrapper}>
          <View style={st.tabBar}>
            {(['info', 'reviews'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[st.tab, activeTab === tab && st.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[st.tabText, activeTab === tab && st.tabTextActive]}>
                  {t(`restaurant.${tab}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tab content */}
        {activeTab === 'info' ? (
          <View style={st.tabContent}>
            {restaurant.description ? (
              <View style={st.card}>
                <Text style={st.descriptionText}>{restaurant.description}</Text>
              </View>
            ) : null}

            <View style={st.card}>
              <Text style={st.cardTitle}>{t('restaurant.hours')}</Text>
              <HoursTable hours={restaurant.hours} t={t} />
            </View>

            <View style={st.card}>
              {restaurant.phone ? (
                <TouchableOpacity
                  style={st.contactRow}
                  onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}
                >
                  <View style={st.contactIconWrap}>
                    <Ionicons name="call-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.contactLabel}>{t('restaurant.phone')}</Text>
                    <Text style={st.contactValue}>{restaurant.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              ) : null}

              {restaurant.website ? (
                <TouchableOpacity
                  style={[st.contactRow, { borderBottomWidth: 0 }]}
                  onPress={() => Linking.openURL(restaurant.website!)}
                >
                  <View style={st.contactIconWrap}>
                    <Ionicons name="globe-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.contactLabel}>{t('restaurant.website')}</Text>
                    <Text style={st.contactValue} numberOfLines={1}>
                      {restaurant.website}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={st.card}>
              <Text style={st.cardTitle}>{t('restaurant.location')}</Text>
              <RestaurantMiniMap
                latitude={restaurant.latitude}
                longitude={restaurant.longitude}
                name={restaurant.address}
                onPress={openMap}
              />
              <TouchableOpacity style={st.openMapBtn} onPress={openMap}>
                <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                <Text style={st.openMapText}>{t('restaurant.open_map')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={st.tabContent}>
            {reviewsLoading ? (
              <View style={st.reviewsLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : reviews.length === 0 ? (
              <View style={st.noReviews}>
                <View style={st.noReviewsIcon}>
                  <Ionicons name="chatbubble-outline" size={32} color={Colors.textTertiary} />
                </View>
                <Text style={st.noReviewsTitle}>{t('restaurant.no_reviews')}</Text>
              </View>
            ) : (
              reviews.map((review) => <ReviewItem key={review.id} review={review} />)
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[st.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={st.reserveBtn} onPress={handleReserve} activeOpacity={0.85}>
          <Ionicons name="calendar-outline" size={20} color={Colors.white} />
          <Text style={st.reserveBtnText}>{t('restaurant.reserve')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    marginTop: 4,
  },
  retryText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 15,
  },

  hero: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  heroBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoHeader: {
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 18,
    gap: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.star,
  },
  ratingCount: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  priceDots: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  cuisineChip: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cuisineChipText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  tabBarWrapper: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  tabContent: {
    paddingBottom: 16,
    gap: 10,
    paddingTop: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 23,
  },

  hoursTable: {
    gap: 2,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  hoursRowToday: {
    backgroundColor: Colors.primaryGlow,
  },
  hoursDay: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    width: 40,
  },
  hoursDayToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 'auto',
    marginLeft: 6,
  },
  hoursTime: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  hoursTimeToday: {
    color: Colors.primary,
    fontWeight: '700',
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  contactIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },

  mapContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  miniMap: {
    width: '100%',
    height: 160,
  },
  mapMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: Colors.white,
  },
  mapLabel: {
    padding: 12,
    fontSize: 13,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    fontWeight: '500',
  },
  openMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: Colors.primaryGlow,
    borderRadius: 14,
  },
  openMapText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },

  reviewsLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  noReviewsIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  noReviewsTitle: {
    fontSize: 15,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  reviewAvatarPlaceholder: {
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reserveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 16,
    gap: 10,
    ...Colors.shadow.md,
  },
  reserveBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
