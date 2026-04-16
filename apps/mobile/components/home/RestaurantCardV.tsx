import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import type { Restaurant } from './RestaurantCardH';

interface RestaurantCardVProps {
  restaurant: Restaurant;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function renderPrice(range?: number): string {
  if (!range) return '';
  return '€'.repeat(range);
}

export default function RestaurantCardV({ restaurant }: RestaurantCardVProps) {
  const router = useRouter();

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/restaurant/${restaurant.slug}`)}
    >
      <Image
        source={{ uri: restaurant.imageUrl ?? undefined }}
        style={styles.image}
        contentFit="cover"
        placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
        transition={200}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.name}
        </Text>

        <View style={styles.cuisineRow}>
          {restaurant.cuisineType.slice(0, 2).map((c) => (
            <Text key={c} style={styles.cuisineText}>
              {c}
            </Text>
          ))}
          {restaurant.priceRange ? (
            <Text style={styles.price}>{renderPrice(restaurant.priceRange)}</Text>
          ) : null}
        </View>

        <View style={styles.ratingRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons
              key={i}
              name={i < Math.round(restaurant.rating) ? 'star' : 'star-outline'}
              size={13}
              color={Colors.star}
            />
          ))}
          <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({restaurant.reviewCount})</Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.parishRow}>
            <Ionicons name="location-outline" size={12} color={Colors.textTertiary} />
            <Text style={styles.parish} numberOfLines={1}>
              {restaurant.parish}
            </Text>
          </View>
          {restaurant.distance != null && (
            <Text style={styles.distance}>{formatDistance(restaurant.distance)}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: 100,
    height: 100,
  },
  info: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  cuisineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cuisineText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  price: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  parishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  parish: {
    fontSize: 12,
    color: Colors.textTertiary,
    maxWidth: 120,
  },
  distance: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
});
