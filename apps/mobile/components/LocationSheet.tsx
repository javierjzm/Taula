import { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { PARISHES } from '@/constants/andorra';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentCity: string;
  isGps: boolean;
  onSelectGps: () => void;
  onSelectParish: (parish: (typeof PARISHES)[number]) => void;
  gpsLoading?: boolean;
}

export default function LocationSheet({
  visible,
  onClose,
  currentCity,
  isGps,
  onSelectGps,
  onSelectParish,
  gpsLoading,
}: Props) {
  const { t } = useTranslation();
  const renderParish = useCallback(
    ({ item }: { item: (typeof PARISHES)[number] }) => {
      const isActive = !isGps && currentCity === item.name;
      return (
        <TouchableOpacity
          style={[s.row, isActive && s.rowActive]}
          onPress={() => {
            onSelectParish(item);
            onClose();
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="location-outline"
            size={20}
            color={isActive ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[s.rowTxt, isActive && s.rowTxtActive]}>{item.name}</Text>
          {isActive && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
        </TouchableOpacity>
      );
    },
    [currentCity, isGps, onSelectParish, onClose],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handleWrap}>
            <View style={s.handle} />
          </View>

          {/* Title */}
          <View style={s.titleRow}>
            <Text style={s.title}>{t('location.select_title')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* GPS button */}
          <TouchableOpacity
            style={[s.gpsBtn, isGps && s.gpsBtnActive]}
            onPress={() => {
              onSelectGps();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <View style={[s.gpsIcon, isGps && s.gpsIconActive]}>
              {gpsLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="navigate" size={20} color={isGps ? Colors.primary : Colors.textSecondary} />
              )}
            </View>
            <View style={s.gpsInfo}>
              <Text style={[s.gpsTitle, isGps && s.gpsTitleActive]}>{t('location.use_gps')}</Text>
              <Text style={s.gpsSub}>{t('location.gps_subtitle')}</Text>
            </View>
            {isGps && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>{t('location.choose_parish')}</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Parish list */}
          <FlatList
            data={PARISHES}
            keyExtractor={(p) => p.id}
            renderItem={renderParish}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.listContent}
          />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '75%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },

  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  gpsBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  gpsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsIconActive: {
    backgroundColor: 'rgba(212, 168, 83, 0.18)',
  },
  gpsInfo: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  gpsTitleActive: {
    color: Colors.primary,
  },
  gpsSub: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  listContent: {
    paddingHorizontal: 20,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 12,
  },
  rowActive: {
    backgroundColor: Colors.primaryGlow,
  },
  rowTxt: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  rowTxtActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
});
