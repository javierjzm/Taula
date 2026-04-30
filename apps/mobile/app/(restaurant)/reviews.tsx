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

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  createdAt: string;
  user: { name: string; email: string; avatar: string | null };
}

export default function RestaurantReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState<Review | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await apiRestaurant<{ data: Review[] }>('/restaurant/reviews');
      setReviews(data ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const submitReply = async () => {
    if (!replying || !reply.trim()) return;
    setBusy(true);
    try {
      await apiRestaurant(`/restaurant/reviews/${replying.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply: reply.trim() }),
      });
      setReplying(null);
      setReply('');
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
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
        <Text style={styles.title}>Resenas</Text>

        {reviews.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Aun no tienes resenas</Text>
          </View>
        ) : (
          reviews.map((r) => {
            const userName = r.user.name || r.user.email || 'Usuario';
            const userInitial = userName.trim().charAt(0).toUpperCase() || '?';

            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{userInitial}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{userName}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(r.createdAt).toLocaleDateString('es')}
                    </Text>
                  </View>
                  <View style={styles.rating}>
                    <Ionicons name="star" size={14} color={Colors.star} />
                    <Text style={styles.ratingText}>{r.rating.toFixed(1)}</Text>
                  </View>
                </View>
                {r.comment ? <Text style={styles.cardComment}>{r.comment}</Text> : null}

                {r.ownerReply ? (
                  <View style={styles.replyBox}>
                    <Text style={styles.replyLabel}>Tu respuesta</Text>
                    <Text style={styles.replyText}>{r.ownerReply}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.replyBtn}
                    onPress={() => {
                      setReplying(r);
                      setReply('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-undo-outline" size={14} color={Colors.primary} />
                    <Text style={styles.replyBtnText}>Responder</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!replying} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => !busy && setReplying(null)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Responder</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Tu respuesta"
              placeholderTextColor={Colors.textTertiary}
              value={reply}
              onChangeText={setReply}
              multiline
              maxLength={500}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setReplying(null)}
                disabled={busy}
              >
                <Text style={{ color: Colors.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={submitReply} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={{ color: Colors.white, fontWeight: '700' }}>Enviar</Text>
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
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  empty: { alignItems: 'center', gap: 8, padding: 60 },
  emptyText: { color: Colors.textSecondary },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.primary, fontWeight: '800' },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardDate: { fontSize: 12, color: Colors.textTertiary },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.warningLight,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: Colors.text },
  cardComment: { fontSize: 13, color: Colors.text },
  replyBox: {
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  replyLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  replyText: { fontSize: 13, color: Colors.textSecondary },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  replyBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
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
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
});
