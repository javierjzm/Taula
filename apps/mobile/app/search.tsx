import { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { PARISHES } from '@/constants/andorra';
import { api } from '@/services/api';
import type { RestaurantListItem, PaginatedResponse } from '@taula/shared';

const RECENT_KEY = 'taula_recent_searches';
const MAX_RECENT = 8;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function RestaurantCardV({
  item,
  onPress,
}: {
  item: RestaurantListItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {item.coverImage ? (
        <Image
          source={{ uri: item.coverImage }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Ionicons name="restaurant-outline" size={32} color={Colors.textTertiary} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.cardMeta}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={Colors.star} />
            <Text style={styles.ratingText}>{item.avgRating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount})</Text>
          </View>
          <Text style={styles.priceText}>
            {'€'.repeat(item.priceRange)}
            <Text style={{ color: Colors.border }}>{'€'.repeat(4 - item.priceRange)}</Text>
          </Text>
        </View>
        <View style={styles.cardChips}>
          {item.cuisineType.slice(0, 2).map((c) => (
            <View key={c} style={styles.cuisineChip}>
              <Text style={styles.cuisineChipText}>{c}</Text>
            </View>
          ))}
          <Text style={styles.parishText}>
            {item.parish.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [parish, setParish] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query.trim(), 300);

  useEffect(() => {
    loadRecent();
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const loadRecent = async () => {
    try {
      const raw = await SecureStore.getItemAsync(RECENT_KEY);
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch {
      /* noop */
    }
  };

  const saveRecent = async (term: string) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    await SecureStore.setItemAsync(RECENT_KEY, JSON.stringify(updated));
  };

  const clearRecent = async () => {
    setRecentSearches([]);
    await SecureStore.deleteItemAsync(RECENT_KEY);
  };

  const buildParams = () => {
    const p = new URLSearchParams();
    if (debouncedQuery) p.set('q', debouncedQuery);
    if (parish) p.set('parish', parish);
    p.set('limit', '20');
    return p.toString();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, parish],
    queryFn: () =>
      api<PaginatedResponse<RestaurantListItem>>(`/restaurants?${buildParams()}`),
    enabled: debouncedQuery.length >= 2,
  });

  const results = data?.data ?? [];

  const handleResultPress = (item: RestaurantListItem) => {
    if (debouncedQuery) saveRecent(debouncedQuery);
    router.push(`/restaurant/${item.slug}`);
  };

  const showRecent = !debouncedQuery && recentSearches.length > 0;
  const showEmpty = !debouncedQuery && recentSearches.length === 0;
  const showNoResults = debouncedQuery.length >= 2 && !isLoading && results.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={Colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('home.search_placeholder')}
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContainer}
      >
        <TouchableOpacity
          style={[styles.chip, !parish && styles.chipActive]}
          onPress={() => setParish(null)}
        >
          <Text style={[styles.chipText, !parish && styles.chipTextActive]}>
            {t('search.all_parishes')}
          </Text>
        </TouchableOpacity>
        {PARISHES.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.chip, parish === p.id && styles.chipActive]}
            onPress={() => setParish(parish === p.id ? null : p.id)}
          >
            <Text style={[styles.chipText, parish === p.id && styles.chipTextActive]}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && debouncedQuery.length >= 2 && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {showEmpty && (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyText}>{t('search.start_typing')}</Text>
        </View>
      )}

      {showRecent && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>{t('search.recent')}</Text>
            <TouchableOpacity onPress={clearRecent}>
              <Text style={styles.clearText}>{t('search.clear')}</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((term, i) => (
            <TouchableOpacity
              key={`${term}-${i}`}
              style={styles.recentItem}
              onPress={() => setQuery(term)}
            >
              <Ionicons name="time-outline" size={18} color={Colors.textTertiary} />
              <Text style={styles.recentText}>{term}</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showNoResults && (
        <View style={styles.center}>
          <Ionicons name="restaurant-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyText}>{t('search.no_results')}</Text>
        </View>
      )}

      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RestaurantCardV item={item} onPress={() => handleResultPress(item)} />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  chipsScroll: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 52,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: Colors.white,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  recentSection: {
    padding: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  clearText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  recentText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  reviewCount: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  cardChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  cuisineChip: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cuisineChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  parishText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
