import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SectionList,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import type { Reservation, ApiResponse } from '@taula/shared';

interface ReservationsResponse {
  data: Reservation[];
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  CONFIRMED: { bg: Colors.successLight, text: Colors.success, icon: 'checkmark-circle' },
  ARRIVED: { bg: Colors.accentLight, text: Colors.accent, icon: 'restaurant' },
  NO_SHOW: { bg: Colors.warningLight, text: Colors.warning, icon: 'alert-circle' },
  CANCELLED_USER: { bg: Colors.errorLight, text: Colors.error, icon: 'close-circle' },
  CANCELLED_RESTAURANT: { bg: Colors.errorLight, text: Colors.error, icon: 'close-circle' },
};

function LoginPrompt() {
  const { t } = useTranslation();

  return (
    <View style={styles.center}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
      </View>
      <Text style={styles.promptTitle}>{t('reservations.login_prompt')}</Text>
      <TouchableOpacity
        style={styles.loginBtn}
        onPress={() => router.push('/(auth)/login')}
        activeOpacity={0.8}
      >
        <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function safeParse(dateStr: string): Date {
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
}

function ReservationCard({ item }: { item: Reservation }) {
  const { t } = useTranslation();
  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.CONFIRMED;
  const d = safeParse(item.date);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/reservation/${item.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.cardLeft}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{format(d, 'dd')}</Text>
          <Text style={styles.dateMonth}>{format(d, 'MMM')}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.restaurantName}</Text>
        <View style={styles.cardMeta}>
          <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.cardMetaText}>{item.time}</Text>
          <Ionicons name="people-outline" size={14} color={Colors.textSecondary} style={{ marginLeft: 10 }} />
          <Text style={styles.cardMetaText}>{item.partySize}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Ionicons name={statusStyle.icon as any} size={12} color={statusStyle.text} />
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>
            {t(`status.${item.status}`)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function ReservationsScreen() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const {
    data: reservations,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<ReservationsResponse>({
    queryKey: ['reservations'],
    queryFn: () => api<ReservationsResponse>('/reservations'),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoginPrompt />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cloud-offline-outline" size={40} color={Colors.textTertiary} />
          </View>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const all = reservations?.data ?? [];
  const upcoming = all.filter((r) => r.status === 'CONFIRMED');
  const past = all.filter((r) => r.status !== 'CONFIRMED');

  const sections = [
    ...(upcoming.length ? [{ title: t('reservations.upcoming'), data: upcoming }] : []),
    ...(past.length ? [{ title: t('reservations.past'), data: past }] : []),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('reservations.title')}</Text>
      </View>

      {sections.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyText}>{t('reservations.no_reservations')}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReservationCard item={item} />}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionTitle}>{title}</Text>
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
              progressBackgroundColor={Colors.surface}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
  },
  list: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textTertiary,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLeft: {
    marginRight: 14,
  },
  dateBox: {
    width: 50,
    height: 54,
    borderRadius: 14,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryLight,
    textTransform: 'uppercase',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  loginBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  loginBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  retryBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
