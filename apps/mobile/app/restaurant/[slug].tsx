import { useRef, useState } from 'react';
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
  Share,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCuisineLabel } from '@/constants/andorra';
import { Colors } from '@/constants/colors';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { ApiResponse, PaginatedResponse } from '@taula/shared';

const { width: SW } = Dimensions.get('window');
const HERO_H = 360;
const GALLERY_SIZE = (SW - 52) / 3;

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cuisineType: string[];
  cuisine: string;
  priceRange: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string;
  parish: string;
  latitude: number;
  longitude: number;
  coverImage: string | null;
  images: string[];
  avgRating: number;
  reviewCount: number;
  isOpen: boolean;
  hours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[];
  featured?: boolean;
  plan?: 'RESERVATIONS' | 'LISTING_BASIC' | 'LISTING_FEATURED' | null;
  isListingOnly?: boolean;
  externalReservationUrl?: string | null;
}

interface Review {
  id: string;
  userName?: string | null;
  userAvatar?: string | null;
  user?: { name?: string | null; avatar?: string | null };
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  items: MenuItemData[];
}
interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  allergens: string[];
  isPopular: boolean;
}
interface OfferData {
  id: string;
  title: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_ITEM' | 'SPECIAL_MENU';
  value: number;
}

/* ══════ QUICK ACTION BUTTON ══════ */

function QuickAction({ icon, label, onPress, color }: {
  icon: string; label: string; onPress: () => void; color?: string;
}) {
  return (
    <TouchableOpacity style={s.qaBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={s.qaIconWrap}>
        <Ionicons name={icon as any} size={20} color={color ?? Colors.primary} />
      </View>
      <Text style={s.qaLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ══════ STAR ROW ══════ */

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={13}
          color={Colors.star}
        />
      ))}
    </View>
  );
}

/* ══════ REVIEW CARD ══════ */

