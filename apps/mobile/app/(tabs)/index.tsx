import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { CUISINE_TYPES } from '@/constants/andorra';
import { useFiltersStore } from '@/stores/filtersStore';
import { useAuthStore } from '@/stores/authStore';
import { useLocation } from '@/hooks/useLocation';
import { api } from '@/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_H_WIDTH = SCREEN_WIDTH * 0.7;

interface Restaurant {
  id: string;
  name: string;
  coverImage: string | null;
  cuisine: string;
  avgRating: number;
  reviewCount: number;
  priceRange: number;
  parish: string;
  distance?: number;
  isOpen?: boolean;
}

interface RestaurantsResponse {
  data: Restaurant[];
}

function HomeHeader() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const parish = useFiltersStore((s) => s.parish);

  return (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        <Text style={styles.greeting}>{t('home.greeting')}</Text>
        {parish && <Text style={styles.parish}>{parish}</Text>}
      </View>
      <TouchableOpacity
        onPress={() => (user ? router.push('/(tabs)/profile') : router.push('/(auth)/login'))}
        activeOpacity={0.7}
      >
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={20} color={Colors.textTertiary} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SearchBar() {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.searchBar}
      onPress={() => router.push('/search')}
      activeOpacity={0.8}
    >
      <Ionicons name="search" size={20} color={Colors.textTertiary} />
      <Text style={styles.searchText}>{t('home.search_placeholder')}</Text>
    </TouchableOpacity>
  );
}

function CategoryBar() {
  const { cuisine, setCuisine } = useFiltersStore();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryList}
    >
      {CUISINE_TYPES.map((cat) => {
        const isActive = cuisine === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, isActive && styles.categoryChipActive]}
            onPress={() => setCuisine(isActive ? null : cat.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function RestaurantCardH({ item }: { item: Restaurant }) {
  return (
    <TouchableOpacity
      style={styles.cardH}
      onPress={() => router.push(`/restaurant/${item.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHImageWrap}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.cardHImage} />
        ) : (
          <View style={[styles.cardHImage, styles.cardHImagePlaceholder]}>
            <Ionicons name="restaurant-outline" size={32} color={Colors.textTertiary} />
          </View>
        )}
        {item.isOpen !== undefined && (
          <View style={[styles.openBadge, item.isOpen ? styles.openBadgeOpen : styles.openBadgeClosed]}>
            <View style={[styles.openDot, { backgroundColor: item.isOpen ? Colors.success : Colors.error }]} />
          </View>
        )}
      </View>
      <View style={styles.cardHBody}>
        <Text style={styles.cardHName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardHCuisine} numberOfLines={1}>{item.cuisine}</Text>
        <View style={styles.cardHFooter}>
          <Ionicons name="star" size={14} color={Colors.star} />
          <Text style={styles.cardHRating}>{item.avgRating.toFixed(1)}</Text>
          <Text style={styles.cardHReviews}>({item.reviewCount})</Text>
          {item.distance != null && (
            <>
              <Text style={styles.cardHDot}>&middot;</Text>
              <Text style={styles.cardHDistance}>{item.distance.toFixed(1)} km</Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function RestaurantCardV({ item }: { item: Restaurant }) {
  return (
    <TouchableOpacity
      style={styles.cardV}
      onPress={() => router.push(`/restaurant/${item.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.cardVImageWrap}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.cardVImage} />
        ) : (
          <View style={[styles.cardVImage, styles.cardHImagePlaceholder]}>
            <Ionicons name="restaurant-outline" size={28} color={Colors.textTertiary} />
          </View>
        )}
      </View>
      <View style={styles.cardVBody}>
        <Text style={styles.cardVName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardVCuisine} numberOfLines={1}>{item.cuisine}</Text>
        <View style={styles.cardVMeta}>
          <Ionicons name="star" size={13} color={Colors.star} />
          <Text style={styles.cardVRating}>{item.avgRating.toFixed(1)}</Text>
          <Text style={styles.cardVReviews}>({item.reviewCount})</Text>
          {item.distance != null && (
            <>
              <Text style={styles.cardHDot}>&middot;</Text>
              <Text style={styles.cardVDistance}>{item.distance.toFixed(1)} km</Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

function RestaurantSection({
  title,
  data,
}: {
  title: string;
  data: Restaurant[];
}) {
  const { t } = useTranslation();
  if (!data.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>{t('common.see_all')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <RestaurantCardH item={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionList}
      />
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { location } = useLocation();
  const cuisine = useFiltersStore((s) => s.cuisine);

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
        lng: String(location.longitude),
      });
      if (cuisine) params.append('cuisine', cuisine);
      return api(`/restaurants?${params.toString()}`);
    },
  });

  const all = restaurants?.data ?? [];
  const nearby = all.filter((r) => r.distance != null && r.distance < 5).slice(0, 10);
  const topRated = [...all].sort((a, b) => b.avgRating - a.avgRating).slice(0, 10);
  const openNow = all.filter((r) => r.isOpen).slice(0, 10);

  const renderHeader = useCallback(
    () => (
      <View>
        <HomeHeader />
        <SearchBar />
        <CategoryBar />
        <RestaurantSection title={t('home.nearby')} data={nearby} />
        <RestaurantSection title={t('home.top_rated')} data={topRated} />
        <RestaurantSection title={t('home.open_now')} data={openNow} />
        {all.length > 0 && (
          <Text style={styles.allTitle}>{t('home.all_restaurants')}</Text>
        )}
      </View>
    ),
    [t, nearby, topRated, openNow, all.length],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={all}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <RestaurantCardV item={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('home.no_results')}</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  list: {
    paddingBottom: 24,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  parish: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    marginBottom: 16,
  },
  searchText: {
    fontSize: 15,
    color: Colors.textTertiary,
  },

  // Category bar
  categoryList: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryLabelActive: {
    color: Colors.white,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  sectionList: {
    paddingHorizontal: 20,
    gap: 12,
  },

  // Horizontal card
  cardH: {
    width: CARD_H_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHImageWrap: {
    position: 'relative',
  },
  cardHImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.surfaceSecondary,
  },
  cardHImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  openBadgeOpen: {},
  openBadgeClosed: {},
  openDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardHBody: {
    padding: 12,
  },
  cardHName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  cardHCuisine: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardHFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  cardHRating: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  cardHReviews: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  cardHDot: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginHorizontal: 2,
  },
  cardHDistance: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Vertical card
  cardV: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardVImageWrap: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardVImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardVBody: {
    flex: 1,
    marginLeft: 12,
  },
  cardVName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  cardVCuisine: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardVMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  cardVRating: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  cardVReviews: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  cardVDistance: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // All restaurants
  allTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 14,
  },

  // Empty / Error
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
  errorText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  retryText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
