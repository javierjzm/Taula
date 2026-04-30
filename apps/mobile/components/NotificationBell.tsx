import { useEffect, useState, useCallback } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { api, apiRestaurant } from '@/services/api';
import { useModeStore } from '@/stores/modeStore';
import { useAuthStore } from '@/stores/authStore';

interface NotificationBellProps {
  /** Forzar el scope (por defecto se usa el modo actual). */
  scope?: 'user' | 'restaurant';
  color?: string;
  size?: number;
}

export default function NotificationBell({ scope, color, size = 22 }: NotificationBellProps) {
  const mode = useModeStore((s) => s.mode);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const effectiveScope: 'user' | 'restaurant' = scope ?? (mode === 'restaurant' ? 'restaurant' : 'user');
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setUnread(0);
      return;
    }
    try {
      const path = effectiveScope === 'restaurant' ? '/notifications/restaurant' : '/notifications';
      const fetcher = effectiveScope === 'restaurant' ? apiRestaurant : api;
      const res = await fetcher<{ meta?: { unread?: number } }>(path);
      setUnread(res.meta?.unread ?? 0);
    } catch {
      setUnread(0);
    }
  }, [effectiveScope, isAuthenticated]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => router.push('/notifications')}
      hitSlop={10}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications-outline" size={size} color={color ?? Colors.text} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{unread > 9 ? '9+' : String(unread)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: { color: Colors.white, fontSize: 10, fontWeight: '800' },
});
