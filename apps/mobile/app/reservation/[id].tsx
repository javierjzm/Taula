import { useEffect, useRef } from 'react';
import {
  View,
  Text,
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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  CONFIRMED: { bg: `${Colors.success}18`, text: Colors.success },
  ARRIVED: { bg: `${Colors.primary}18`, text: Colors.primary },
  NO_SHOW: { bg: `${Colors.warning}18`, text: Colors.warning },
  CANCELLED_USER: { bg: `${Colors.error}18`, text: Colors.error },
  CANCELLED_RESTAURANT: { bg: `${Colors.error}18`, text: Colors.error },
};

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (isError || !reservation) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[reservation.status] ?? STATUS_COLORS.CONFIRMED;
  const isConfirmed = reservation.status === 'CONFIRMED';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('reservation.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Success animation */}
        <Animated.View
          style={[
            styles.successSection,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={Colors.white} />
          </View>
          <Text style={styles.confirmedTitle}>{t('reservation.confirmed')}</Text>
          <Text style={styles.successMessage}>{t('reservation.success_message')}</Text>
        </Animated.View>

        {/* Reservation code */}
        <Animated.View style={[styles.codeCard, { opacity: opacityAnim }]}>
          <Text style={styles.codeLabel}>{t('reservation.code')}</Text>
          <Text style={styles.codeValue}>{reservation.code}</Text>
        </Animated.View>

        {/* Details card */}
        <View style={styles.detailCard}>
          <TouchableOpacity
            style={styles.restaurantRow}
            onPress={() => {
              /* Navigate to restaurant if slug is available */
            }}
          >
            <View style={styles.restaurantIcon}>
              <Ionicons name="restaurant" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.restaurantName}>{reservation.restaurantName}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>{t('reservation.date')}</Text>
            <Text style={styles.detailValue}>{formatDate(reservation.date)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>{t('reservation.time')}</Text>
            <Text style={styles.detailValue}>{reservation.time}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>{t('reservation.party_size')}</Text>
            <Text style={styles.detailValue}>{reservation.partySize}</Text>
          </View>

          {reservation.specialRequests ? (
            <View style={styles.detailRow}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.detailLabel}>{t('reservation.special_requests')}</Text>
              <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                {reservation.specialRequests}
              </Text>
            </View>
          ) : null}

          <View style={styles.detailDivider} />

          <View style={styles.statusRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {t(`status.${reservation.status}`)}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={Colors.primary} />
            <Text style={styles.shareBtnText}>{t('reservation.share')}</Text>
          </TouchableOpacity>

          {isConfirmed && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
                  <Text style={styles.cancelBtnText}>{t('reservation.cancel')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
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
    fontWeight: '500',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
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
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },

  scrollContent: {
    padding: 20,
    gap: 20,
  },

  successSection: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  successMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  codeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  codeLabel: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 3,
  },

  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 4,
  },
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
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
  detailLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },

  actions: {
    gap: 12,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.error}08`,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
});
