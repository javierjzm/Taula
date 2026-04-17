import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';

interface HomeHeaderProps {
  parishName?: string;
}

export default function HomeHeader({ parishName }: HomeHeaderProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const displayParish = parishName || 'Andorra';

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.logo}>taula</Text>
        <View style={styles.locationRow}>
          <View style={styles.locationDot} />
          <Text style={styles.parish} numberOfLines={1}>
            {displayParish}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Colors.textTertiary} />
        </View>
      </View>

      <Pressable
        style={styles.avatarBtn}
        onPress={() => router.push(isAuthenticated ? '/profile' : '/login')}
      >
        {isAuthenticated && user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons
              name={isAuthenticated ? 'person' : 'log-in-outline'}
              size={20}
              color={Colors.textSecondary}
            />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  left: {
    flex: 1,
  },
  logo: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  parish: {
    fontSize: 13,
    color: Colors.textSecondary,
    maxWidth: 160,
  },
  avatarBtn: {
    marginLeft: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
});
