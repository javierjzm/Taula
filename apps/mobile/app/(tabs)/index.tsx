import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { CUISINE_TYPES, getCuisineLabel } from '@/constants/andorra';
import { useFiltersStore } from '@/stores/filtersStore';
import { useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useLocation } from '@/hooks/useLocation';
import { api } from '@/services/api';
import LocationSheet from '@/components/LocationSheet';

const { width: SW } = Dimensions.get('window');
const FEATURED_W = SW - 40;
const GRID_GAP = 10;
const GRID_CARD_W = (SW - 40 - GRID_GAP) / 2;
const CAT_SIZE = 68;

interface ActiveOffer {
  id: string;
  title: string;
  type: string;
  value: number;
}
interface Restaurant {
  id: string;
  slug: string;
  name: string;
  coverImage: string | null;
  cuisine: string;
  cuisineType?: string[];
  avgRating: number;
  reviewCount: number;
  priceRange: number;
  parish: string;
  distance?: number;
  isOpen?: boolean;
  offer?: string | null;
  activeOffer?: ActiveOffer | null;
}

interface RestaurantsResponse {
  data: Restaurant[];
}

// cuisineLabel is resolved inside components using getCuisineLabel(id, t)

function priceLabel(range: number): string {
  return '€'.repeat(range);
}

/* ────── HEART BUTTON ────── */

function HeartBtn({ id }: { id: string }) {
  const isFav = useFavoritesStore((s) => s.isFav(id));
  const toggle = useFavoritesStore((s) => s.toggle);
  return (
    <TouchableOpacity
      onPress={(e) => { e.stopPropagation?.(); toggle(id); }}
      hitSlop={10}
      activeOpacity={0.7}
      style={h.heartBtn}
    >
      <Ionicons
        name={isFav ? 'heart' : 'heart-outline'}
        size={22}
        color={isFav ? Colors.error : 'rgba(255,255,255,0.85)'}
      />
    </TouchableOpacity>
  );
}

/* ────── OFFER BADGE ────── */

function OfferBadge({ text }: { text: string }) {
  return (
    <View style={h.offerBadge}>
      <Ionicons name="pricetag" size={10} color={Colors.white} />
      <Text style={h.offerTxt}>{text}</Text>
    </View>
  );
}

/* ────── RATING + REVIEWS PILL ────── */

function RatingPill({ rating, count }: { rating: number; count: number }) {
  if (rating <= 0) return null;
  return (
    <View style={h.ratingPill}>
      <Ionicons name="star" size={12} color={Colors.star} />
      <Text style={h.ratingNum}>{rating.toFixed(1)}</Text>
      <Text style={h.ratingCount}>({count})</Text>
    </View>
  );
}

/* ────── OPEN / CLOSED INDICATOR ────── */

function OpenBadge({ isOpen }: { isOpen?: boolean }) {
  const { t } = useTranslation();
  if (isOpen == null) return null;
  return (
    <View style={[h.openDot, !isOpen && h.closedDot]}>
      <View style={[h.openDotInner, !isOpen && h.closedDotInner]} />
      <Text style={[h.openTxt, !isOpen && h.closedTxt]}>
        {isOpen ? t('home.status_open') : t('home.status_closed')}
      </Text>
    </View>
  );
}

/* ═══════ FEATURED CARD (huge, almost full-width) ═══════ */

