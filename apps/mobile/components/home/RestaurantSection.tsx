import React from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import RestaurantCardH, { type Restaurant } from './RestaurantCardH';

interface RestaurantSectionProps {
  title: string;
  icon?: string;
  restaurants: Restaurant[];
  loading?: boolean;
  seeAllHref?: string;
}

export default function RestaurantSection({
  title,
  icon,
  restaurants,
  loading = false,
  seeAllHref,
}: RestaurantSectionProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon && <Ionicons name={icon as any} size={18} color={Colors.primary} />}
          <Text style={styles.title}>{title}</Text>
        </View>
        {seeAllHref && (
          <Pressable onPress={() => router.push(seeAllHref as any)}>
            <Text style={styles.seeAll}>Ver todo</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <RestaurantCardH restaurant={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
  },
  separator: {
    width: 12,
  },
});
