import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CUISINE_TYPES, getCuisineLabel } from '@/constants/andorra';
import { Colors } from '@/constants/colors';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useLocation } from '@/hooks/useLocation';
import { api } from '@/services/api';

type SortMode = 'nearby' | 'top_rated';

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
  featured?: boolean;
  plan?: 'RESERVATIONS' | 'LISTING_BASIC' | 'LISTING_FEATURED' | null;
  externalReservationUrl?: string | null;
}

// cuisineLabel resolved inside RestaurantRow with getCuisineLabel(id, t)

function RestaurantRow({ item }: { item: Restaurant }) {
  const { t } = useTranslation();
  const isFav = useFavoritesStore((s) => s.isFav(item.id));
  const toggle = useFavoritesStore((s) => s.toggle);
  const mainCuisine = item.cuisineType?.[0] ?? item.cuisine;

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push(`/restaurant/${item.slug}`)}
      activeOpacity={0.88}
    >
      <View style={s.imgWrap}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={s.img} contentFit="cover" transition={200} />
        ) : (
          <View style={[s.img, s.imgPlaceholder]}>
            <Ionicons name="restaurant-outline" size={28} color={Colors.textTertiary} />
          </View>
        )}
        {item.featured && (
          <View style={s.featuredBadge}>
            <Ionicons name="star" size={10} color={Colors.textInverse} />
            <Text style={s.featuredBadgeTxt}>Destacado</Text>
          </View>
        )}
        {item.isOpen != null && (
          <View style={[s.statusBadge, !item.isOpen && s.statusClosed]}>
            <View style={[s.statusDot, !item.isOpen && s.statusDotClosed]} />
          </View>
        )}
      </View>

      <View style={s.body}>
        <View style={s.titleRow}>
          <Text style={s.name} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity onPress={() => toggle(item.id)} hitSlop={10}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? Colors.error : Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text style={s.cuisine} numberOfLines={1}>{getCuisineLabel(mainCuisine, t)}</Text>

        <View style={s.metaRow}>
          <View style={s.ratingRow}>
            <Ionicons name="star" size={13} color={Colors.star} />
            <Text style={s.ratingTxt}>{item.avgRating.toFixed(1)}</Text>
            <Text style={s.reviewsTxt}>({item.reviewCount})</Text>
          </View>
          <Text style={s.price}>{'€'.repeat(item.priceRange)}</Text>
          {item.distance != null && (
            <View style={s.distRow}>
              <Ionicons name="location-outline" size={12} color={Colors.primary} />
              <Text style={s.distTxt}>{t('home.distance_km', { value: item.distance.toFixed(1) })}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ListScreen() {
  const { sort, featured } = useLocalSearchParams<{ sort?: string; featured?: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { location } = useLocation();

  const onlyFeatured = featured === '1' || featured === 'true';
  const mode: SortMode = sort === 'top_rated' ? 'top_rated' : 'nearby';
  const title = onlyFeatured
    ? 'Destacados'
    : t(mode === 'nearby' ? 'list.nearby' : 'list.top_rated');

  const { data, isLoading } = useQuery({
    queryKey: ['list', mode, onlyFeatured, location.latitude, location.longitude],
    queryFn: () => {
      const params = new URLSearchParams({
        lat: String(location.latitude),
        lon: String(location.longitude),
        limit: '40',
      });
      if (mode === 'top_rated') params.set('sort', 'rating');
      return api<{ data: Restaurant[] }>(`/restaurants?${params.toString()}`);
    },
  });

  const rawList = data?.data ?? [];
  const filtered = onlyFeatured ? rawList.filter((r) => r.featured) : rawList;

  const sorted = (() => {
    const base =
      mode === 'nearby'
        ? [...filtered].sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
        : [...filtered].sort(
            (a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount,
          );
    return base.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  })();

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : sorted.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="restaurant-outline" size={48} color={Colors.textTertiary} />
          <Text style={s.emptyTxt}>{t('list.no_results')}</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <RestaurantRow item={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTxt: { fontSize: 15, color: Colors.textTertiary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },

  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imgWrap: { position: 'relative' },
  img: { width: 105, height: 105, backgroundColor: Colors.surfaceSecondary },
  imgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(52,211,153,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusClosed: { backgroundColor: 'rgba(248,113,113,0.2)' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  statusDotClosed: { backgroundColor: Colors.error },
  featuredBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredBadgeTxt: { fontSize: 9, fontWeight: '800', color: Colors.textInverse, textTransform: 'uppercase' },

  body: { flex: 1, padding: 12, gap: 4, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  cuisine: { fontSize: 12, color: Colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingTxt: { fontSize: 13, fontWeight: '700', color: Colors.star },
  reviewsTxt: { fontSize: 11, color: Colors.textTertiary },
  price: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  distTxt: { fontSize: 11, fontWeight: '600', color: Colors.primary },
});