function FeaturedCard({ item, index }: { item: Restaurant; index: number }) {
  const { t } = useTranslation();
  const mainCuisine = item.cuisineType?.[0] ?? item.cuisine;
  return (
    <TouchableOpacity
      style={[h.featured, index === 0 && { marginLeft: 20 }]}
      onPress={() => router.push(`/restaurant/${item.slug}`)}
      activeOpacity={0.92}
    >
      {item.coverImage ? (
        <Image source={{ uri: item.coverImage }} style={h.featuredImg} contentFit="cover" transition={250} />
      ) : (
        <View style={[h.featuredImg, h.placeholder]}>
          <Ionicons name="restaurant-outline" size={48} color={Colors.textTertiary} />
        </View>
      )}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.88)']} style={h.featuredGrad} />

      {/* Heart top-right */}
      <View style={h.featuredTopRight}>
        <HeartBtn id={item.id} />
      </View>

      {/* Offer badge top-left */}
      {item.offer && (
        <View style={h.featuredTopLeft}>
          <OfferBadge text={item.offer} />
        </View>
      )}

      {/* Distance pill */}
      {item.distance != null && (
        <View style={h.featuredDistPill}>
          <Ionicons name="navigate" size={10} color={Colors.primary} />
          <Text style={h.featuredDistTxt}>{t('home.distance_km', { value: item.distance.toFixed(1) })}</Text>
        </View>
      )}

      {/* Bottom info overlay */}
      <View style={h.featuredInfo}>
        <View style={h.featuredNameRow}>
          <Text style={h.featuredName} numberOfLines={1}>{item.name}</Text>
          <OpenBadge isOpen={item.isOpen} />
        </View>

        <View style={h.featuredMeta}>
          <RatingPill rating={item.avgRating} count={item.reviewCount} />
          <View style={h.dot} />
          <Text style={h.featuredCuisine}>{getCuisineLabel(mainCuisine, t)}</Text>
          {item.priceRange > 0 && (
            <>
              <View style={h.dot} />
              <Text style={h.featuredPrice}>{priceLabel(item.priceRange)}</Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ═══════ GRID CARD (2-col, Glovo style) ═══════ */

function GridCard({ item }: { item: Restaurant }) {
  const { t } = useTranslation();
  const mainCuisine = item.cuisineType?.[0] ?? item.cuisine;
  return (
    <TouchableOpacity
      style={h.gridCard}
      onPress={() => router.push(`/restaurant/${item.slug}`)}
      activeOpacity={0.92}
    >
      <View style={h.gridImgWrap}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={h.gridImg} contentFit="cover" transition={200} />
        ) : (
          <View style={[h.gridImg, h.placeholder]}>
            <Ionicons name="restaurant-outline" size={28} color={Colors.textTertiary} />
          </View>
        )}
        <LinearGradient colors={['rgba(0,0,0,0.1)', 'transparent', 'rgba(0,0,0,0.55)']} locations={[0, 0.35, 1]} style={h.gridGrad} />

        {/* Top: offer + heart */}
        {item.offer && (
          <View style={h.gridOfferWrap}>
            <OfferBadge text={item.offer} />
          </View>
        )}
        <View style={h.gridHeartWrap}>
          <HeartBtn id={item.id} />
        </View>

        {/* Bottom on image: rating + distance */}
        <View style={h.gridImgBottom}>
          {item.avgRating > 0 && (
            <View style={h.gridRatingWrap}>
              <Ionicons name="star" size={10} color={Colors.star} />
              <Text style={h.gridRatingTxt}>{item.avgRating.toFixed(1)}</Text>
            </View>
          )}
          {item.distance != null && (
            <View style={h.gridDistWrap}>
              <Ionicons name="navigate" size={9} color={Colors.primary} />
              <Text style={h.gridDistTxt}>{item.distance.toFixed(1)} km</Text>
            </View>
          )}
        </View>
      </View>

      {/* Minimal text bar */}
      <View style={h.gridBody}>
        <Text style={h.gridName} numberOfLines={1}>{item.name}</Text>
        <Text style={h.gridCuisine} numberOfLines={1}>{getCuisineLabel(mainCuisine, t)} · {priceLabel(item.priceRange)}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ═══════ FULL-WIDTH LIST CARD (Glovo style) ═══════ */

function ListCard({ item }: { item: Restaurant }) {
  const { t } = useTranslation();
  const mainCuisine = item.cuisineType?.[0] ?? item.cuisine;
  return (
    <TouchableOpacity
      style={h.listCard}
      onPress={() => router.push(`/restaurant/${item.slug}`)}
      activeOpacity={0.92}
    >
      {/* Big image */}
      <View style={h.listImgWrap}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={h.listImg} contentFit="cover" transition={200} />
        ) : (
          <View style={[h.listImg, h.placeholder]}>
            <Ionicons name="restaurant-outline" size={36} color={Colors.textTertiary} />
          </View>
        )}
        <LinearGradient colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.5)']} locations={[0, 0.4, 1]} style={h.listGrad} />

        {/* Top-left: offer */}
        {item.offer && (
          <View style={h.listOfferWrap}>
            <OfferBadge text={item.offer} />
          </View>
        )}

        {/* Top-right: heart */}
        <View style={h.listHeartWrap}>
          <HeartBtn id={item.id} />
        </View>

        {/* Bottom-left on image: rating pill */}
        {item.avgRating > 0 && (
          <View style={h.listImgRating}>
            <Ionicons name="star" size={11} color={Colors.star} />
            <Text style={h.listImgRatingTxt}>{item.avgRating.toFixed(1)}</Text>
            <Text style={h.listImgRatingCount}>({item.reviewCount})</Text>
          </View>
        )}

        {/* Bottom-right on image: distance */}
        {item.distance != null && (
          <View style={h.listImgDist}>
            <Ionicons name="navigate" size={10} color={Colors.primary} />
            <Text style={h.listImgDistTxt}>{item.distance.toFixed(1)} km</Text>
          </View>
        )}
      </View>

      {/* Compact bottom bar */}
      <View style={h.listBody}>
        <View style={h.listNameRow}>
          <Text style={h.listName} numberOfLines={1}>{item.name}</Text>
          <OpenBadge isOpen={item.isOpen} />
        </View>
        <View style={h.listMetaRow}>
          <Text style={h.listCuisine}>{getCuisineLabel(mainCuisine, t)}</Text>
          <View style={h.listMetaDot} />
          <Text style={h.listPrice}>{priceLabel(item.priceRange)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ═══════════ MAIN HOME SCREEN ═══════════ */

export default function HomeScreen() {
  const { t } = useTranslation();
  const { location, cityName, isGps, isLoading: locLoading, setManualLocation, refreshGps } = useLocation();
  const { cuisine, setCuisine } = useFiltersStore();
  const user = useAuthStore((s) => s.user);
  const [showLocationSheet, setShowLocationSheet] = useState(false);

  const {
    data: restaurants,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<RestaurantsResponse>({
    queryKey: ['restaurants', location.latitude, location.longitude, cuisine],
    queryFn: () => {
      const params = new URLSearchParams({
        lat: String(location.latitude),
        lon: String(location.longitude),
      });
      if (cuisine) params.append('cuisine', cuisine);
      return api(`/restaurants?${params.toString()}`);
    },
  });

  const rawAll = restaurants?.data ?? [];
  const all = rawAll.map((r) => ({
    ...r,
    offer: r.offer ?? (r.activeOffer
      ? r.activeOffer.type === 'PERCENTAGE' ? `-${r.activeOffer.value}%`
        : r.activeOffer.type === 'FIXED_AMOUNT' ? `-${r.activeOffer.value}€`
        : r.activeOffer.title
      : null),
  }));
  const nearby = all.filter((r) => r.distance != null && r.distance < 5).slice(0, 6);
  const topRated = [...all].sort((a, b) => b.avgRating - a.avgRating).slice(0, 6);

  const renderHeader = useCallback(
    () => (
      <View>
        {/* ─── HEADER: logo | ubicación | perfil ─── */}
        <View style={h.header}>
          <Text style={h.brand}>taula</Text>
          <TouchableOpacity
            style={h.locHeaderBtn}
            activeOpacity={0.7}
            onPress={() => setShowLocationSheet(true)}
          >
            <Ionicons name={isGps ? 'navigate' : 'location'} size={15} color={Colors.primary} />
            <Text style={h.locHeaderCity} numberOfLines={1}>{cityName}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (user ? router.push('/(tabs)/profile') : router.push('/(auth)/login'))}
            activeOpacity={0.7}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={h.avatar} />
            ) : (
              <View style={h.avatarPlaceholder}>
                <Ionicons name="person" size={18} color={Colors.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── SEARCH BAR ─── */}
        <TouchableOpacity style={h.search} onPress={() => router.push('/search')} activeOpacity={0.8}>
          <Ionicons name="search" size={20} color={Colors.primary} />
          <Text style={h.searchTxt}>{t('home.search_placeholder')}</Text>
        </TouchableOpacity>

        {/* ─── CATEGORY CIRCLES ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={h.catScroll}
        >
          {CUISINE_TYPES.map((cat) => {
            const active = cuisine === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={h.catItem}
                onPress={() => setCuisine(active ? null : cat.id)}
                activeOpacity={0.7}
              >
                <View style={[h.catCircle, active && h.catCircleActive]}>
                  <Text style={h.catEmoji}>{cat.emoji}</Text>
                </View>
                <Text style={[h.catLabel, active && h.catLabelActive]} numberOfLines={1}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── POPULAR NEAR YOU ─── */}
        {nearby.length > 0 && (
          <View style={h.sectionWrap}>
            <View style={h.sectionRow}>
              <Text style={h.sectionTitle}>{t('home.nearby')}</Text>
              <TouchableOpacity onPress={() => router.push('/list?sort=nearby')}>
                <Text style={h.seeAll}>{t('common.see_all')} →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={nearby}
              keyExtractor={(r) => r.id + '-f'}
              renderItem={({ item, index }) => <FeaturedCard item={item} index={index} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
              snapToInterval={FEATURED_W + 12}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* ─── TOP RATED ─── */}
        {topRated.length > 0 && (
          <View style={h.sectionWrap}>
            <View style={h.sectionRow}>
              <Text style={h.sectionTitle}>{t('home.top_rated')}</Text>
              <TouchableOpacity onPress={() => router.push('/list?sort=top_rated')}>
                <Text style={h.seeAll}>{t('common.see_all')} →</Text>
              </TouchableOpacity>
            </View>
            <View style={h.grid}>
              {topRated.slice(0, 4).map((item) => (
                <GridCard key={item.id} item={item} />
              ))}
            </View>
          </View>
        )}

        {/* ─── ALL RESTAURANTS HEADER ─── */}
        {all.length > 0 && (
          <View style={h.allHeader}>
            <View style={h.allLine} />
            <Text style={h.allTitle}>{t('home.all_restaurants')}</Text>
            <View style={h.allLine} />
          </View>
        )}
      </View>
    ),
    [t, nearby, topRated, all.length, cuisine, user, cityName, isGps],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={h.safe}>
        <View style={h.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={h.safe}>
        <View style={h.center}>
          <View style={h.errorWrap}>
            <Ionicons name="cloud-offline-outline" size={40} color={Colors.textTertiary} />
          </View>
          <Text style={h.errorTxt}>{t('common.error')}</Text>
          <TouchableOpacity style={h.retryBtn} onPress={() => refetch()}>
            <Text style={h.retryTxt}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={h.safe} edges={['top']}>
      <FlatList
        data={all}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <ListCard item={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={h.empty}>
            <Ionicons name="restaurant-outline" size={52} color={Colors.textTertiary} />
            <Text style={h.emptyTxt}>{t('home.no_results')}</Text>
          </View>
        }
        contentContainerStyle={h.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.surface}
          />
        }
      />
      <LocationSheet
        visible={showLocationSheet}
        onClose={() => setShowLocationSheet(false)}
        currentCity={cityName}
        isGps={isGps}
        gpsLoading={locLoading}
        onSelectGps={() => {
          refreshGps();
        }}
        onSelectParish={(p) => {
          setManualLocation({ latitude: p.latitude, longitude: p.longitude }, p.name);
        }}
      />
    </SafeAreaView>
  );
}

/* ═══════════ STYLES ═══════════ */

const h = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  list: { paddingBottom: 32 },

  /* ── HEADER ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 10,
  },
  brand: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1.5,
    flexShrink: 0,
  },
  locHeaderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locHeaderCity: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexShrink: 0,
  },

  /* ── SEARCH ── */
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    marginHorizontal: 20,
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 18,
  },
  searchTxt: {
    flex: 1,
    fontSize: 14,
    color: Colors.textTertiary,
  },

  /* ── CATEGORIES ── */
  catScroll: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 24,
  },
  catItem: {
    alignItems: 'center',
    width: CAT_SIZE + 8,
  },
  catCircle: {
    width: CAT_SIZE,
    height: CAT_SIZE,
    borderRadius: CAT_SIZE / 2,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catCircleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  catEmoji: { fontSize: 28 },
  catLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  catLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  /* ── SECTIONS ── */
  sectionWrap: { marginBottom: 28 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  /* ── SHARED SMALL COMPONENTS ── */
  heartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  offerTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.white,
    textTransform: 'uppercase',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  ratingCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  openDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  closedDot: {},
  openDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  closedDotInner: {
    backgroundColor: Colors.error,
  },
  openTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  closedTxt: {
    color: Colors.error,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ═══ FEATURED CARD ═══ */
  featured: {
    width: FEATURED_W,
    height: 230,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: Colors.surface,
  },
  featuredImg: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceSecondary,
  },
  featuredGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  featuredTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  featuredTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  featuredDistPill: {
    position: 'absolute',
    top: 54,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  featuredDistTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  featuredInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  featuredNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  featuredName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
    marginRight: 8,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredCuisine: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  featuredPrice: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },

  /* ═══ GRID CARD ═══ */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: GRID_GAP,
  },
  gridCard: {
    width: GRID_CARD_W,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gridImgWrap: {
    position: 'relative',
    width: '100%',
    height: 130,
  },
  gridImg: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceSecondary,
  },
  gridGrad: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridHeartWrap: {
    position: 'absolute',
    top: 7,
    right: 7,
  },
  gridOfferWrap: {
    position: 'absolute',
    top: 7,
    left: 7,
  },
  gridImgBottom: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    right: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  gridRatingTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
  },
  gridDistWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  gridDistTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  gridBody: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  gridName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  gridCuisine: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  /* ═══ ALL RESTAURANTS DIVIDER ═══ */
  allHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 14,
  },
  allLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  allTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  /* ═══ LIST CARD (Glovo-style) ═══ */
  listCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listImgWrap: {
    position: 'relative',
    width: '100%',
    height: 170,
  },
  listImg: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceSecondary,
  },
  listGrad: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  listOfferWrap: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  listHeartWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  listImgRating: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  listImgRatingTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  listImgRatingCount: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  listImgDist: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  listImgDistTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  listBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  listNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  listName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  listCuisine: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  listMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
  },
  listPrice: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '600',
  },

  /* ── EMPTY / ERROR ── */
  empty: {
    alignItems: 'center',
    paddingVertical: 56,
    gap: 14,
  },
  emptyTxt: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
  errorWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTxt: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  retryTxt: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 15,
  },
});
