import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { apiRestaurant } from '@/services/api';

interface DaySummary {
  date: string;
  reservations: number;
  covers: number;
  blocked: boolean;
}

const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function RestaurantCalendarScreen() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRestaurant<{ data: DaySummary[] }>(`/restaurant/calendar?year=${year}&month=${month}`)
      .then((res) => setDays(res.data ?? []))
      .catch((err: any) =>
        Alert.alert('Error', err.message ?? 'No se pudo cargar el calendario'),
      )
      .finally(() => setLoading(false));
  }, [year, month]);

  const monthName = new Date(year, month - 1).toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
  });

  const grid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    let dow = firstDay.getDay();
    if (dow === 0) dow = 7;
    const blanks = dow - 1;
    const cells: (DaySummary | null)[] = [];
    for (let i = 0; i < blanks; i++) cells.push(null);
    for (const d of days) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [days, year, month]);

  const today = formatLocalDate(new Date());
  const maxRes = Math.max(1, ...days.map((d) => d.reservations));

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={prevMonth} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{monthName}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={nextMonth} activeOpacity={0.6}>
          <Ionicons name="chevron-forward" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {DAY_HEADERS.map((d) => (
          <Text key={d} style={styles.weekHead}>
            {d}
          </Text>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.grid}>
          {grid.map((cell, i) => {
            if (!cell) return <View key={`b${i}`} style={styles.cellBlank} />;
            const dayNum = parseInt(cell.date.split('-')[2], 10);
            const isToday = cell.date === today;
            const heat = cell.reservations / maxRes;

            return (
              <TouchableOpacity
                key={cell.date}
                style={[
                  styles.cell,
                  cell.blocked && styles.cellBlocked,
                  isToday && styles.cellToday,
                ]}
                activeOpacity={0.7}
                onPress={() => router.push(`/(restaurant)/agenda?date=${cell.date}`)}
              >
                <View style={styles.cellHead}>
                  <Text style={[styles.cellDay, isToday && styles.cellDayToday]}>
                    {dayNum}
                  </Text>
                  {cell.blocked ? (
                    <Ionicons name="lock-closed" size={10} color={Colors.error} />
                  ) : null}
                </View>

                {cell.reservations > 0 ? (
                  <>
                    <View style={styles.heatTrack}>
                      <View
                        style={[
                          styles.heatFill,
                          { width: `${Math.max(heat * 100, 15)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.cellMeta}>
                      {cell.reservations} · {cell.covers}p
                    </Text>
                  </>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text, textTransform: 'capitalize' },
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
  weekRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 },
  weekHead: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 4,
  },
  cell: {
    width: '13.7%',
    aspectRatio: 0.75,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 4,
    justifyContent: 'space-between',
  },
  cellBlank: { width: '13.7%', aspectRatio: 0.75 },
  cellToday: { borderColor: Colors.primary },
  cellBlocked: { backgroundColor: Colors.errorLight },
  cellHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cellDay: { fontSize: 13, fontWeight: '700', color: Colors.text },
  cellDayToday: { color: Colors.primary },
  heatTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
  },
  heatFill: { height: 3, backgroundColor: Colors.primary, borderRadius: 2 },
  cellMeta: { fontSize: 9, color: Colors.textSecondary, fontWeight: '600' },
});
