import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';

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
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.name}
        </Text>

        {restaurant.cuisineType.length > 0 && (
          <View style={styles.cuisineRow}>
            {restaurant.cuisineType.slice(0, 2).map((c) => (
              <View key={c} style={styles.cuisineBadge}>
                <Text style={styles.cuisineText}>{c}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomRow}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={Colors.star} />
            <Text style={styles.rating}>{restaurant.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({restaurant.reviewCount})</Text>
          </View>
          <Text style={styles.parish} numberOfLines={1}>
            {restaurant.parish}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 130,
  },
  body: {
    padding: 10,
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
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  reviewCount: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  parish: {
    fontSize: 11,
    color: Colors.textTertiary,
    maxWidth: 80,
  },
});
