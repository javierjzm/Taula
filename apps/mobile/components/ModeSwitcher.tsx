import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useModeStore } from '@/stores/modeStore';

export function ModeSwitcher() {
  const ownerships = useAuthStore((s) => s.ownerships);
  const mode = useModeStore((s) => s.mode);
  const activeRestaurantId = useModeStore((s) => s.activeRestaurantId);
  const switchToRestaurant = useModeStore((s) => s.switchToRestaurant);
  const switchToClient = useModeStore((s) => s.switchToClient);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (ownerships.length === 0) return null;

  const activeName =
    mode === 'restaurant'
      ? ownerships.find((o) => o.restaurantId === activeRestaurantId)?.restaurantName ??
        'Restaurante'
      : 'Modo cliente';

  const handleSwitchToRestaurant = async (restaurantId: string) => {
    setBusy(true);
    try {
      await switchToRestaurant(restaurantId, ownerships);
      setOpen(false);
      router.replace('/(restaurant)/agenda');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo cambiar de modo');
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchToClient = async () => {
    setBusy(true);
    try {
      await switchToClient();
      setOpen(false);
      router.replace('/(tabs)');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
      >
        <View style={styles.triggerIcon}>
          <Ionicons
            name={mode === 'restaurant' ? 'storefront' : 'person'}
            size={18}
            color={Colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.triggerLabel}>
            {mode === 'restaurant' ? 'Modo restaurante' : 'Modo cliente'}
          </Text>
          <Text style={styles.triggerSub}>{activeName}</Text>
        </View>
        <Ionicons name="swap-horizontal" size={18} color={Colors.primary} />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent
        visible={open}
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => !busy && setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Cambiar de modo</Text>

            <TouchableOpacity
              style={[styles.row, mode === 'client' && styles.rowActive]}
              onPress={handleSwitchToClient}
              disabled={busy || mode === 'client'}
              activeOpacity={0.7}
            >
              <Ionicons name="person" size={20} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Modo cliente</Text>
                <Text style={styles.rowSub}>Buscar y reservar</Text>
              </View>
              {mode === 'client' ? (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              ) : null}
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Tus restaurantes</Text>

            {ownerships.map((o) => {
              const isActive = mode === 'restaurant' && activeRestaurantId === o.restaurantId;
              return (
                <TouchableOpacity
                  key={o.restaurantId}
                  style={[styles.row, isActive && styles.rowActive]}
                  onPress={() => handleSwitchToRestaurant(o.restaurantId)}
                  disabled={busy || isActive}
                  activeOpacity={0.7}
                >
                  <Ionicons name="storefront" size={20} color={Colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{o.restaurantName}</Text>
                    <Text style={styles.rowSub}>
                      {o.plan ? `Plan ${planLabel(o.plan)}` : 'Sin plan'}
                    </Text>
                  </View>
                  {isActive ? (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}

            {busy ? <ActivityIndicator style={{ marginTop: 12 }} color={Colors.primary} /> : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function planLabel(plan: string): string {
  switch (plan) {
    case 'RESERVATIONS':
      return 'Reservations';
    case 'LISTING_BASIC':
      return 'Listing';
    case 'LISTING_FEATURED':
      return 'Featured';
    default:
      return plan;
  }
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  triggerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  triggerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  rowSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
