import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { apiRestaurant } from '@/services/api';

interface Offer {
  id: string;
  title: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_ITEM' | 'SPECIAL_MENU';
  value: number;
  daysOfWeek: number[];
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
}

const TYPES: Array<{ id: Offer['type']; label: string }> = [
  { id: 'PERCENTAGE', label: '% descuento' },
  { id: 'FIXED_AMOUNT', label: 'EUR fijo' },
  { id: 'FREE_ITEM', label: 'Gratis' },
  { id: 'SPECIAL_MENU', label: 'Menu especial' },
];

const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

export default function OffersScreen() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const { data } = await apiRestaurant<{ data: Offer[] }>('/restaurant/offers');
      setOffers(data ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const remove = (id: string) => {
    Alert.alert('Eliminar oferta', '', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRestaurant(`/restaurant/offers/${id}`, { method: 'DELETE' });
            await load();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const toggleActive = async (offer: Offer) => {
    try {
      await apiRestaurant(`/restaurant/offers/${offer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Ofertas</Text>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.8}
            onPress={() => {
              setCreating(true);
              setEditing(null);
            }}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.addBtnText}>Nueva</Text>
          </TouchableOpacity>
        </View>

        {offers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Aun no tienes ofertas</Text>
          </View>
        ) : (
          offers.map((o) => (
            <View key={o.id} style={[styles.card, !o.isActive && { opacity: 0.5 }]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{o.title}</Text>
                <Switch value={o.isActive} onValueChange={() => toggleActive(o)} />
              </View>
              {o.description ? <Text style={styles.cardDesc}>{o.description}</Text> : null}
              <Text style={styles.cardMeta}>
                {labelForType(o.type)} · {o.value}
                {o.type === 'PERCENTAGE' ? '%' : 'EUR'}
              </Text>
              {o.daysOfWeek.length > 0 ? (
                <Text style={styles.cardDays}>
                  {o.daysOfWeek.map((d) => DAYS[d]).join(' · ')}
                </Text>
              ) : null}
              <View style={styles.rowBetween}>
                <TouchableOpacity onPress={() => setEditing(o)}>
                  <Text style={{ color: Colors.primary, fontWeight: '700' }}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(o.id)}>
                  <Text style={{ color: Colors.error, fontWeight: '700' }}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <OfferEditor
        visible={creating || !!editing}
        offer={editing}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSaved={() => {
          setEditing(null);
          setCreating(false);
          load();
        }}
      />
    </SafeAreaView>
  );
}

function labelForType(t: Offer['type']) {
  return TYPES.find((x) => x.id === t)?.label ?? t;
}

interface OfferEditorProps {
  visible: boolean;
  offer: Offer | null;
  onClose: () => void;
  onSaved: () => void;
}

function OfferEditor({ visible, offer, onClose, onSaved }: OfferEditorProps) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<Offer['type']>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (offer) {
      setTitle(offer.title);
      setDesc(offer.description ?? '');
      setType(offer.type);
      setValue(String(offer.value));
      setDays(offer.daysOfWeek);
    } else if (visible) {
      setTitle('');
      setDesc('');
      setType('PERCENTAGE');
      setValue('');
      setDays([]);
    }
  }, [offer, visible]);

  const save = async () => {
    if (!title || !value) {
      Alert.alert('Datos requeridos', 'Titulo y valor son obligatorios');
      return;
    }
    setBusy(true);
    try {
      const body = {
        title,
        description: desc || undefined,
        type,
        value: Number(value.replace(',', '.')),
        daysOfWeek: days,
      };
      if (offer) {
        await apiRestaurant(`/restaurant/offers/${offer.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiRestaurant('/restaurant/offers', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleDay = (d: number) => {
    setDays((curr) => (curr.includes(d) ? curr.filter((x) => x !== d) : [...curr, d].sort()));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{offer ? 'Editar oferta' : 'Nueva oferta'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Titulo"
            placeholderTextColor={Colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            placeholder="Descripcion"
            placeholderTextColor={Colors.textTertiary}
            value={desc}
            onChangeText={setDesc}
            multiline
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.chip, type === t.id && styles.chipActive]}
                onPress={() => setType(t.id)}
              >
                <Text style={[styles.chipText, type === t.id && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder={type === 'PERCENTAGE' ? '% descuento' : 'Valor (EUR)'}
            placeholderTextColor={Colors.textTertiary}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
          />

          <Text style={styles.dayLabel}>Dias activos</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {DAYS.map((label, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.dayBtn, days.includes(idx) && styles.dayBtnActive]}
                onPress={() => toggleDay(idx)}
              >
                <Text
                  style={[styles.dayBtnText, days.includes(idx) && styles.dayBtnTextActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy}>
              <Text style={{ color: Colors.text, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtnFull} onPress={save} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={{ color: Colors.white, fontWeight: '700' }}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', gap: 8, padding: 60 },
  emptyText: { color: Colors.textSecondary },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    gap: 6,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  cardDesc: { fontSize: 13, color: Colors.textSecondary },
  cardMeta: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  cardDays: { fontSize: 12, color: Colors.textTertiary },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  input: {
    backgroundColor: Colors.background,
    color: Colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.primary },
  dayLabel: { fontSize: 12, color: Colors.textTertiary, fontWeight: '700', marginTop: 4 },
  dayBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayBtnText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700' },
  dayBtnTextActive: { color: Colors.white },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtnFull: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
});
