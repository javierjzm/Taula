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
import MapboxGL from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
const HERO_HEIGHT = 280;

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
    <View style={{ flexDirection: 'row', gap: 1 }}>
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
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {review.userAvatar ? (
          <Image source={{ uri: review.userAvatar }} style={styles.reviewAvatar} />
        ) : (
          <View style={[styles.reviewAvatar, styles.reviewAvatarPlaceholder]}>
            <Ionicons name="person" size={16} color={Colors.textTertiary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewName}>{review.userName}</Text>
          <Text style={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <StarRow rating={review.rating} size={12} />
      </View>
      {review.comment ? (
        <Text style={styles.reviewComment}>{review.comment}</Text>
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
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.mapContainer}>
      <MapboxGL.MapView
        style={styles.miniMap}
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
          <View style={styles.mapMarker}>
            <Ionicons name="restaurant" size={14} color={Colors.white} />
          </View>
        </MapboxGL.PointAnnotation>
      </MapboxGL.MapView>
      <Text style={styles.mapLabel} numberOfLines={1}>
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
    <View style={styles.hoursTable}>
      {sorted.map((h) => {
        const isToday = h.dayOfWeek === todayIso;
        const dayKey = DAY_KEYS[h.dayOfWeek] ?? 'day_mon';
        return (
          <View
            key={h.dayOfWeek}
            style={[styles.hoursRow, isToday && styles.hoursRowToday]}
          >
            <Text
              style={[styles.hoursDay, isToday && styles.hoursDayToday]}
            >
              {t(`restaurant.${dayKey}`)}
            </Text>
            <Text
              style={[styles.hoursTime, isToday && styles.hoursTimeToday]}
            >
              {h.isClosed
                ? t('restaurant.closed')
                : `${h.openTime} - ${h.closeTime}`}
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (isError || !restaurant) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scrollView}
        stickyHeaderIndices={[2]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Hero image */}
        <View style={styles.hero}>
          {restaurant.coverImage ? (
            <Image
              source={{ uri: restaurant.coverImage }}
              style={styles.heroImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="restaurant-outline" size={48} color={Colors.textTertiary} />
            </View>
          )}
          <View style={[styles.heroOverlay, { paddingTop: insets.top }]}>
            <TouchableOpacity style={styles.heroBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Restaurant info header */}
        <View style={styles.infoHeader}>
          <Text style={styles.name}>{restaurant.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={Colors.star} />
              <Text style={styles.ratingValue}>{restaurant.avgRating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({restaurant.reviewCount})</Text>
            </View>
            <Text style={styles.priceRange}>
              {'€'.repeat(restaurant.priceRange)}
              <Text style={{ color: Colors.border }}>
                {'€'.repeat(4 - restaurant.priceRange)}
              </Text>
            </Text>
          </View>
          <View style={styles.cuisineRow}>
            {restaurant.cuisineType.map((c) => (
              <View key={c} style={styles.cuisineBadge}>
                <Text style={styles.cuisineBadgeText}>{c}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.address} numberOfLines={2}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />{' '}
            {restaurant.address}
          </Text>
        </View>

        {/* Tab bar (sticky) */}
        <View style={styles.tabBarWrapper}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'info' && styles.tabActive]}
              onPress={() => setActiveTab('info')}
            >
              <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
                {t('restaurant.info')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
              onPress={() => setActiveTab('reviews')}
            >
              <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
                {t('restaurant.reviews')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab content */}
        {activeTab === 'info' ? (
          <View style={styles.tabContent}>
            {restaurant.description ? (
              <View style={styles.section}>
                <Text style={styles.descriptionText}>{restaurant.description}</Text>
              </View>
            ) : null}

            {/* Hours */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('restaurant.hours')}</Text>
              <HoursTable hours={restaurant.hours} t={t} />
            </View>

            {/* Contact */}
            <View style={styles.section}>
              {restaurant.phone ? (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}
                >
                  <View style={styles.contactIcon}>
                    <Ionicons name="call-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactLabel}>{t('restaurant.phone')}</Text>
                    <Text style={styles.contactValue}>{restaurant.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              ) : null}

              {restaurant.website ? (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(restaurant.website!)}
                >
                  <View style={styles.contactIcon}>
                    <Ionicons name="globe-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactLabel}>{t('restaurant.website')}</Text>
                    <Text style={styles.contactValue} numberOfLines={1}>
                      {restaurant.website}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Map */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('restaurant.location')}</Text>
              <RestaurantMiniMap
                latitude={restaurant.latitude}
                longitude={restaurant.longitude}
                name={restaurant.address}
                onPress={openMap}
              />
              <TouchableOpacity style={styles.openMapBtn} onPress={openMap}>
                <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                <Text style={styles.openMapText}>{t('restaurant.open_map')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.tabContent}>
            {reviewsLoading ? (
              <View style={styles.reviewsLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : reviews.length === 0 ? (
              <View style={styles.noReviews}>
                <Ionicons name="chatbubble-outline" size={48} color={Colors.border} />
                <Text style={styles.noReviewsText}>{t('restaurant.no_reviews')}</Text>
              </View>
            ) : (
              reviews.map((review) => <ReviewItem key={review.id} review={review} />)
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.reserveBtn} onPress={handleReserve} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={20} color={Colors.white} />
          <Text style={styles.reserveBtnText}>{t('restaurant.reserve')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
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
    fontWeight: '500',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
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
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  infoHeader: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  ratingCount: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  priceRange: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  cuisineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cuisineBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cuisineBadgeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  address: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  tabBarWrapper: {
    backgroundColor: Colors.surface,
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
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },

  tabContent: {
    paddingBottom: 16,
  },
  section: {
    backgroundColor: Colors.surface,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  hoursTable: {
    gap: 2,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  hoursRowToday: {
    backgroundColor: Colors.surfaceSecondary,
  },
  hoursDay: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    width: 40,
  },
  hoursDayToday: {
    color: Colors.primary,
    fontWeight: '600',
  },
  hoursTime: {
    fontSize: 14,
    color: Colors.text,
  },
  hoursTimeToday: {
    color: Colors.primary,
    fontWeight: '600',
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },

  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  miniMap: {
    width: '100%',
    height: 160,
  },
  mapMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  mapLabel: {
    padding: 10,
    fontSize: 13,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
  },
  openMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
  },
  openMapText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },

  reviewsLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  noReviewsText: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
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
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewAvatarPlaceholder: {
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
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
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  reserveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  reserveBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