function ReviewCard({ review }: { review: Review }) {
  const userName = review.userName ?? review.user?.name ?? 'Usuario';
  const userAvatar = review.userAvatar ?? review.user?.avatar ?? null;
  const userInitial = userName.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={s.reviewCard}>
      <View style={s.reviewTop}>
        {userAvatar ? (
          <Image source={{ uri: userAvatar }} style={s.reviewAvatar} />
        ) : (
          <View style={[s.reviewAvatar, s.reviewAvatarFallback]}>
            <Text style={s.reviewInitial}>{userInitial}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.reviewName}>{userName}</Text>
          <Text style={s.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
        </View>
        <Stars rating={review.rating} />
      </View>
      {review.comment ? <Text style={s.reviewComment}>{review.comment}</Text> : null}
    </View>
  );
}

/* ═══════════ MAIN SCREEN ═══════════ */

export default function RestaurantDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { requireAuth } = useAuth();
  const isFav = useFavoritesStore((st) => st.isFav);
  const toggleFav = useFavoritesStore((st) => st.toggle);
  const scrollRef = useRef<ScrollView>(null);

  const { data: res, isLoading, isError, refetch } = useQuery({
    queryKey: ['restaurant', slug],
    queryFn: () => api<ApiResponse<Restaurant>>(`/restaurants/${slug}`),
    enabled: !!slug,
  });

  const restaurant = res?.data;

  const { data: reviewsRes } = useQuery({
    queryKey: ['reviews', slug],
    queryFn: () => api<PaginatedResponse<Review>>(`/restaurants/${slug}/reviews`),
    enabled: !!slug,
  });
  const reviews = reviewsRes?.data ?? [];

  const { data: menuRes } = useQuery({
    queryKey: ['menu', slug],
    queryFn: () => api<ApiResponse<MenuCategory[]>>(`/restaurants/${slug}/menu`),
    enabled: !!slug,
  });
  const menuCategories = menuRes?.data ?? [];
  const hasMenu = menuCategories.some((c) => c.items.length > 0);

  const { data: offersRes } = useQuery({
    queryKey: ['offers', slug],
    queryFn: () => api<ApiResponse<OfferData[]>>(`/restaurants/${slug}/offers`),
    enabled: !!slug,
  });
  const offers = offersRes?.data ?? [];

  const [expandedMenuCat, setExpandedMenuCat] = useState<string | null>(null);

  const handleReserve = () => {
    if (!restaurant) return;
    requireAuth(() => {
      router.push(
        `/reservation/new?restaurantId=${restaurant.id}&slug=${slug}&name=${encodeURIComponent(restaurant.name)}`,
      );
    });
  };

  const handleExternalReserve = () => {
    if (!restaurant?.externalReservationUrl) return;
    Linking.openURL(restaurant.externalReservationUrl).catch(() => {});
  };

  const openMap = () => {
    if (!restaurant) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${restaurant.latitude},${restaurant.longitude}`,
      android: `google.navigation:q=${restaurant.latitude},${restaurant.longitude}`,
    }) || `https://maps.google.com/?q=${restaurant.latitude},${restaurant.longitude}`;
    Linking.openURL(url);
  };

  const handleShare = async () => {
    if (!restaurant) return;
    try {
      await Share.share({ message: `${restaurant.name} — Taula\nhttps://taula.ad/r/${slug}` });
    } catch { /* noop */ }
  };

  /* ── Loading / Error ── */
  if (isLoading) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (isError || !restaurant) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={s.errTxt}>{t('common.error')}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
          <Text style={s.retryTxt}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allImages = [restaurant.coverImage, ...(restaurant.images ?? [])].filter(Boolean) as string[];
  const fav = isFav(restaurant.id);

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* ── HERO ── */}
        <View style={s.hero}>
          {restaurant.coverImage ? (
            <Image source={{ uri: restaurant.coverImage }} style={s.heroImg} contentFit="cover" transition={300} />
          ) : (
            <View style={[s.heroImg, s.heroPlaceholder]}>
              <Ionicons name="restaurant-outline" size={56} color={Colors.textTertiary} />
            </View>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.75)', Colors.background]} locations={[0, 0.3, 0.75, 1]} style={s.heroGrad} />

          {/* Nav */}
          <View style={[s.heroNav, { paddingTop: insets.top + 4 }]}>
            <TouchableOpacity style={s.heroCircle} onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={Colors.white} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={s.heroCircle} onPress={() => toggleFav(restaurant.id)}>
                <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? Colors.error : Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={s.heroCircle} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero bottom info */}
          <View style={s.heroBottom}>
            <View style={s.heroBadgesRow}>
              {restaurant.featured && (
                <View style={s.heroFeaturedBadge}>
                  <Ionicons name="star" size={10} color={Colors.textInverse} />
                  <Text style={s.heroFeaturedTxt}>Destacado</Text>
                </View>
              )}
              {restaurant.isOpen != null && (
                <View style={[s.statusBadge, !restaurant.isOpen && s.statusClosed]}>
                  <View style={[s.statusDot, !restaurant.isOpen && s.statusDotClosed]} />
                  <Text style={[s.statusTxt, !restaurant.isOpen && s.statusTxtClosed]}>
                    {restaurant.isOpen ? t('restaurant.open_now') : t('restaurant.closed')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={s.heroName} numberOfLines={2}>{restaurant.name}</Text>
            <View style={s.heroMeta}>
              <View style={s.heroRating}>
                <Ionicons name="star" size={14} color={Colors.star} />
                <Text style={s.heroRatingTxt}>{restaurant.avgRating.toFixed(1)}</Text>
                <Text style={s.heroReviews}>({restaurant.reviewCount})</Text>
              </View>
              <View style={s.heroDot} />
              <Text style={s.heroCuisine}>
                {restaurant.cuisineType.map((c) => getCuisineLabel(c, t)).join(' · ')}
              </Text>
              <View style={s.heroDot} />
              <Text style={s.heroPrice}>{'€'.repeat(restaurant.priceRange)}</Text>
            </View>
            <View style={s.heroAddress}>
              <Ionicons name="location-outline" size={14} color={Colors.primary} />
              <Text style={s.heroAddressTxt} numberOfLines={1}>{restaurant.address}</Text>
            </View>
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={s.qaRow}>
          {restaurant.phone && (
            <QuickAction icon="call-outline" label={t('restaurant.phone')} onPress={() => Linking.openURL(`tel:${restaurant.phone}`)} />
          )}
          <QuickAction icon="navigate-outline" label={t('restaurant.directions')} onPress={openMap} />
          {restaurant.website && (
            <QuickAction icon="globe-outline" label={t('restaurant.website')} onPress={() => Linking.openURL(restaurant.website!)} />
          )}
          <QuickAction icon="share-outline" label={t('restaurant.share')} onPress={handleShare} />
        </View>

        {/* ── ABOUT ── */}
        {restaurant.description && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('restaurant.about')}</Text>
            <Text style={s.aboutTxt}>{restaurant.description}</Text>
          </View>
        )}

        {/* ── GALLERY ── */}
        {allImages.length > 1 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('restaurant.gallery')}</Text>
            <FlatList
              horizontal
              data={allImages}
              keyExtractor={(_, i) => String(i)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item, index }) => (
                <Image
                  source={{ uri: item }}
                  style={[
                    s.galleryImg,
                    index === 0 && { borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
                    index === allImages.length - 1 && { borderTopRightRadius: 14, borderBottomRightRadius: 14 },
                  ]}
                  contentFit="cover"
                  transition={200}
                />
              )}
            />
          </View>
        )}

        {/* ── OFFERS ── */}
        {offers.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('restaurant.offers')}</Text>
            <View style={s.offersWrap}>
              {offers.map((offer) => {
                const badge =
                  offer.type === 'PERCENTAGE' ? `-${offer.value}%`
                  : offer.type === 'FIXED_AMOUNT' ? `-${offer.value}€`
                  : offer.type === 'SPECIAL_MENU' ? `${offer.value}€`
                  : '🎁';
                const icon =
                  offer.type === 'PERCENTAGE' || offer.type === 'FIXED_AMOUNT' ? 'pricetag'
                  : offer.type === 'SPECIAL_MENU' ? 'restaurant'
                  : 'gift';
                return (
                  <View key={offer.id} style={s.offerRow}>
                    <View style={s.offerIconWrap}>
                      <Ionicons name={icon as any} size={14} color="#16A34A" />
                    </View>
                    <View style={s.offerContent}>
                      <View style={s.offerTopRow}>
                        <Text style={s.offerTitle} numberOfLines={1}>{offer.title}</Text>
                        <View style={s.offerBadge}>
                          <Text style={s.offerBadgeText}>{badge}</Text>
                        </View>
                      </View>
                      {offer.description && (
                        <Text style={s.offerDesc} numberOfLines={1}>{offer.description}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── CARTA / MENÚ ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('restaurant.menu')}</Text>
          {hasMenu ? (
            <View>
              {menuCategories.filter((c) => c.items.length > 0).map((cat) => {
                const isExpanded = expandedMenuCat === cat.id;
                return (
                  <View key={cat.id} style={s.menuCat}>
                    <TouchableOpacity
                      style={s.menuCatHeader}
                      onPress={() => setExpandedMenuCat(isExpanded ? null : cat.id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={s.menuCatName}>{cat.name}</Text>
                        <Text style={s.menuCatCount}>{cat.items.length} {cat.items.length === 1 ? 'plat' : 'plats'}</Text>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textTertiary} />
                    </TouchableOpacity>
                    {isExpanded && cat.items.map((item) => (
                      <View key={item.id} style={s.menuItem}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={s.menuItemImg} contentFit="cover" transition={200} />
                        ) : (
                          <View style={[s.menuItemImg, s.menuItemImgPlaceholder]}>
                            <Ionicons name="restaurant-outline" size={16} color={Colors.textTertiary} />
                          </View>
                        )}
                        <View style={s.menuItemInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={s.menuItemName} numberOfLines={1}>{item.name}</Text>
                            {item.isPopular && (
                              <View style={s.popularBadge}>
                                <Ionicons name="star" size={10} color="#D97706" />
                              </View>
                            )}
                          </View>
                          {item.description && (
                            <Text style={s.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                          )}
                          {item.allergens.length > 0 && (
                            <View style={s.allergenRow}>
                              {item.allergens.slice(0, 4).map((a) => (
                                <View key={a} style={s.allergenTag}>
                                  <Text style={s.allergenText}>{a}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                        <Text style={s.menuItemPrice}>{item.price.toFixed(2)}€</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={s.noMenuWrap}>
              <Ionicons name="restaurant-outline" size={32} color={Colors.textTertiary} />
              <Text style={s.menuNote}>{t('restaurant.menu_coming')}</Text>
            </View>
          )}
        </View>

        {/* ── REVIEWS PREVIEW ── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>{t('restaurant.reviews')}</Text>
            <View style={s.reviewSummary}>
              <Ionicons name="star" size={14} color={Colors.star} />
              <Text style={s.reviewSummaryTxt}>
                {restaurant.avgRating.toFixed(1)} ({restaurant.reviewCount})
              </Text>
            </View>
          </View>

          {reviews.length > 0 ? (
            <>
              {reviews.slice(0, 3).map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
              {restaurant.reviewCount > 3 && (
                <TouchableOpacity style={s.seeAllBtn} onPress={() => router.push(`/restaurant/reviews?slug=${slug}&name=${encodeURIComponent(restaurant.name)}`)}>
                  <Text style={s.seeAllTxt}>{t('restaurant.see_all_reviews')}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={s.noReviews}>
              <Ionicons name="chatbubble-outline" size={28} color={Colors.textTertiary} />
              <Text style={s.noReviewsTxt}>{t('restaurant.be_first_review')}</Text>
            </View>
          )}
        </View>

        {/* ── LOCATION MAP ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('restaurant.location')}</Text>
          <TouchableOpacity style={s.mapCard} onPress={openMap} activeOpacity={0.85}>
            <View style={s.mapPlaceholder}>
              <Ionicons name="map-outline" size={36} color={Colors.textTertiary} />
              <Text style={s.mapCoords}>{restaurant.latitude.toFixed(4)}, {restaurant.longitude.toFixed(4)}</Text>
            </View>
            <View style={s.mapBottom}>
              <Ionicons name="location" size={16} color={Colors.primary} />
              <Text style={s.mapAddress} numberOfLines={1}>{restaurant.address}</Text>
              <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── BOTTOM CTA ── */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={s.bottomInfo}>
          <Text style={s.bottomPrice}>{'€'.repeat(restaurant.priceRange)}</Text>
          <View style={s.bottomRating}>
            <Ionicons name="star" size={12} color={Colors.star} />
            <Text style={s.bottomRatingTxt}>{restaurant.avgRating.toFixed(1)}</Text>
          </View>
        </View>
        {restaurant.isListingOnly ? (
          restaurant.externalReservationUrl ? (
            <TouchableOpacity style={s.reserveBtn} onPress={handleExternalReserve} activeOpacity={0.85}>
              <Text style={s.reserveTxt}>Reservar en su web</Text>
              <Ionicons name="open-outline" size={18} color={Colors.textInverse} />
            </TouchableOpacity>
          ) : restaurant.phone ? (
            <TouchableOpacity
              style={s.reserveBtn}
              onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}
              activeOpacity={0.85}
            >
              <Text style={s.reserveTxt}>Llamar al restaurante</Text>
              <Ionicons name="call" size={18} color={Colors.textInverse} />
            </TouchableOpacity>
          ) : (
            <View style={[s.reserveBtn, { backgroundColor: Colors.surfaceSecondary }]}>
              <Text style={[s.reserveTxt, { color: Colors.textTertiary }]}>Reservas no disponibles</Text>
            </View>
          )
        ) : (
          <TouchableOpacity style={s.reserveBtn} onPress={handleReserve} activeOpacity={0.85}>
            <Text style={s.reserveTxt}>{t('restaurant.reserve')}</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ═══════════ STYLES ═══════════ */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 12 },
  errTxt: { fontSize: 16, color: Colors.text, fontWeight: '600' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 14, marginTop: 4 },
  retryTxt: { color: Colors.white, fontWeight: '600', fontSize: 15 },

  /* ── HERO ── */
  hero: { width: SW, height: HERO_H, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroPlaceholder: { backgroundColor: Colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  heroGrad: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  heroCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  heroBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 4 },
  heroBadgesRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  heroFeaturedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroFeaturedTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 6 },
  statusClosed: { backgroundColor: 'rgba(248,113,113,0.15)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  statusDotClosed: { backgroundColor: Colors.error },
  statusTxt: { fontSize: 12, fontWeight: '700', color: Colors.success },
  statusTxtClosed: { color: Colors.error },
  heroName: { fontSize: 28, fontWeight: '900', color: Colors.white, letterSpacing: -0.5, marginBottom: 6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  heroRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroRatingTxt: { fontSize: 14, fontWeight: '800', color: Colors.white },
  heroReviews: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  heroDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.35)' },
  heroCuisine: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  heroPrice: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  heroAddress: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroAddressTxt: { fontSize: 13, color: 'rgba(255,255,255,0.65)', flex: 1 },

  /* ── QUICK ACTIONS ── */
  qaRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 18, gap: 10 },
  qaBtn: { flex: 1, alignItems: 'center', gap: 6 },
  qaIconWrap: { width: 50, height: 50, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  qaLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },

  /* ── SECTIONS ── */
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, letterSpacing: -0.3, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  /* ── ABOUT ── */
  aboutTxt: { fontSize: 15, color: Colors.textSecondary, lineHeight: 23 },

  /* ── GALLERY ── */
  galleryImg: { width: GALLERY_SIZE, height: GALLERY_SIZE, backgroundColor: Colors.surfaceSecondary },

  /* ── OFFERS ── */
  offersWrap: { gap: 6 },
  offerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  offerIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  offerContent: { flex: 1, gap: 1 },
  offerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  offerBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  offerBadgeText: { fontSize: 11, fontWeight: '800', color: '#16A34A' },
  offerTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, flex: 1 },
  offerDesc: { fontSize: 11, color: Colors.textTertiary },

  /* ── MENU ── */
  menuCat: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 10, overflow: 'hidden' },
  menuCatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  menuCatName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  menuCatCount: { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, gap: 12 },
  menuItemImg: { width: 56, height: 56, borderRadius: 12 },
  menuItemImgPlaceholder: { backgroundColor: Colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  menuItemInfo: { flex: 1, gap: 2 },
  menuItemName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  menuItemDesc: { fontSize: 12, color: Colors.textTertiary, lineHeight: 17 },
  menuItemPrice: { fontSize: 16, fontWeight: '800', color: Colors.primary, minWidth: 50, textAlign: 'right' },
  popularBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  allergenRow: { flexDirection: 'row', gap: 4, marginTop: 3 },
  allergenTag: { backgroundColor: '#FEF9C3', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  allergenText: { fontSize: 9, fontWeight: '600', color: '#A16207' },
  noMenuWrap: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  menuNote: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', fontStyle: 'italic' },

  /* ── REVIEWS ── */
  reviewSummary: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewSummaryTxt: { fontSize: 14, fontWeight: '700', color: Colors.star },
  reviewCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewAvatarFallback: { backgroundColor: Colors.primaryGlow, justifyContent: 'center', alignItems: 'center' },
  reviewInitial: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  reviewName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  reviewDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  reviewComment: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  noReviews: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noReviewsTxt: { fontSize: 13, color: Colors.textTertiary },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, marginTop: 4 },
  seeAllTxt: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  /* ── MAP ── */
  mapCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  mapPlaceholder: { width: '100%', height: 140, backgroundColor: Colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  mapCoords: { fontSize: 12, color: Colors.textTertiary, marginTop: 6 },
  mapBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: Colors.surface },
  mapAddress: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: '500' },

  /* ── BOTTOM BAR ── */
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 },
  bottomInfo: { gap: 2 },
  bottomPrice: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  bottomRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bottomRatingTxt: { fontSize: 13, fontWeight: '700', color: Colors.star },
  reserveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, gap: 8, ...Colors.shadow.md },
  reserveTxt: { color: Colors.textInverse, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
