import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';

interface RestaurantHeroProps {
  imageUrl: string | null;
  name: string;
  parish: string;
  onShare?: () => void;
}

export default function RestaurantHero({
  imageUrl,
  name,
  parish,
  onShare,
}: RestaurantHeroProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: imageUrl ?? undefined }}
        style={styles.image}
        contentFit="cover"
        transition={300}
      />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.gradient}
      />

      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={Colors.white} />
      </Pressable>

      {onShare && (
        <Pressable style={styles.shareBtn} onPress={onShare}>
          <Ionicons name="share-outline" size={22} color={Colors.white} />
        </Pressable>
      )}

      <View style={styles.textOverlay}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.parishRow}>
          <Ionicons name="location-sharp" size={14} color={Colors.primaryLight} />
          <Text style={styles.parish}>{parish}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
  },
  parishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  parish: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
});
