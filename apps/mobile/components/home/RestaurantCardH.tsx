import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useTranslation } from 'react-i18next';
import { getCuisineLabel } from '@/constants/andorra';

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  cuisineType: string[];
  rating: number;
  reviewCount: number;
  parish: string;
  priceRange?: number;
  distance?: number;
}

interface RestaurantCardHProps {
  restaurant: Restaurant;
}

export default function RestaurantCardH({ restaurant }: RestaurantCardHProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/restaurant/${restaurant.slug}`)}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: restaurant.imageUrl ?? undefined }}
          style={styles.image}
          contentFit="cover"
          placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
          transition={200}
        />
        {restaurant.rating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={11} color={Colors.star} />
            <Text style={styles.ratingBadgeText}>{restaurant.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.name}
        </Text>

        {restaurant.cuisineType.length > 0 && (
          <View style={styles.cuisineRow}>
            {restaurant.cuisineType.slice(0, 2).map((c) => {
              return (
                <View key={c} style={styles.cuisineBadge}>
                  <Text style={styles.cuisineText}>{getCuisineLabel(c, t)}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomRow}>
          <Text style={styles.parish} numberOfLines={1}>
            {restaurant.parish}
          </Text>
          {restaurant.distance != null && (
            <Text style={styles.distance}>
              {restaurant.distance < 1
                ? `${Math.round(restaurant.distance * 1000)} m`
                : `${restaurant.distance.toFixed(1)} km`}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.surfaceSecondary,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  body: {
    padding: 12,
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  cuisineRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cuisineBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cuisineText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  parish: {
    fontSize: 11,
    color: Colors.textTertiary,
    maxWidth: 100,
  },
  distance: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '600',
  },
});
