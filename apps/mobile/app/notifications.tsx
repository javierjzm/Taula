import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Colors } from '@/constants/colors';
import { api, apiRestaurant } from '@/services/api';
import { useModeStore } from '@/stores/modeStore';

interface NotifItem {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: {
    deepLink?: string;
    reservationId?: string;
    slug?: string;
    [key: string]: unknown;
  } | null;
}

interface NotifResponse {
  data: NotifItem[];
  meta: { total: number; unread: number; nextCursor: string | null };
}

export default function NotificationsScreen() {
  const mode = useModeStore((s) => s.mode);
  const isRestaurant = mode === 'restaurant';

  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const path = isRestaurant ? '/notifications/restaurant' : '/notifications';
        const fetcher = isRestaurant ? apiRestaurant : api;
        const res = await fetcher<NotifResponse>(path);
        setItems(res.data ?? []);
        setUnread(res.meta?.unread ?? 0);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isRestaurant],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchData(true);
  }, [fetchData]);

  const markAllRead = useCallback(async () => {
    try {
      const path = isRestaurant ? '/notifications/restaurant/read-all' : '/notifications/read-all';
      const fetcher = isRestaurant ? apiRestaurant : api;
      await fetcher(path, { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* noop */ }
  }, [isRestaurant]);

  const markRead = useCallback(
    async (id: string) => {
      const path = isRestaurant
        ? `/notifications/restaurant/${id}/read`
        : `/notifications/${id}/read`;
      const fetcher = isRestaurant ? apiRestaurant : api;
      try {
        await fetcher(path, { method: 'PATCH' });
      } catch { /* noop */ }
    },
    [isRestaurant],
  );

  const handlePress = useCallback(
    (notif: NotifItem) => {
      if (!notif.read) {
        setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
        setUnread((u) => Math.max(0, u - 1));
        void markRead(notif.id);
      }
      const link = notif.data?.deepLink;
      if (typeof link === 'string' && link.startsWith('/')) {
        router.push(link as never);
      } else if (notif.data?.slug) {
        router.push(`/restaurant/${notif.data.slug}`);
      }
    },
    [markRead],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>Notificaciones</Text>
          {unread > 0 && <Text style={styles.subtitle}>{unread} sin leer</Text>}
        </View>
        <TouchableOpacity onPress={markAllRead} style={styles.iconBtn} disabled={unread === 0}>
          <Ionicons
            name="checkmark-done"
            size={20}
            color={unread === 0 ? Colors.textTertiary : Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.empty}>Sin notificaciones todavía</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handlePress(item)}
              style={[styles.row, !item.read && styles.rowUnread]}
              activeOpacity={0.85}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={iconForType(item.type)} size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowBody} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function iconForType(type: string): keyof typeof Ionicons.glyphMap {
  if (type.startsWith('reservation')) return 'calendar-outline';
  if (type.startsWith('reminder')) return 'alarm-outline';
  if (type === 'review_new' || type === 'review_reply') return 'star-outline';
  if (type === 'review_reminder') return 'create-outline';
  if (type === 'plan' || type === 'plan_alert') return 'card-outline';
  if (type.startsWith('noshow')) return 'warning-outline';
  return 'notifications-outline';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} d`;
  return d.toLocaleDateString();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 16, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  empty: { color: Colors.textTertiary, fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowUnread: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow ?? Colors.surface },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  rowBody: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  rowDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
});
