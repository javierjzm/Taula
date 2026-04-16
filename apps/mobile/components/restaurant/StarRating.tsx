import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface StarRatingProps {
  rating: number;
  size?: number;
  showCount?: boolean;
  count?: number;
}

export default function StarRating({
  rating,
  size = 16,
  showCount = false,
  count,
}: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const diff = rating - i;
    if (diff >= 0.75) return 'star';
    if (diff >= 0.25) return 'star-half';
    return 'star-outline';
  });

  return (
    <View style={styles.container}>
      {stars.map((icon, i) => (
        <Ionicons key={i} name={icon} size={size} color={Colors.star} />
      ))}
      {showCount && count != null && (
        <Text style={[styles.count, { fontSize: size * 0.75 }]}>({count})</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  count: {
    color: Colors.textTertiary,
    marginLeft: 4,
  },
});
