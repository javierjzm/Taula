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
          <Ionicons name="location-sharp" size={14} color={Colors.primary} />
          <Text style={styles.parish} numberOfLines={1}>
            {displayParish}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
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
              color={isAuthenticated ? Colors.white : Colors.textSecondary}
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
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
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
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
