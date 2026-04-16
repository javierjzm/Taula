import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { format, addDays } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { api } from '@/services/api';
import type {
  AvailableSlot,
  CreateReservationInput,
  Reservation,
  ApiResponse,
} from '@taula/shared';

const TOTAL_STEPS = 4;

export default function NewReservationScreen() {
  const { restaurantId, slug, name } = useLocalSearchParams<{
    restaurantId: string;
    slug: string;
    name: string;
  }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const restaurantName = decodeURIComponent(name || '');

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 60), 'yyyy-MM-dd');

  const { data: slotsRes, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', slug, selectedDate, partySize],
    queryFn: () =>
      api<ApiResponse<AvailableSlot[]>>(
        `/restaurants/${slug}/slots?date=${selectedDate}&partySize=${partySize}`,
      ),
    enabled: !!selectedDate && step >= 2,
  });

  const slots = slotsRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (input: CreateReservationInput) =>
      api<ApiResponse<Reservation>>('/reservations', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (res) => {
      router.replace(`/reservation/${res.data.id}`);
    },
    onError: (err: Error) => {
      Alert.alert(t('common.error'), err.message);
    },
  });

  const markedDates = useMemo(() => {
    if (!selectedDate) return {};
    return {
      [selectedDate]: {
        selected: true,
        selectedColor: Colors.primary,
        selectedTextColor: Colors.white,
      },
    };
  }, [selectedDate]);

  const progress = step / TOTAL_STEPS;

  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return !!selectedDate;
      case 2:
        return !!selectedSlot;
      case 3:
        return partySize >= 1;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot || !restaurantId) return;
    createMutation.mutate({
      restaurantId,
      slotId: selectedSlot.id,
      date: selectedDate,
      time: selectedSlot.time,
      partySize,
      specialRequests: specialRequests.trim() || undefined,
    });
  };

  const stepTitles: Record<number, string> = {
    1: t('reservation.select_date'),
    2: t('reservation.select_time'),
    3: t('reservation.guests'),
    4: t('reservation.summary'),
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{restaurantName}</Text>
          <Text style={styles.headerSubtitle}>
            {t('reservation.step', { current: step, total: TOTAL_STEPS })}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Step title */}
      <Text style={styles.stepTitle}>{stepTitles[step]}</Text>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentInner}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Date */}
        {step === 1 && (
          <View style={styles.calendarWrapper}>
            <Calendar
              minDate={today}
              maxDate={maxDate}
              markedDates={markedDates}
              onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
              theme={{
                backgroundColor: Colors.surface,
                calendarBackground: Colors.surface,
                todayTextColor: Colors.primary,
                arrowColor: Colors.primary,
                selectedDayBackgroundColor: Colors.primary,
                selectedDayTextColor: Colors.white,
                dayTextColor: Colors.text,
                textDisabledColor: Colors.textTertiary,
                monthTextColor: Colors.text,
                textDayFontSize: 15,
                textMonthFontSize: 17,
                textDayHeaderFontSize: 13,
                textMonthFontWeight: '600',
                textDayFontWeight: '400',
                textDayHeaderFontWeight: '500',
              }}
            />
          </View>
        )}

        {/* Step 2: Time slots */}
        {step === 2 && (
          <View>
            {slotsLoading ? (
              <View style={styles.slotsLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : slots.length === 0 ? (
              <View style={styles.noSlots}>
                <Ionicons name="time-outline" size={48} color={Colors.border} />
                <Text style={styles.noSlotsText}>{t('reservation.no_slots')}</Text>
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.id === slot.id;
                  const isDisabled = slot.availableCovers < 1;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.slotCard,
                        isSelected && styles.slotCardSelected,
                        isDisabled && styles.slotCardDisabled,
                      ]}
                      onPress={() => !isDisabled && setSelectedSlot(slot)}
                      disabled={isDisabled}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.slotTime,
                          isSelected && styles.slotTimeSelected,
                          isDisabled && styles.slotTimeDisabled,
                        ]}
                      >
                        {slot.time}
                      </Text>
                      <Text
                        style={[
                          styles.slotCovers,
                          isSelected && styles.slotCoversSelected,
                          isDisabled && styles.slotCoversDisabled,
                        ]}
                      >
                        {t('reservation.covers_available', {
                          count: slot.availableCovers,
                        })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Step 3: Guests */}
        {step === 3 && (
          <View style={styles.guestsContainer}>
            <View style={styles.guestSelector}>
              <TouchableOpacity
                style={[styles.guestBtn, partySize <= 1 && styles.guestBtnDisabled]}
                onPress={() => partySize > 1 && setPartySize(partySize - 1)}
                disabled={partySize <= 1}
              >
                <Ionicons
                  name="remove"
                  size={24}
                  color={partySize <= 1 ? Colors.textTertiary : Colors.primary}
                />
              </TouchableOpacity>
              <View style={styles.guestCountWrapper}>
                <Text style={styles.guestCount}>{partySize}</Text>
                <Text style={styles.guestLabel}>
                  {partySize === 1 ? t('common.persons', { count: 1 }) : t('common.persons_plural', { count: partySize })}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.guestBtn, partySize >= 20 && styles.guestBtnDisabled]}
                onPress={() => partySize < 20 && setPartySize(partySize + 1)}
                disabled={partySize >= 20}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={partySize >= 20 ? Colors.textTertiary : Colors.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.requestsSection}>
              <Text style={styles.requestsLabel}>{t('reservation.special_requests')}</Text>
              <TextInput
                style={styles.requestsInput}
                value={specialRequests}
                onChangeText={setSpecialRequests}
                placeholder={t('reservation.special_requests')}
                placeholderTextColor={Colors.textTertiary}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconRow}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="restaurant" size={24} color={Colors.primary} />
                </View>
              </View>

              <Text style={styles.summaryRestaurant}>{restaurantName}</Text>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.summaryLabel}>{t('reservation.date')}</Text>
                <Text style={styles.summaryValue}>
                  {selectedDate
                    ? format(new Date(selectedDate + 'T00:00:00'), 'dd/MM/yyyy')
                    : '-'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.summaryLabel}>{t('reservation.time')}</Text>
                <Text style={styles.summaryValue}>{selectedSlot?.time ?? '-'}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.summaryLabel}>{t('reservation.party_size')}</Text>
                <Text style={styles.summaryValue}>{partySize}</Text>
              </View>

              {specialRequests.trim() ? (
                <View style={styles.summaryRow}>
                  <Ionicons name="chatbubble-outline" size={18} color={Colors.textSecondary} />
                  <Text style={styles.summaryLabel}>{t('reservation.special_requests')}</Text>
                  <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                    {specialRequests.trim()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom buttons */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {step < TOTAL_STEPS ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canGoNext() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canGoNext()}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextBtnText, !canGoNext() && styles.nextBtnTextDisabled]}>
              {t('reservation.next')}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={canGoNext() ? Colors.white : Colors.textTertiary}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.confirmBtn, createMutation.isPending && styles.confirmBtnLoading]}
            onPress={handleConfirm}
            disabled={createMutation.isPending}
            activeOpacity={0.8}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                <Text style={styles.confirmBtnText}>{t('reservation.confirm')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 16,
  },

  calendarWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  slotsLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  noSlots: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  noSlotsText: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 8,
  },
  slotCard: {
    width: '30%',
    flexGrow: 1,
    minWidth: 100,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  slotCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  slotCardDisabled: {
    opacity: 0.45,
  },
  slotTime: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  slotTimeSelected: {
    color: Colors.primary,
  },
  slotTimeDisabled: {
    color: Colors.textTertiary,
  },
  slotCovers: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  slotCoversSelected: {
    color: Colors.primary,
  },
  slotCoversDisabled: {
    color: Colors.textTertiary,
  },

  guestsContainer: {
    paddingHorizontal: 16,
    gap: 32,
    marginTop: 16,
  },
  guestSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  guestBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  guestBtnDisabled: {
    opacity: 0.4,
  },
  guestCountWrapper: {
    alignItems: 'center',
    minWidth: 80,
  },
  guestCount: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 56,
  },
  guestLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  requestsSection: {
    gap: 8,
  },
  requestsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  requestsInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    minHeight: 100,
  },

  summaryContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  summaryIconRow: {
    marginBottom: 12,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRestaurant: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  summaryDivider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    gap: 10,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },

  bottomBar: {
    backgroundColor: Colors.surface,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  nextBtnDisabled: {
    backgroundColor: Colors.surfaceSecondary,
  },
  nextBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  nextBtnTextDisabled: {
    color: Colors.textTertiary,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  confirmBtnLoading: {
    opacity: 0.7,
  },
  confirmBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
