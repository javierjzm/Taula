import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';

export default function ProfileAboutScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.about')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.brand}>taula</Text>
          <Text style={styles.version}>v0.1.0</Text>
          <Text style={styles.text}>
            {t('about.description', { defaultValue: 'Taula te ayuda a descubrir restaurantes y reservar mesas en segundos. Nuestro objetivo es que reservar sea tan fácil como pedir comida.' })}
          </Text>
        </View>

        <View style={styles.card}>
          <InfoRow label={t('about.support', { defaultValue: 'Soporte' })} value="support@taula.ad" />
          <InfoRow label="Web" value="taula.ad" />
          <InfoRow label={t('about.region', { defaultValue: 'Zona inicial' })} value="Andorra" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  scroll: { paddingTop: 16, gap: 12, paddingBottom: 30 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  brand: { fontSize: 28, fontWeight: '900', color: Colors.primary, letterSpacing: -1 },
  version: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  text: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  rowValue: { color: Colors.text, fontWeight: '700', fontSize: 13 },
});

