import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { PARISHES, CUISINE_TYPES, getCuisineLabel } from '@/constants/andorra';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

const PRICE_OPTIONS = [1, 2, 3, 4];

interface FormData {
  name: string;
  address: string;
  parish: string;
  cuisineType: string[];
  phone: string;
  email: string;
  description: string;
  priceRange: number;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPasswordConfirm: string;
}

interface FormErrors {
  [key: string]: string | undefined;
}

export default function RegisterRestaurantScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const ownerships = useAuthStore((s) => s.ownerships);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: '',
    address: '',
    parish: '',
    cuisineType: [],
    phone: '',
    email: '',
    description: '',
    priceRange: 2,
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerPasswordConfirm: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const set = (key: keyof FormData, value: string | number | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleCuisine = (id: string) => {
    const next = form.cuisineType.includes(id)
      ? form.cuisineType.filter((c) => c !== id)
      : [...form.cuisineType, id];
    set('cuisineType', next);
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    const rr = 'register_restaurant';

    if (!form.name.trim()) e.name = t(`${rr}.error_required`);
    if (!form.address.trim()) e.address = t(`${rr}.error_required`);
    if (!form.parish) e.parish = t(`${rr}.error_required`);
    if (form.cuisineType.length === 0) e.cuisineType = t(`${rr}.error_cuisine_min`);
    if (!form.email.trim()) e.email = t(`${rr}.error_required`);
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t(`${rr}.error_email`);
    if (!form.ownerName.trim()) e.ownerName = t(`${rr}.error_required`);
    if (!form.ownerEmail.trim()) e.ownerEmail = t(`${rr}.error_required`);
    else if (!/\S+@\S+\.\S+/.test(form.ownerEmail)) e.ownerEmail = t(`${rr}.error_email`);
    if (!form.ownerPassword) e.ownerPassword = t(`${rr}.error_required`);
    else if (form.ownerPassword.length < 8) e.ownerPassword = t(`${rr}.error_password_min`);
    if (form.ownerPassword !== form.ownerPasswordConfirm) e.ownerPasswordConfirm = t(`${rr}.error_password_match`);

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const parishData = PARISHES.find((p) => p.id === form.parish);

    try {
      await api('/restaurant/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          cuisineType: form.cuisineType,
          priceRange: form.priceRange,
          phone: form.phone.trim() || undefined,
          email: form.email.trim(),
          address: form.address.trim(),
          parish: form.parish,
          latitude: parishData?.latitude ?? 42.5063,
          longitude: parishData?.longitude ?? 1.5218,
          ownerName: form.ownerName.trim(),
          ownerEmail: form.ownerEmail.trim(),
          ownerPassword: form.ownerPassword,
        }),
      });
      router.replace('/register-restaurant-success');
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (err?.code === 'RESTAURANT_OWNER_LIMIT') {
        Alert.alert(t('common.error'), msg);
      } else if (msg.includes('Unique constraint') || msg.includes('already exists')) {
        Alert.alert(t('common.error'), t('register_restaurant.error_duplicate'));
      } else {
        Alert.alert(t('common.error'), t('register_restaurant.error_generic'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const rr = 'register_restaurant';

  if (ownerships.length > 0) {
    return (
      <View style={s.root}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[s.header, { paddingTop: insets.top + 4 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t(`${rr}.title`)}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.blockedWrap}>
          <View style={s.blockedIcon}>
            <Ionicons name="storefront" size={34} color={Colors.primary} />
          </View>
          <Text style={s.blockedTitle}>Ya tienes un restaurante</Text>
          <Text style={s.blockedText}>
            Cada cuenta solo puede gestionar un restaurante. Usa el selector de modo desde tu
            perfil para entrar al panel.
          </Text>
          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => router.replace('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <Text style={s.secondaryBtnText}>Volver al perfil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t(`${rr}.title`)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.subtitle}>{t(`${rr}.subtitle`)}</Text>

          {/* ═══ RESTAURANT SECTION ═══ */}
          <Text style={s.sectionLabel}>{t(`${rr}.section_restaurant`)}</Text>

          <Field label={t(`${rr}.name`)} error={errors.name} required>
            <TextInput
              style={s.input}
              placeholder={t(`${rr}.name_placeholder`)}
              placeholderTextColor={Colors.textTertiary}
              value={form.name}
              onChangeText={(v) => set('name', v)}
            />
          </Field>

          <Field label={t(`${rr}.address`)} error={errors.address} required>
            <TextInput
              style={s.input}
              placeholder={t(`${rr}.address_placeholder`)}
              placeholderTextColor={Colors.textTertiary}
              value={form.address}
              onChangeText={(v) => set('address', v)}
            />
          </Field>

          <Field label={t(`${rr}.parish`)} error={errors.parish} required>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
              {PARISHES.map((p) => {
                const active = form.parish === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => set('parish', active ? '' : p.id)}
                  >
                    <Text style={[s.chipTxt, active && s.chipTxtActive]}>{p.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Field>

          <Field label={t(`${rr}.cuisine`)} error={errors.cuisineType} hint={t(`${rr}.cuisine_hint`)} required>
            <View style={s.cuisineGrid}>
              {CUISINE_TYPES.map((ct) => {
                const active = form.cuisineType.includes(ct.id);
                return (
                  <TouchableOpacity
                    key={ct.id}
                    style={[s.cuisineChip, active && s.cuisineChipActive]}
                    onPress={() => toggleCuisine(ct.id)}
                  >
                    <Text style={s.cuisineEmoji}>{ct.emoji}</Text>
                    <Text style={[s.cuisineLabel, active && s.cuisineLabelActive]}>{getCuisineLabel(ct.id, t)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          <Field label={t(`${rr}.price_range`)}>
            <View style={s.priceRow}>
              {PRICE_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[s.priceBtn, form.priceRange === n && s.priceBtnActive]}
                  onPress={() => set('priceRange', n)}
                >
                  <Text style={[s.priceTxt, form.priceRange === n && s.priceTxtActive]}>
                    {'€'.repeat(n)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label={t(`${rr}.phone`)}>
            <TextInput
              style={s.input}
              placeholder={t(`${rr}.phone_placeholder`)}
              placeholderTextColor={Colors.textTertiary}
              value={form.phone}
              onChangeText={(v) => set('phone', v)}
              keyboardType="phone-pad"
            />
          </Field>

          <Field label={t(`${rr}.email`)} error={errors.email} required>
            <TextInput
              style={s.input}
              placeholder={t(`${rr}.email_placeholder`)}
              placeholderTextColor={Colors.textTertiary}
              value={form.email}
              onChangeText={(v) => set('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Field>

          <Field label={t(`${rr}.description`)}>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder={t(`${rr}.description_placeholder`)}
              placeholderTextColor={Colors.textTertiary}
              value={form.description}
              onChangeText={(v) => set('description', v)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Field>

          {/* ═══ OWNER SECTION ═══ */}
          <View style={s.divider} />
          <Text style={s.sectionLabel}>{t(`${rr}.section_owner`)}</Text>

          <Field label={t(`${rr}.owner_name`)} error={errors.ownerName} required>
            <TextInput
              style={s.input}
              value={form.ownerName}
              onChangeText={(v) => set('ownerName', v)}
            />
          </Field>

          <Field label={t(`${rr}.owner_email`)} error={errors.ownerEmail} required>
            <TextInput
              style={s.input}
              placeholder={t(`${rr}.owner_email_placeholder`)}
              placeholderTextColor={Colors.textTertiary}
              value={form.ownerEmail}
              onChangeText={(v) => set('ownerEmail', v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Field>

          <Field label={t(`${rr}.owner_password`)} error={errors.ownerPassword} hint={t(`${rr}.owner_password_hint`)} required>
            <TextInput
              style={s.input}
              value={form.ownerPassword}
              onChangeText={(v) => set('ownerPassword', v)}
              secureTextEntry
            />
          </Field>

          <Field label={t(`${rr}.owner_password_confirm`)} error={errors.ownerPasswordConfirm} required>
            <TextInput
              style={s.input}
              value={form.ownerPasswordConfirm}
              onChangeText={(v) => set('ownerPasswordConfirm', v)}
              secureTextEntry
            />
          </Field>

          {/* ═══ SUBMIT ═══ */}
          <TouchableOpacity
            style={[s.submitBtn, submitting && s.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.textInverse} size="small" />
            ) : (
              <>
                <Ionicons name="restaurant-outline" size={20} color={Colors.textInverse} />
                <Text style={s.submitTxt}>{t(`${rr}.submit`)}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ── FIELD WRAPPER ── */

function Field({ label, error, hint, required, children }: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={s.field}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {required && <Text style={s.required}>*</Text>}
      </View>
      {hint && !error && <Text style={s.hint}>{hint}</Text>}
      {children}
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

/* ═══════════ STYLES ═══════════ */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },

  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 24 },

  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 24 },

  /* Field */
  field: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text },
  required: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  hint: { fontSize: 12, color: Colors.textTertiary, marginBottom: 6 },
  error: { fontSize: 12, color: Colors.error, marginTop: 4, fontWeight: '500' },

  /* Input */
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
  },
  textarea: { minHeight: 90, paddingTop: 14 },

  /* Chips */
  chipsRow: { gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  chipTxt: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTxtActive: { color: Colors.primary, fontWeight: '700' },

  /* Cuisine */
  cuisineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cuisineChipActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  cuisineEmoji: { fontSize: 16 },
  cuisineLabel: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  cuisineLabelActive: { color: Colors.primary, fontWeight: '700' },

  /* Price */
  priceRow: { flexDirection: 'row', gap: 10 },
  priceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  priceBtnActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  priceTxt: { fontSize: 14, fontWeight: '600', color: Colors.textTertiary },
  priceTxtActive: { color: Colors.primary, fontWeight: '800' },

  /* Submit */
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 16,
    gap: 10,
    marginTop: 16,
    ...Colors.shadow.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitTxt: { color: Colors.textInverse, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  blockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  blockedIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  blockedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  blockedText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  secondaryBtn: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  secondaryBtnText: { color: Colors.textInverse, fontWeight: '800', fontSize: 15 },
});
