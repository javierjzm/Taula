import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Colors } from '@/constants/colors';
import { api } from '@/services/api';
import type { Reservation, ApiResponse } from '@taula/shared';

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: Colors.warningLight, text: Colors.warning, icon: 'time' },
  CONFIRMED: { bg: Colors.successLight, text: Colors.success, icon: 'checkmark-circle' },
  ARRIVED: { bg: Colors.accentLight, text: Colors.accent, icon: 'restaurant' },
  NO_SHOW: { bg: Colors.warningLight, text: Colors.warning, icon: 'alert-circle' },
  CANCELLED_USER: { bg: Colors.errorLight, text: Colors.error, icon: 'close-circle' },
  CANCELLED_RESTAURANT: { bg: Colors.errorLight, text: Colors.error, icon: 'close-circle' },
};

function ReviewForm({ restaurantId, onSuccess }: { restaurantId: string; onSuccess: () => void }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await api('/reviews', {
        method: 'POST',
        body: JSON.stringify({ restaurantId, rating, comment: comment.trim() || undefined }),
      });
      setSubmitted(true);
      onSuccess();
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('409') || msg.includes('Ya has dejado')) {
        Alert.alert(t('reservation.review_already'));
        setSubmitted(true);
      } else {
        Alert.alert(t('common.error'), msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={s.reviewCard}>
        <View style={s.reviewDoneWrap}>
          <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
          <Text style={s.reviewDoneTxt}>{t('reservation.review_success')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.reviewCard}>
      <View style={s.reviewHeader}>
        <Ionicons name="star" size={18} color={Colors.star} />
        <Text style={s.reviewTitle}>{t('reservation.leave_review')}</Text>
      </View>

      <View style={s.starsRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <TouchableOpacity key={i} onPress={() => setRating(i)} hitSlop={6} activeOpacity={0.7}>
            <Ionicons
              name={i <= rating ? 'star' : 'star-outline'}
              size={36}
              color={i <= rating ? Colors.star : Colors.textTertiary}
            />
          </TouchableOpacity>
        ))}
      </View>
      {rating === 0 && (
        <Text style={s.starHint}>{t('reservation.review_tap_stars')}</Text>
      )}

      <TextInput
        style={s.reviewInput}
        placeholder={t('reservation.review_placeholder')}
        placeholderTextColor={Colors.textTertiary}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        maxLength={500}
      />

      <TouchableOpacity
        style={[s.reviewSubmit, rating === 0 && s.reviewSubmitDisabled]}
        onPress={handleSubmit}
        disabled={submitting || rating === 0}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={Colors.textInverse} />
        ) : (
          <Text style={s.reviewSubmitTxt}>{t('reservation.review_submit')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const {
    data: reservationRes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => api<ApiResponse<Reservation>>(`/reservations/${id}`),
    enabled: !!id,
  });

  const reservation = reservationRes?.data;

  const cancelMutation = useMutation({
    mutationFn: () =>
      api<ApiResponse<Reservation>>(`/reservations/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation', id] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      Alert.alert(t('reservation.cancelled'));
    },
    onError: (err: Error) => {
      Alert.alert(t('common.error'), err.message);
    },
  });

  useEffect(() => {
    if (reservation) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [reservation]);

  const handleShare = async () => {
    if (!reservation) return;
    try {
      await Share.share({
        message: `${reservation.restaurantName}\n${formatDate(reservation.date)} - ${reservation.time}\n${t('reservation.code')}: ${reservation.code}`,
      });
    } catch {
      /* noop */
    }
  };

  const handleCancel = () => {
    Alert.alert(t('reservation.cancel_confirm'), t('reservation.cancel_description'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('reservation.cancel_yes'),
        style: 'destructive',
        onPress: () => cancelMutation.mutate(),
      },
    ]);
  };

  const formatDate = (dateStr: string): string => {
    try {
      return format(new Date(dateStr + 'T00:00:00'), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <View style={s.centerScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (isError || !reservation) {
    return (
      <View style={s.centerScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={s.errorText}>{t('common.error')}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
          <Text style={s.retryBtnText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusInfo = STATUS_COLORS[reservation.status] ?? STATUS_COLORS.CONFIRMED;
  const isConfirmed = reservation.status === 'CONFIRMED';
  const isPending = reservation.status === 'PENDING';
  const canCancel = isConfirmed || isPending;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('reservation.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        <Animated.View
          style={[
            s.heroSection,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[s.heroCircle, { backgroundColor: statusInfo.bg }]}>
            <Ionicons name={statusInfo.icon as any} size={44} color={statusInfo.text} />
          </View>
          <Text style={s.heroTitle}>
            {isConfirmed ? t('reservation.confirmed') : t(`status.${reservation.status}`)}
          </Text>
          {isConfirmed && (
            <Text style={s.heroSubtitle}>{t('reservation.success_message')}</Text>
          )}
        </Animated.View>

        <Animated.View style={[s.codeCard, { opacity: opacityAnim }]}>
          <Text style={s.codeLabel}>{t('reservation.code')}</Text>
          <Text style={s.codeValue}>{reservation.code}</Text>
        </Animated.View>

        <View style={s.detailCard}>
          <View style={s.restaurantRow}>
            <View style={s.restaurantIconWrap}>
              <Ionicons name="restaurant" size={20} color={Colors.primary} />
            </View>
            <Text style={s.restaurantName} numberOfLines={1}>{reservation.restaurantName}</Text>
          </View>

          <View style={s.detailDivider} />

          <DetailRow icon="calendar" label={t('reservation.date')} value={formatDate(reservation.date)} />
          <DetailRow icon="time" label={t('reservation.time')} value={reservation.time} />
          <DetailRow icon="people" label={t('reservation.party_size')} value={String(reservation.partySize)} />

          {reservation.specialRequests ? (
            <>
              <View style={s.detailDivider} />
              <View style={s.requestsRow}>
                <Ionicons name="chatbubble-outline" size={16} color={Colors.textTertiary} />
                <Text style={s.requestsText}>{reservation.specialRequests}</Text>
              </View>
            </>
          ) : null}

          <View style={s.detailDivider} />

          <View style={s.statusRow}>
            <Text style={s.statusLabel}>{t('reservation.status_label')}</Text>
            <View style={[s.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <View style={[s.statusDot, { backgroundColor: statusInfo.text }]} />
              <Text style={[s.statusText, { color: statusInfo.text }]}>
                {t(`status.${reservation.status}`)}
              </Text>
            </View>
          </View>

          {(reservation as any).cardGuarantee && (
            <>
              <View style={s.detailDivider} />
              <View style={s.cardGuaranteeRow}>
                <Ionicons name="shield-checkmark" size={16} color="#D97706" />
                <Text style={s.cardGuaranteeLabel}>{t('reservation.card_guarantee')}</Text>
              </View>
            </>
          )}

          {(reservation as any).noShowCharged && (
            <>
              <View style={s.detailDivider} />
              <View style={s.noShowChargeRow}>
                <Ionicons name="warning" size={16} color={Colors.error} />
                <Text style={s.noShowChargeText}>
                  {t('reservation.noshow_charged', { amount: (reservation as any).noShowAmount?.toFixed(2) || '0' })}
                </Text>
              </View>
            </>
          )}
        </View>

        {reservation.status === 'ARRIVED' && reservation.restaurantId && (
          <ReviewForm
            restaurantId={reservation.restaurantId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['reservation', id] });
            }}
          />
        )}

        <View style={s.actions}>
          <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={20} color={Colors.primary} />
            <Text style={s.shareBtnText}>{t('reservation.share')}</Text>
          </TouchableOpacity>

          {canCancel && (
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
              activeOpacity={0.7}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
                  <Text style={s.cancelBtnText}>{t('reservation.cancel')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <View style={s.detailIconWrap}>
        <Ionicons name={icon as any} size={16} color={Colors.primary} />
      </View>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
  },
  retryBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 15,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },

  scrollContent: {
    padding: 20,
    gap: 16,
  },

  heroSection: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  heroCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  codeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  codeLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  codeValue: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 4,
  },

  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restaurantIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  requestsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  requestsText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },

  actions: {
    gap: 10,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorLight,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.error}25`,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
  },

  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  reviewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starHint: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 12,
  },
  reviewInput: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    minHeight: 80,
    marginTop: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewSubmit: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewSubmitDisabled: {
    opacity: 0.4,
  },
  reviewSubmitTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  reviewDoneWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  reviewDoneTxt: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  cardGuaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  cardGuaranteeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },
  noShowChargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorLight,
    borderRadius: 10,
    padding: 10,
  },
  noShowChargeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
});
