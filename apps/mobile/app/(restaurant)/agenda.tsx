import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { apiRestaurant } from '@/services/api';
import NotificationBell from '@/components/NotificationBell';

interface Reservation {
  id: string;
  code: string;
  date: string;
  time: string;
  partySize: number;
  status: ReservationStatus;
  specialRequests: string | null;
  user: { name: string; email: string; phone: string | null };
  tableAssignment: { table: { label: string; zone: { name: string } } } | null;
  zoneId: string | null;
}

type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'NO_SHOW'
  | 'CANCELLED_USER'
  | 'CANCELLED_RESTAURANT';

const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  ARRIVED: 'Llegada',
  NO_SHOW: 'No-show',
  CANCELLED_USER: 'Cancelada (cliente)',
  CANCELLED_RESTAURANT: 'Cancelada (resto)',
};

const STATUS_COLOR: Record<ReservationStatus, string> = {
  PENDING: Colors.warning,
  CONFIRMED: '#3b82f6',
  ARRIVED: Colors.success,
  NO_SHOW: Colors.error,
  CANCELLED_USER: Colors.textTertiary,
  CANCELLED_RESTAURANT: Colors.textTertiary,
};

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseLocalDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function displayDate(d: Date): string {
  return d.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function AgendaScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState<Date>(() => parseLocalDate(dateParam) ?? startOfToday());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const next = parseLocalDate(dateParam);
    if (!next) return;
    setDate((current) => (formatDateISO(next) === formatDateISO(current) ? current : next));
  }, [dateParam]);

  const load = useCallback(async () => {
    try {
      const { data } = await apiRestaurant<{ data: Reservation[] }>(
        `/restaurant/reservations?date=${formatDateISO(date)}`,
      );
      setReservations(
        (data ?? []).sort((a, b) => a.time.localeCompare(b.time)),
      );
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudieron cargar las reservas');
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const updateStatus = async (id: string, status: ReservationStatus) => {
    try {
      await apiRestaurant(`/restaurant/reservations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo actualizar la reserva');
    }
  };

  const confirmAction = (id: string, label: string, status: ReservationStatus) => {
    Alert.alert(label, `Codigo de reserva: ${id.slice(0, 8)}...`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: label, onPress: () => updateStatus(id, status) },
    ]);
  };

  const today = startOfToday();
  const isToday = formatDateISO(date) === formatDateISO(today);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.title}>Agenda</Text>
          <NotificationBell scope="restaurant" />
        </View>
        <View style={styles.dateNav}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => {
              const next = new Date(date);
              next.setDate(next.getDate() - 1);
              setDate(next);
            }}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.dateBox}>
            <Text style={styles.dateText}>{displayDate(date)}</Text>
            {isToday ? <Text style={styles.todayBadge}>Hoy</Text> : null}
          </View>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => {
              const next = new Date(date);
              next.setDate(next.getDate() + 1);
              setDate(next);
            }}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {!isToday ? (
          <TouchableOpacity onPress={() => setDate(today)} style={styles.todayBtn}>
            <Text style={styles.todayBtnText}>Volver a hoy</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : reservations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No hay reservas para este dia</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {reservations.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTime}>{r.time}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: `${STATUS_COLOR[r.status]}22`, borderColor: STATUS_COLOR[r.status] },
                  ]}
                >
                  <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] }]}>
                    {STATUS_LABEL[r.status]}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardName}>{r.user.name}</Text>
              <Text style={styles.cardMeta}>
                {r.partySize} pax {r.tableAssignment ? `· Mesa ${r.tableAssignment.table.label}` : '· Sin mesa'}
              </Text>
              {r.user.phone ? <Text style={styles.cardPhone}>{r.user.phone}</Text> : null}
              {r.specialRequests ? (
                <Text style={styles.cardNotes}>"{r.specialRequests}"</Text>
              ) : null}

              <View style={styles.actions}>
                {r.status === 'PENDING' ? (
                  <ActionBtn
                    icon="checkmark-circle"
                    label="Confirmar"
                    color={Colors.success}
                    onPress={() => confirmAction(r.id, 'Confirmar', 'CONFIRMED')}
                  />
                ) : null}
                {r.status === 'CONFIRMED' ? (
                  <>
                    <ActionBtn
                      icon="checkmark-done"
                      label="Llegado"
                      color={Colors.success}
                      onPress={() => confirmAction(r.id, 'Marcar llegado', 'ARRIVED')}
                    />
                    <ActionBtn
                      icon="close-circle"
                      label="No-show"
                      color={Colors.error}
                      onPress={() => confirmAction(r.id, 'Marcar no-show', 'NO_SHOW')}
                    />
                  </>
                ) : null}
                {r.status === 'CONFIRMED' || r.status === 'PENDING' ? (
                  <ActionBtn
                    icon="trash-outline"
                    label="Cancelar"
                    color={Colors.textSecondary}
                    onPress={() =>
                      confirmAction(r.id, 'Cancelar reserva', 'CANCELLED_RESTAURANT')
                    }
                  />
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ActionBtn({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateBox: { flex: 1, alignItems: 'center' },
  dateText: { fontSize: 16, fontWeight: '700', color: Colors.text, textTransform: 'capitalize' },
  todayBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  todayBtn: { alignSelf: 'flex-start' },
  todayBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
  scroll: { padding: 20, gap: 12, paddingBottom: 60 },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTime: { fontSize: 18, fontWeight: '800', color: Colors.text },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 8 },
  cardMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cardPhone: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cardNotes: { fontSize: 13, color: Colors.text, marginTop: 6, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
});
