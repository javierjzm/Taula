import { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { storage } from '@/services/storage';

const PREFS_KEY = 'taula_notification_prefs';

interface NotifPrefs {
  confirmations: boolean;
  reminders: boolean;
  offers: boolean;
}

const DEFAULTS: NotifPrefs = {
  confirmations: true,
  reminders: true,
  offers: false,
};

export default function ProfileNotificationsScreen() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(PREFS_KEY);
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch { /* noop */ }
      setLoaded(true);
    })();
  }, []);

  const update = useCallback(
    (key: keyof NotifPrefs, val: boolean) => {
      const next = { ...prefs, [key]: val };
      setPrefs(next);
      storage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
    },
    [prefs],
  );

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.notifications')}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.card}>
        <NotificationRow
          title={t('notif.confirmations', { defaultValue: 'Confirmaciones de reserva' })}
          subtitle={t('notif.confirmations_desc', { defaultValue: 'Aviso cuando la reserva queda confirmada' })}
          value={prefs.confirmations}
          onToggle={(v) => update('confirmations', v)}
        />
        <NotificationRow
          title={t('notif.reminders', { defaultValue: 'Recordatorios' })}
          subtitle={t('notif.reminders_desc', { defaultValue: 'Recordatorio antes de tu reserva' })}
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
  card: {
    marginTop: 16,
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
