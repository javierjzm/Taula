import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { CUISINE_TYPES } from '@/constants/andorra';

interface CategoryBarProps {
  selected: string | null;
  onSelect: (cuisineId: string | null) => void;
}

export default function CategoryBar({ selected, onSelect }: CategoryBarProps) {
  const handlePress = (id: string) => {
    onSelect(selected === id ? null : id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {CUISINE_TYPES.map((cuisine) => {
        const isActive = selected === cuisine.id;
        return (
          <Pressable
            key={cuisine.id}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => handlePress(cuisine.id)}
          >
            <Text style={styles.emoji}>{cuisine.emoji}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {cuisine.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  labelActive: {
    color: Colors.white,
  },
});
