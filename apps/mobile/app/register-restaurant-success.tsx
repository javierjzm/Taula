import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

export default function RegisterRestaurantSuccessScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rr = 'register_restaurant';

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={s.content}>
        <View style={s.iconWrap}>
          <View style={s.iconCircle}>
            <Ionicons name="checkmark" size={48} color={Colors.primary} />
          </View>
        </View>

        <Text style={s.title}>{t(`${rr}.success_title`)}</Text>
        <Text style={s.message}>{t(`${rr}.success_message`)}</Text>

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
            <Text style={s.infoTxt}>{t(`${rr}.success_message`)}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={s.btn}
        onPress={() => router.replace('/(tabs)')}
        activeOpacity={0.85}
      >
        <Ionicons name="home-outline" size={20} color={Colors.textInverse} />
        <Text style={s.btnTxt}>{t(`${rr}.success_back`)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 24 },

  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  iconWrap: { marginBottom: 28 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 300,
    marginBottom: 28,
  },

  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoTxt: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 16,
    gap: 10,
    ...Colors.shadow.md,
  },
  btnTxt: { color: Colors.textInverse, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
