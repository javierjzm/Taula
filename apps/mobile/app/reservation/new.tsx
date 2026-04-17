import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { format, addDays, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { api } from '@/services/api';
import type {
  AvailableSlot,
  CreateReservationInput,
  Reservation,
  ApiResponse,
} from '@taula/shared';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');
const PARTY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20];

function formatDateLabel(dateStr: string, t: (k: string) => string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return t('reservation.today');
    if (isTomorrow(d)) return t('reservation.tomorrow');
    return format(d, "EEE d 'de' MMM", { locale: es });
  } catch {
    return dateStr;
  }
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionIconWrap}>
        <Ionicons name={icon as any} size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export default function NewReservationScreen() {
  const { restaurantId, slug, name } = useLocalSearchParams<{
    restaurantId: string;
    slug: string;
    name: string;
  }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const restaurantName = decodeURIComponent(name || '');

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [showCalendar, setShowCalendar] = useState(true);
  const [showRequests, setShowRequests] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 60), 'yyyy-MM-dd');

  const { data: slotsRes, isLoading: slotsLoading, isFetching } = useQuery({
    queryKey: ['slots', slug, selectedDate, partySize],
    queryFn: () =>
      api<ApiResponse<AvailableSlot[]>>(
        `/restaurants/${slug}/slots?date=${selectedDate}&partySize=${partySize}`,
      ),
    enabled: !!selectedDate,
  });

  const slots = slotsRes?.data ?? [];

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate, partySize]);

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

  const handleDayPress = (day: DateData) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDate(day.dateString);
    setShowCalendar(false);
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

  const canConfirm = !!selectedDate && !!selectedSlot && partySize >= 1;

  const lunchSlots = slots.filter((sl) => {
    const h = parseInt(sl.time.split(':')[0], 10);
    return h < 16;
  });
  const dinnerSlots = slots.filter((sl) => {
    const h = parseInt(sl.time.split(':')[0], 10);
    return h >= 16;
  });

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{restaurantName}</Text>
          <Text style={s.headerSubtitle}>{t('reservation.new_reservation')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. DATE SECTION */}
        <View style={s.section}>
          <SectionHeader
            icon="calendar-outline"
            title={t('reservation.select_date')}
            subtitle={selectedDate ? formatDateLabel(selectedDate, t) : undefined}
          />

          {selectedDate && !showCalendar ? (
            <TouchableOpacity
              style={s.dateChipRow}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowCalendar(true);
              }}
              activeOpacity={0.7}
            >
              <View style={s.dateChip}>
                <Ionicons name="calendar" size={16} color={Colors.primary} />
                <Text style={s.dateChipText}>{formatDateLabel(selectedDate, t)}</Text>
                <Text style={s.dateChipFull}>
                  {format(parseISO(selectedDate), 'dd/MM/yyyy')}
                </Text>
              </View>
              <View style={s.dateEditBtn}>
                <Ionicons name="pencil" size={14} color={Colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.calendarWrap}>
              <Calendar
                minDate={today}
                maxDate={maxDate}
                markedDates={markedDates}
                onDayPress={handleDayPress}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'transparent',
                  todayTextColor: Colors.primary,
                  arrowColor: Colors.primary,
                  selectedDayBackgroundColor: Colors.primary,
                  selectedDayTextColor: Colors.white,
                  dayTextColor: Colors.text,
                  textDisabledColor: Colors.textTertiary,
                  monthTextColor: Colors.text,
                  textDayFontSize: 15,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 12,
                  textMonthFontWeight: '700',
                  textDayFontWeight: '500',
                  textDayHeaderFontWeight: '600',
                  textSectionTitleColor: Colors.textSecondary,
                }}
              />
            </View>
          )}
        </View>

        {/* 2. PARTY SIZE SECTION */}
        {selectedDate && (
          <View style={s.section}>
            <SectionHeader
              icon="people-outline"
              title={t('reservation.guests')}
              subtitle={partySize === 1 ? t('common.persons', { count: 1 }) : t('common.persons_plural', { count: partySize })}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.partyRow}
            >
              {PARTY_OPTIONS.map((n) => {
                const active = partySize === n;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[s.partyChip, active && s.partyChipActive]}
                    onPress={() => setPartySize(n)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.partyChipText, active && s.partyChipTextActive]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 3. TIME SLOTS SECTION */}
        {selectedDate && (
          <View style={s.section}>
            <SectionHeader
              icon="time-outline"
              title={t('reservation.select_time')}
              subtitle={selectedSlot ? selectedSlot.time : undefined}
            />

            {slotsLoading || isFetching ? (
              <View style={s.slotsLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={s.loadingLabel}>{t('reservation.loading_slots')}</Text>
              </View>
            ) : slots.length === 0 ? (
              <View style={s.noSlots}>
                <View style={s.noSlotsIcon}>
                  <Ionicons name="moon-outline" size={28} color={Colors.textTertiary} />
                </View>
                <Text style={s.noSlotsTitle}>{t('reservation.no_slots')}</Text>
                <Text style={s.noSlotsHint}>{t('reservation.try_another_date')}</Text>
              </View>
            ) : (
              <View>
                {lunchSlots.length > 0 && (
                  <View style={s.timeGroup}>
                    <View style={s.timeGroupLabel}>
                      <Ionicons name="sunny-outline" size={14} color={Colors.warning} />
                      <Text style={s.timeGroupText}>{t('reservation.lunch')}</Text>
                    </View>
                    <View style={s.slotsGrid}>
                      {lunchSlots.map((slot) => {
                        const active = selectedSlot?.id === slot.id;
                        const disabled = slot.availableCovers < partySize;
                        return (
                          <TouchableOpacity
                            key={slot.id}
                            style={[s.slotChip, active && s.slotChipActive, disabled && s.slotChipDisabled]}
                            onPress={() => !disabled && setSelectedSlot(slot)}
                            disabled={disabled}
                            activeOpacity={0.7}
                          >
                            <Text style={[s.slotTime, active && s.slotTimeActive, disabled && s.slotTimeDisabled]}>
                              {slot.time}
                            </Text>
                            {!disabled && (
                              <Text style={[s.slotAvail, active && s.slotAvailActive]}>
                                {t('reservation.covers_available', { count: slot.availableCovers })}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
                {dinnerSlots.length > 0 && (
                  <View style={s.timeGroup}>
                    <View style={s.timeGroupLabel}>
                      <Ionicons name="moon-outline" size={14} color={Colors.accent} />
                      <Text style={s.timeGroupText}>{t('reservation.dinner')}</Text>
                    </View>
                    <View style={s.slotsGrid}>
                      {dinnerSlots.map((slot) => {
                        const active = selectedSlot?.id === slot.id;
                        const disabled = slot.availableCovers < partySize;
                        return (
                          <TouchableOpacity
                            key={slot.id}
                            style={[s.slotChip, active && s.slotChipActive, disabled && s.slotChipDisabled]}
                            onPress={() => !disabled && setSelectedSlot(slot)}
                            disabled={disabled}
                            activeOpacity={0.7}
                          >
                            <Text style={[s.slotTime, active && s.slotTimeActive, disabled && s.slotTimeDisabled]}>
                              {slot.time}
                            </Text>
                            {!disabled && (
                              <Text style={[s.slotAvail, active && s.slotAvailActive]}>
                                {t('reservation.covers_available', { count: slot.availableCovers })}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* 4. SPECIAL REQUESTS */}
        {selectedDate && selectedSlot && (
          <View style={s.section}>
            <TouchableOpacity
              style={s.requestsToggle}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowRequests(!showRequests);
              }}
              activeOpacity={0.7}
            >
              <View style={s.sectionIconWrap}>
                <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={s.sectionTitle}>{t('reservation.special_requests')}</Text>
              <Ionicons
                name={showRequests ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textTertiary}
              />
            </TouchableOpacity>
            {showRequests && (
              <TextInput
                style={s.requestsInput}
                value={specialRequests}
                onChangeText={setSpecialRequests}
                placeholder={t('reservation.requests_placeholder')}
                placeholderTextColor={Colors.textTertiary}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            )}
          </View>
        )}

        {/* 5. SUMMARY */}
        {canConfirm && (
          <View style={s.summaryCard}>
            <View style={s.summaryRow}>
              <Ionicons name="calendar" size={16} color={Colors.primary} />
              <Text style={s.summaryLabel}>{formatDateLabel(selectedDate!, t)}</Text>
            </View>
            <View style={s.summaryDot} />
            <View style={s.summaryRow}>
              <Ionicons name="time" size={16} color={Colors.primary} />
              <Text style={s.summaryLabel}>{selectedSlot!.time}h</Text>
            </View>
            <View style={s.summaryDot} />
            <View style={s.summaryRow}>
              <Ionicons name="people" size={16} color={Colors.primary} />
              <Text style={s.summaryLabel}>{partySize}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM CTA */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[s.confirmBtn, !canConfirm && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm || createMutation.isPending}
          activeOpacity={0.85}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={canConfirm ? Colors.white : Colors.textTertiary}
              />
              <Text style={[s.confirmBtnText, !canConfirm && s.confirmBtnTextDisabled]}>
                {t('reservation.confirm')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    maxWidth: SCREEN_W * 0.55,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingTop: 12 },

  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },

  calendarWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },

  dateChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryGlow,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  dateChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  dateChipFull: {
    fontSize: 13,
    color: Colors.primaryLight,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  dateEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  partyRow: {
    gap: 8,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  partyChip: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  partyChipActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  partyChipText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  partyChipTextActive: {
    color: Colors.primary,
  },

  slotsLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingLabel: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  noSlots: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  noSlotsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  noSlotsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  noSlotsHint: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  timeGroup: {
    marginBottom: 14,
  },
  timeGroupLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  timeGroupText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    minWidth: 90,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  slotChipActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  slotChipDisabled: {
    opacity: 0.3,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  slotTimeActive: {
    color: Colors.primary,
  },
  slotTimeDisabled: {
    color: Colors.textTertiary,
  },
  slotAvail: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  slotAvailActive: {
    color: Colors.primary,
  },

  requestsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestsInput: {
    marginTop: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    minHeight: 80,
    lineHeight: 22,
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  summaryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 16,
    gap: 10,
    ...Colors.shadow.md,
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  confirmBtnTextDisabled: {
    color: Colors.textTertiary,
  },
});
