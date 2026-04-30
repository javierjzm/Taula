import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { apiRestaurant } from '@/services/api';

interface Stats {
  totalReservations: number;
  arrived: number;
  noShows: number;
  cancelled: number;
  totalCoversServed: number;
  daily: { date: string; count: number }[];
}

const RANGES = [
  { id: '7', label: '7 dias' },
  { id: '30', label: '30 dias' },
  { id: '90', label: '90 dias' },
];

export default function StatsScreen() {
  const [range, setRange] = useState('30');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const days = parseInt(range, 10);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    apiRestaurant<{ data: Stats }>(
      `/restaurant/stats?from=${from.toISOString()}&to=${to.toISOString()}`,
    )
      .then((res) => setStats(res.data))
      .catch((err: any) =>
        Alert.alert('Error', err.message ?? 'No se pudieron cargar las estadisticas'),
      )
      .finally(() => setLoading(false));
  }, [range]);

  const maxDaily = useMemo(() => {
    return Math.max(1, ...(stats?.daily ?? []).map((d) => d.count));
  }, [stats]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Estadisticas</Text>

        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.rangeBtn, range === r.id && styles.rangeBtnActive]}
              onPress={() => setRange(r.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.rangeText, range === r.id && styles.rangeTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : stats ? (
          <>
            <View style={styles.cardsRow}>
              <StatCard label="Reservas" value={stats.totalReservations} icon="calendar" />
              <StatCard label="Comensales" value={stats.totalCoversServed} icon="people" />
            </View>
            <View style={styles.cardsRow}>
              <StatCard
                label="Llegadas"
                value={stats.arrived}
                icon="checkmark-circle"
                color={Colors.success}
              />
              <StatCard
                label="No-shows"
                value={stats.noShows}
                icon="close-circle"
                color={Colors.error}
              />
            </View>
            <StatCard
              label="Canceladas"
              value={stats.cancelled}
              icon="ban"
              color={Colors.warning}
              full
            />

            {stats.daily.length > 0 ? (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Reservas por dia</Text>
                <View style={styles.chart}>
                  {stats.daily.map((d) => {
                    const h = Math.max(4, (d.count / maxDaily) * 120);
                    return (
                      <View key={d.date} style={styles.barCol}>
                        <View style={[styles.bar, { height: h }]} />
                        <Text style={styles.barLabel}>{d.date.slice(8)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color?: string;
  full?: boolean;
}

function StatCard({ label, value, icon, color, full }: StatCardProps) {
  return (
    <View style={[styles.statCard, full && { flex: 1 }]}>
      <View style={[styles.statIcon, color && { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color ?? Colors.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  center: { paddingVertical: 60, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  rangeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rangeBtnActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  rangeText: { color: Colors.textSecondary, fontWeight: '700' },
  rangeTextActive: { color: Colors.primary },
  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary },

  chartCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: 4,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  barLabel: { fontSize: 9, color: Colors.textTertiary },
});
