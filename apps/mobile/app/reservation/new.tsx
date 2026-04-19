import { useState, useMemo, useEffect, useCallback } from 'react';
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
import {
  format,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isBefore,
  isAfter,
  isSameDay,
  isSameMonth,
  isToday as isDateToday,
  isTomorrow,
  parseISO,
} from 'date-fns';
import { es, ca, fr, enUS } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { api } from '@/services/api';
import type {
  CreateReservationInput,
  Reservation,
  ApiResponse,
} from '@taula/shared';

let CardField: any = null;
let confirmSetupIntentFn: any = null;
try {
  const stripeMod = require('@stripe/stripe-react-native');
  CardField = stripeMod.CardField;
  confirmSetupIntentFn = stripeMod.confirmSetupIntent;
} catch {
  // Stripe native not available (Expo Go)
}

interface SlotResult {
  time: string;
  serviceName: string;
  availableTables: number;
}

interface ZoneOption {
  id: string;
  name: string;
}

interface RestaurantNoShowInfo {
  noShowProtection: boolean;
  noShowFeePerPerson: number;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');
const PARTY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20];

function formatDateLabel(dateStr: string, t: (k: string) => string): string {
  try {
    const d = parseISO(dateStr);
    if (isDateToday(d)) return t('reservation.today');
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

const LOCALE_MAP: Record<string, any> = { es, ca, fr, en: enUS };

function SimpleCalendar({
  selectedDate,
  minDate,
  maxDate,
  onDayPress,
}: {
  selectedDate: string | null;
  minDate: string;
  maxDate: string;
  onDayPress: (dateStr: string) => void;
}) {
  const initial = selectedDate ? parseISO(selectedDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initial);
  const { i18n } = useTranslation();
  const loc = LOCALE_MAP[i18n.language] ?? es;

  const minD = parseISO(minDate);
  const maxD = parseISO(maxDate);

  const canPrev = isAfter(startOfMonth(currentMonth), minD);
  const canNext = isBefore(endOfMonth(currentMonth), maxD);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const dayHeaders = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(calStart, i);
    return format(d, 'EEEEEE', { locale: loc }).toUpperCase();
  });

  return (
    <View>
      <View style={cs.header}>
        <TouchableOpacity
          onPress={() => canPrev && setCurrentMonth(subMonths(currentMonth, 1))}
          style={[cs.arrow, !canPrev && cs.arrowDisabled]}
          disabled={!canPrev}
        >
          <Ionicons name="chevron-back" size={20} color={canPrev ? Colors.primary : Colors.textTertiary} />
        </TouchableOpacity>
        <Text style={cs.monthLabel}>
          {format(currentMonth, 'MMMM yyyy', { locale: loc }).replace(/^\w/, (c) => c.toUpperCase())}
        </Text>
        <TouchableOpacity
          onPress={() => canNext && setCurrentMonth(addMonths(currentMonth, 1))}
          style={[cs.arrow, !canNext && cs.arrowDisabled]}
          disabled={!canNext}
        >
          <Ionicons name="chevron-forward" size={20} color={canNext ? Colors.primary : Colors.textTertiary} />
        </TouchableOpacity>
      </View>
      <View style={cs.dayHeaderRow}>
        {dayHeaders.map((h, i) => (
          <Text key={i} style={cs.dayHeaderText}>{h}</Text>
        ))}
      </View>
      <View style={cs.grid}>
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, currentMonth);
          const disabled = !inMonth || isBefore(day, minD) || isAfter(day, maxD);
          const selected = selectedDate ? isSameDay(day, parseISO(selectedDate)) : false;
          const today = isDateToday(day);
          return (
            <TouchableOpacity
              key={i}
              style={[cs.dayCell, selected && cs.dayCellSelected]}
              onPress={() => !disabled && onDayPress(dateStr)}
              disabled={disabled}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  cs.dayText,
                  !inMonth && cs.dayTextHidden,
                  disabled && inMonth && cs.dayTextDisabled,
                  today && !selected && cs.dayTextToday,
                  selected && cs.dayTextSelected,
                ]}
              >
                {inMonth ? day.getDate() : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  arrow: { padding: 8 },
  arrowDisabled: { opacity: 0.3 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  dayHeaderText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },
  dayText: { fontSize: 15, fontWeight: '500', color: Colors.text },
  dayTextHidden: { color: 'transparent' },
  dayTextDisabled: { color: Colors.textTertiary },
  dayTextToday: { color: Colors.primary, fontWeight: '700' },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
});

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
  const [selectedSlot, setSelectedSlot] = useState<SlotResult | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | undefined>(undefined);
  const [specialRequests, setSpecialRequests] = useState('');
  const [showCalendar, setShowCalendar] = useState(true);
  const [showRequests, setShowRequests] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [savingCard, setSavingCard] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 60), 'yyyy-MM-dd');

  const { data: restaurantDetail } = useQuery({
    queryKey: ['restaurant-detail', slug],
    queryFn: () => api<ApiResponse<RestaurantNoShowInfo>>(`/restaurants/${slug}`),
    enabled: !!slug,
  });
  const noShowProtection = restaurantDetail?.data?.noShowProtection ?? false;
  const noShowFee = restaurantDetail?.data?.noShowFeePerPerson ?? 0;

  const { data: zonesRes } = useQuery({
    queryKey: ['zones', slug],
    queryFn: () => api<ApiResponse<ZoneOption[]>>(`/restaurants/${slug}/zones`),
    enabled: !!slug,
  });
  const zones = zonesRes?.data ?? [];

  const { data: slotsRes, isLoading: slotsLoading, isFetching } = useQuery({
    queryKey: ['slots', slug, selectedDate, partySize, selectedZone],
    queryFn: () => {
      const params = new URLSearchParams({
        date: selectedDate!,
        partySize: String(partySize),
      });
      if (selectedZone) params.set('zoneId', selectedZone);
      return api<ApiResponse<SlotResult[]>>(
        `/restaurants/${slug}/slots?${params.toString()}`,
      );
    },
    enabled: !!selectedDate,
  });

  const slots = slotsRes?.data ?? [];

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate, partySize, selectedZone]);

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

  const handleDaySelect = (dateStr: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDate(dateStr);
    setShowCalendar(false);
  };

  const handleConfirm = useCallback(async () => {
    if (!selectedDate || !selectedSlot || !restaurantId) return;

    if (noShowProtection && CardField && confirmSetupIntentFn) {
      setSavingCard(true);
      try {
        const setupRes = await api<ApiResponse<{ clientSecret: string }>>('/reservations/setup-intent', {
          method: 'POST',
        });
        const { error, setupIntent } = await confirmSetupIntentFn(setupRes.data.clientSecret, {
          paymentMethodType: 'Card',
        });
        if (error) {
          Alert.alert(t('common.error'), error.message);
          setSavingCard(false);
          return;
        }
        const reservation = await createMutation.mutateAsync({
          restaurantId,
          date: selectedDate,
          time: selectedSlot.time,
          partySize,
          zoneId: selectedZone,
          specialRequests: specialRequests.trim() || undefined,
        });
        if (setupIntent?.paymentMethodId) {
          await api(`/reservations/${reservation.data.id}/card-guarantee`, {
            method: 'POST',
            body: JSON.stringify({ paymentMethodId: setupIntent.paymentMethodId }),
          });
        }
        setSavingCard(false);
        router.replace(`/reservation/${reservation.data.id}`);
      } catch (err: any) {
        setSavingCard(false);
        Alert.alert(t('common.error'), err.message);
      }
    } else {
      createMutation.mutate({
        restaurantId,
        date: selectedDate,
        time: selectedSlot.time,
        partySize,
        zoneId: selectedZone,
        specialRequests: specialRequests.trim() || undefined,
      });
    }
  }, [selectedDate, selectedSlot, restaurantId, noShowProtection, partySize, selectedZone, specialRequests]);

  const needsCard = noShowProtection && !cardComplete;
  const canConfirm = !!selectedDate && !!selectedSlot && partySize >= 1 && (!noShowProtection || !CardField || cardComplete);

  const serviceGroups = useMemo(() => {
    const groups: Record<string, SlotResult[]> = {};
    for (const sl of slots) {
      const key = sl.serviceName || 'default';
      if (!groups[key]) groups[key] = [];
      groups[key].push(sl);
    }
    return Object.entries(groups);
  }, [slots]);

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
              <SimpleCalendar
                selectedDate={selectedDate}
                minDate={today}
                maxDate={maxDate}
                onDayPress={handleDaySelect}
              />
            </View>
          )}
        </View>

        {/* 2. ZONE SELECTOR (optional) */}
        {selectedDate && zones.length > 1 && (
          <View style={s.section}>
            <SectionHeader
              icon="location-outline"
              title={t('reservation.select_zone')}
              subtitle={zones.find((z) => z.id === selectedZone)?.name}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.partyRow}
            >
              <TouchableOpacity
                style={[s.zoneChip, !selectedZone && s.zoneChipActive]}
                onPress={() => setSelectedZone(undefined)}
                activeOpacity={0.7}
              >
                <Text style={[s.zoneChipText, !selectedZone && s.zoneChipTextActive]}>
                  {t('common.all')}
                </Text>
              </TouchableOpacity>
              {zones.map((zone) => {
                const active = selectedZone === zone.id;
                return (
                  <TouchableOpacity
                    key={zone.id}
                    style={[s.zoneChip, active && s.zoneChipActive]}
                    onPress={() => setSelectedZone(zone.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.zoneChipText, active && s.zoneChipTextActive]}>
                      {zone.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 3. PARTY SIZE SECTION */}
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

        {/* 4. TIME SLOTS SECTION */}
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
                {serviceGroups.map(([serviceName, groupSlots]) => (
                  <View key={serviceName} style={s.timeGroup}>
                    <View style={s.timeGroupLabel}>
                      <Ionicons name="restaurant-outline" size={14} color={Colors.primary} />
                      <Text style={s.timeGroupText}>{serviceName}</Text>
                    </View>
                    <View style={s.slotsGrid}>
                      {groupSlots.map((slot) => {
                        const active = selectedSlot?.time === slot.time;
                        return (
                          <TouchableOpacity
                            key={slot.time}
                            style={[s.slotChip, active && s.slotChipActive]}
                            onPress={() => setSelectedSlot(slot)}
                            activeOpacity={0.7}
                          >
                            <Text style={[s.slotTime, active && s.slotTimeActive]}>
                              {slot.time}
                            </Text>
                            <Text style={[s.slotAvail, active && s.slotAvailActive]}>
                              {slot.availableTables} {t('reservation.tables_available')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
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

        {/* 5. CARD GUARANTEE */}
        {selectedDate && selectedSlot && noShowProtection && (
          <View style={s.section}>
            <SectionHeader
              icon="shield-checkmark-outline"
              title={t('reservation.card_guarantee')}
              subtitle={`${noShowFee}€ / ${t('reservation.per_person')}`}
            />
            <View style={s.cardGuaranteeBanner}>
              <View style={s.cardGuaranteeIconWrap}>
                <Ionicons name="card-outline" size={24} color="#D97706" />
              </View>
              <Text style={s.cardGuaranteeText}>
                {t('reservation.card_guarantee_info', { fee: noShowFee })}
              </Text>
            </View>
            {CardField ? (
              <View style={s.cardFieldWrap}>
                <CardField
                  postalCodeEnabled={false}
                  placeholders={{ number: '4242 4242 4242 4242' }}
                  cardStyle={{
                    backgroundColor: Colors.surfaceSecondary,
                    textColor: Colors.text,
                    borderColor: Colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    fontSize: 15,
                  }}
                  style={s.cardField}
                  onCardChange={(details: any) => setCardComplete(details.complete)}
                />
              </View>
            ) : (
              <View style={s.cardDevInfo}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.textTertiary} />
                <Text style={s.cardDevInfoText}>{t('reservation.card_dev_mode')}</Text>
              </View>
            )}
          </View>
        )}

        {/* 6. SUMMARY */}
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
          disabled={!canConfirm || createMutation.isPending || savingCard}
          activeOpacity={0.85}
        >
          {createMutation.isPending || savingCard ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons
                name={noShowProtection ? 'shield-checkmark' : 'checkmark-circle'}
                size={22}
                color={canConfirm ? Colors.white : Colors.textTertiary}
              />
              <Text style={[s.confirmBtnText, !canConfirm && s.confirmBtnTextDisabled]}>
                {noShowProtection ? t('reservation.confirm_with_card') : t('reservation.confirm')}
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
  zoneChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  zoneChipActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  zoneChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  zoneChipTextActive: {
    color: Colors.primary,
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

  cardGuaranteeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  cardGuaranteeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardGuaranteeText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
    fontWeight: '500',
  },
  cardFieldWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  cardDevInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
  },
  cardDevInfoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textTertiary,
    lineHeight: 17,
  },
});
