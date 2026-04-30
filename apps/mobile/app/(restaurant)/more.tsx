import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { ModeSwitcher } from '@/components/ModeSwitcher';
import { useAuthStore } from '@/stores/authStore';
import { useModeStore } from '@/stores/modeStore';

interface Item {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub?: string;
  onPress: () => void;
}

interface Section {
  title: string;
  items: Item[];
}

export default function RestaurantMoreScreen() {
  const ownerships = useAuthStore((s) => s.ownerships);
  const activeRestaurantId = useModeStore((s) => s.activeRestaurantId);
  const switchToClient = useModeStore((s) => s.switchToClient);
  const logout = useAuthStore((s) => s.logout);

  const active = ownerships.find((o) => o.restaurantId === activeRestaurantId);

  const sections: Section[] = [
    {
      title: 'Gestion del local',
      items: [
        {
          id: 'profile',
          icon: 'storefront-outline',
          label: 'Perfil del restaurante',
          sub: 'Datos, fotos y horarios',
          onPress: () => router.push('/(restaurant)/profile'),
        },
        {
          id: 'offers',
          icon: 'pricetag-outline',
          label: 'Ofertas',
          sub: 'Promociones visibles para clientes',
          onPress: () => router.push('/(restaurant)/offers'),
        },
        {
          id: 'blocked',
          icon: 'close-circle-outline',
          label: 'Dias bloqueados',
          sub: 'Vacaciones, cierres y servicios no disponibles',
          onPress: () => router.push('/(restaurant)/blocked-dates'),
        },
      ],
    },
    {
      title: 'Actividad',
      items: [
        {
          id: 'reviews',
          icon: 'star-outline',
          label: 'Resenas',
          sub: 'Lee y responde a clientes',
          onPress: () => router.push('/(restaurant)/reviews'),
        },
        {
          id: 'stats',
          icon: 'stats-chart-outline',
          label: 'Estadisticas',
          sub: 'Reservas, comensales y no-shows',
          onPress: () => router.push('/(restaurant)/stats'),
        },
        {
          id: 'notifs',
          icon: 'notifications-outline',
          label: 'Notificaciones',
          sub: 'Avisos del restaurante',
          onPress: () => router.push('/notifications?scope=restaurant'),
        },
      ],
    },
    {
      title: 'Cuenta',
      items: [
        {
          id: 'billing',
          icon: 'card-outline',
          label: 'Plan y facturacion',
          sub: active?.plan ? `Plan actual: ${planLabel(active.plan)}` : 'Sin plan',
          onPress: () => router.push('/(restaurant)/billing'),
        },
      ],
    },
  ];

  const handleLogout = () => {
    Alert.alert('Cerrar sesion', '', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesion',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Mas</Text>
        {active ? <Text style={styles.subtitle}>{active.restaurantName}</Text> : null}

        <ModeSwitcher />

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menu}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.row, i === section.items.length - 1 && styles.rowLast]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name={item.icon} size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.label}</Text>
                    {item.sub ? <Text style={styles.rowSub}>{item.sub}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={async () => {
            await switchToClient();
            router.replace('/(tabs)');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={18} color={Colors.primary} />
          <Text style={styles.secondaryBtnText}>Volver al modo cliente</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function planLabel(plan: string): string {
  switch (plan) {
    case 'RESERVATIONS':
      return 'Reservations (20EUR/mes + 1EUR comensal)';
    case 'LISTING_BASIC':
      return 'Listing Basic (49,99EUR/mes)';
    case 'LISTING_FEATURED':
      return 'Listing Featured (99,99EUR/mes)';
    default:
      return plan;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 40 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 0.6,
    marginHorizontal: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menu: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primaryGlow,
    gap: 8,
  },
  secondaryBtnText: { color: Colors.primary, fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.errorLight,
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.error}25`,
  },
  logoutText: { color: Colors.error, fontWeight: '700' },
});
