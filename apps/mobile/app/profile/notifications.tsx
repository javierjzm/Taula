import { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { api } from '@/services/api';

interface NotifPrefs {
  confirmations: boolean;
  reminders: boolean;
  offers: boolean;
  newReservation: boolean;
  cancellation: boolean;
  newReview: boolean;
  planAlerts: boolean;
}

const DEFAULTS: NotifPrefs = {
  confirmations: true,
  reminders: true,
  offers: false,
  newReservation: true,
  cancellation: true,
  newReview: true,
  planAlerts: true,
};

export default function ProfileNotificationsScreen() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [hasOwnerships, setHasOwnerships] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ data: NotifPrefs }>('/notifications/preferences');
        setPrefs({ ...DEFAULTS, ...res.data });
      } catch { /* noop */ }
      try {
        const own = await api<{ data: unknown[] }>('/me/ownerships');
        setHasOwnerships((own.data ?? []).length > 0);
      } catch { /* noop */ }
      setLoaded(true);
    })();
  }, []);

  const update = useCallback(
    (key: keyof NotifPrefs, val: boolean) => {
      const next = { ...prefs, [key]: val };
      setPrefs(next);
      api('/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: val }),
      }).catch(() => {});
    },
    [prefs],
  );

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.notifications')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Cliente</Text>
        <View style={styles.card}>
          <NotificationRow
            title={t('notif.confirmations', { defaultValue: 'Confirmaciones de reserva' })}
            subtitle={t('notif.confirmations_desc', { defaultValue: 'Aviso cuando la reserva queda confirmada' })}
            value={prefs.confirmations}
            onToggle={(v) => update('confirmations', v)}
          />
          <NotificationRow
            title={t('notif.reminders', { defaultValue: 'Recordatorios' })}
            subtitle={t('notif.reminders_desc', { defaultValue: 'Recordatorio 24h y 2h antes' })}
            value={prefs.reminders}
            onToggle={(v) => update('reminders', v)}
          />
          <NotificationRow
            title={t('notif.offers', { defaultValue: 'Ofertas y novedades' })}
            subtitle={t('notif.offers_desc', { defaultValue: 'Promociones de restaurantes cercanos' })}
            value={prefs.offers}
            onToggle={(v) => update('offers', v)}
          />
        </View>

        {hasOwnerships && (
          <>
            <Text style={styles.sectionLabel}>Restaurante</Text>
            <View style={styles.card}>
              <NotificationRow
                title="Nueva reserva"
                subtitle="Aviso cada vez que un cliente reserva"
                value={prefs.newReservation}
                onToggle={(v) => update('newReservation', v)}
              />
              <NotificationRow
                title="Cancelaciones"
                subtitle="Cuando un cliente cancela una reserva"
                value={prefs.cancellation}
                onToggle={(v) => update('cancellation', v)}
              />
              <NotificationRow
                title="Nuevas reseñas"
                subtitle="Cuando alguien deja una reseña"
                value={prefs.newReview}
                onToggle={(v) => update('newReview', v)}
              />
              <NotificationRow
                title="Avisos del plan"
                subtitle="Pagos, fallos de cobro y suscripción"
                value={prefs.planAlerts}
                onToggle={(v) => update('planAlerts', v)}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationRow({
  title,
  subtitle,
  value,
  onToggle,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        thumbColor={Colors.white}
        trackColor={{ false: Colors.textTertiary, true: Colors.primary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  rowSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 3 },
});
