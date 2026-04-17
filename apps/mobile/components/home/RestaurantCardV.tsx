import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { CUISINE_TYPES } from '@/constants/andorra';
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
          {restaurant.cuisineType.slice(0, 2).map((c) => {
            const match = CUISINE_TYPES.find((ct) => ct.id === c);
            return (
              <Text key={c} style={styles.cuisineText}>
                {match ? match.label : c}
              </Text>
            );
          })}
          {restaurant.priceRange ? (
            <Text style={styles.price}>{renderPrice(restaurant.priceRange)}</Text>
          ) : null}
        </View>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={13} color={Colors.star} />
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
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: 100,
    height: 100,
    backgroundColor: Colors.surfaceSecondary,
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
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.star,
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
    color: Colors.accent,
    fontWeight: '600',
  },
});
