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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { apiRestaurant } from '@/services/api';

interface Blocked {
  id: string;
  date: string;
  reason: string | null;
  isFullDay: boolean;
  service: { name: string } | null;
}

export default function BlockedDatesScreen() {
  const [items, setItems] = useState<Blocked[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await apiRestaurant<{ data: Blocked[] }>('/restaurant/blocked-dates');
      setItems(data ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const add = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Formato', 'La fecha debe ser AAAA-MM-DD');
      return;
    }
    setBusy(true);
    try {
      await apiRestaurant('/restaurant/blocked-dates', {
        method: 'POST',
        body: JSON.stringify({ date, reason: reason || undefined, isFullDay: true }),
      });
      setDate('');
      setReason('');
      setCreating(false);
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    Alert.alert('Desbloquear fecha', '', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desbloquear',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRestaurant(`/restaurant/blocked-dates/${id}`, { method: 'DELETE' });
            await load();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
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
          <Text style={styles.title}>Dias bloqueados</Text>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.8}
            onPress={() => setCreating(true)}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.addBtnText}>Bloquear</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="lock-closed-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Sin dias bloqueados</Text>
          </View>
        ) : (
          items.map((b) => (
            <View key={b.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardDate}>
                  {new Date(b.date).toLocaleDateString('es', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
                {b.reason ? <Text style={styles.cardReason}>{b.reason}</Text> : null}
                <Text style={styles.cardSub}>
                  {b.isFullDay ? 'Todo el dia' : 'Servicio: ' + (b.service?.name ?? '?')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => remove(b.id)}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={creating} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => !busy && setCreating(false)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Bloquear dia</Text>
            <TextInput
              style={styles.input}
              placeholder="Fecha (AAAA-MM-DD)"
              placeholderTextColor={Colors.textTertiary}
              value={date}
              onChangeText={setDate}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Motivo (opcional)"
              placeholderTextColor={Colors.textTertiary}
              value={reason}
              onChangeText={setReason}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCreating(false)}
                disabled={busy}
              >
                <Text style={{ color: Colors.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtnFull} onPress={add} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={{ color: Colors.white, fontWeight: '700' }}>Bloquear</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
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
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  cardDate: { fontSize: 15, fontWeight: '700', color: Colors.text, textTransform: 'capitalize' },
  cardReason: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cardSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
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
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
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
