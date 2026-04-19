import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'ca', label: 'Català' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
] as const;

export default function ProfileLanguageScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const current = i18n.language?.slice(0, 2) || user?.preferredLang || 'es';

  const onSelect = async (lang: 'es' | 'ca' | 'en' | 'fr') => {
    try {
      await i18n.changeLanguage(lang);
      await api('/me', {
        method: 'PATCH',
        body: JSON.stringify({ preferredLang: lang }),
      });
      useAuthStore.setState((state) => ({
        ...state,
        user: state.user ? { ...state.user, preferredLang: lang } : state.user,
      }));
      router.back();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || 'No se pudo cambiar el idioma.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.language')}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.card}>
        {LANGUAGES.map((lang) => {
          const active = current === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => onSelect(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={[styles.rowText, active && styles.rowTextActive]}>{lang.label}</Text>
              {active && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
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
    justifyContent: 'space-between',
  },
  rowActive: { backgroundColor: Colors.primaryGlow },
  rowText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  rowTextActive: { color: Colors.primary, fontWeight: '700' },
});

