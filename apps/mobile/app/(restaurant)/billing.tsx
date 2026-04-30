import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '@/constants/colors';
import { apiRestaurant } from '@/services/api';

interface SubscriptionInfo {
  id: string;
  plan: 'RESERVATIONS' | 'LISTING_BASIC' | 'LISTING_FEATURED';
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'ADMIN_GRANT';
  currentPeriodEnd: string | null;
  adminGranted: boolean;
  adminGrantUntil: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

interface BillingData {
  subscription: SubscriptionInfo | null;
  stripeAvailable: boolean;
  monthCovers: number;
  monthAmount: number;
}

const PLANS: Array<{
  id: SubscriptionInfo['plan'];
  label: string;
  price: string;
  perks: string[];
}> = [
  {
    id: 'RESERVATIONS',
    label: 'Taula Reservations',
    price: '20EUR/mes + 1EUR/comensal',
    perks: [
      'Sistema completo de reservas en Taula',
      'Agenda, calendario, mesas, menu, ofertas',
      'Notificaciones a clientes',
      'Proteccion no-show',
    ],
  },
  {
    id: 'LISTING_BASIC',
    label: 'Listing Basic',
    price: '49,99EUR/mes',
    perks: [
      'Aparece en la app y mapa',
      'Boton hacia tu URL de reservas externa',
      'Sin sistema de reservas Taula',
    ],
  },
  {
    id: 'LISTING_FEATURED',
    label: 'Listing Featured',
    price: '99,99EUR/mes',
    perks: [
      'Todo lo de Listing Basic',
      'Badge "Destacado"',
      'Seccion destacada en home',
      'Posicion top en busquedas y filtros',
    ],
  },
];

export default function BillingScreen() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await apiRestaurant<{ data: BillingData }>('/restaurant/billing/subscription');
      setData(data);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo cargar la facturacion');
    }
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (plan: SubscriptionInfo['plan']) => {
    setBusy(true);
    try {
      const { data } = await apiRestaurant<{ data: { url: string } }>(
        '/restaurant/billing/checkout',
        { method: 'POST', body: JSON.stringify({ plan }) },
      );
      await WebBrowser.openBrowserAsync(data.url);
      await load();
    } catch (err: any) {
      Alert.alert('Stripe', err.message ?? 'No se pudo abrir el checkout');
    } finally {
      setBusy(false);
    }
  };

  const handlePortal = async () => {
    setBusy(true);
    try {
      const { data } = await apiRestaurant<{ data: { url: string } }>(
        '/restaurant/billing/portal',
        { method: 'POST', body: JSON.stringify({}) },
      );
      await WebBrowser.openBrowserAsync(data.url);
      await load();
    } catch (err: any) {
      Alert.alert('Stripe', err.message ?? 'No se pudo abrir el portal');
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

  const sub = data?.subscription ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Plan y facturacion</Text>

        {sub ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>
              Plan actual: <Text style={styles.statusValue}>{labelForPlan(sub.plan)}</Text>
            </Text>
            <Text style={styles.statusLabel}>
              Estado: <Text style={styles.statusValue}>{labelForStatus(sub.status)}</Text>
            </Text>
            {sub.currentPeriodEnd ? (
              <Text style={styles.statusLabel}>
                Proxima renovacion:{' '}
                <Text style={styles.statusValue}>
                  {new Date(sub.currentPeriodEnd).toLocaleDateString('es')}
                </Text>
              </Text>
            ) : null}
            {sub.adminGranted ? (
              <Text style={styles.adminGrant}>Plan concedido por administracion</Text>
            ) : null}
          </View>
        ) : null}

        {sub?.plan === 'RESERVATIONS' ? (
          <View style={styles.usageCard}>
            <Text style={styles.usageLabel}>Consumo del mes (1EUR/comensal)</Text>
            <Text style={styles.usageAmount}>
              {(data?.monthAmount ?? 0).toFixed(2)} EUR
            </Text>
            <Text style={styles.usageSub}>
              {data?.monthCovers ?? 0} comensales facturables
            </Text>
          </View>
        ) : null}

        {!data?.stripeAvailable ? (
          <View style={styles.warning}>
            <Ionicons name="warning-outline" size={18} color={Colors.warning} />
            <Text style={styles.warningText}>
              Stripe no esta configurado en este entorno. Contacta con soporte para activar
              o cambiar de plan.
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Cambiar plan</Text>

        {PLANS.map((p) => {
          const isCurrent = sub?.plan === p.id;
          return (
            <View
              key={p.id}
              style={[styles.planCard, isCurrent && styles.planCardCurrent]}
            >
              <View style={styles.planHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{p.label}</Text>
                  <Text style={styles.planPrice}>{p.price}</Text>
                </View>
                {isCurrent ? (
                  <View style={styles.currentTag}>
                    <Text style={styles.currentTagText}>Actual</Text>
                  </View>
                ) : null}
              </View>

              {p.perks.map((perk) => (
                <View key={perk} style={styles.perkRow}>
                  <Ionicons name="checkmark" size={14} color={Colors.primary} />
                  <Text style={styles.perkText}>{perk}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.planBtn,
                  (isCurrent || !data?.stripeAvailable || busy) && { opacity: 0.4 },
                ]}
                onPress={() => handleCheckout(p.id)}
                disabled={isCurrent || !data?.stripeAvailable || busy}
                activeOpacity={0.8}
              >
                <Text style={styles.planBtnText}>
                  {isCurrent ? 'Plan activo' : 'Activar plan'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {sub?.stripeSubscriptionId || sub?.stripeCustomerId ? (
          <TouchableOpacity
            style={styles.portalBtn}
            onPress={handlePortal}
            disabled={busy}
            activeOpacity={0.8}
          >
            <Ionicons name="card-outline" size={18} color={Colors.primary} />
            <Text style={styles.portalBtnText}>Abrir portal de facturacion</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function labelForPlan(plan: string): string {
  if (plan === 'RESERVATIONS') return 'Reservations';
  if (plan === 'LISTING_BASIC') return 'Listing Basic';
  if (plan === 'LISTING_FEATURED') return 'Listing Featured';
  return plan;
}
function labelForStatus(s: string): string {
  switch (s) {
    case 'ACTIVE':
      return 'Activo';
    case 'TRIALING':
      return 'En prueba';
    case 'PAST_DUE':
      return 'Pago pendiente';
    case 'CANCELED':
      return 'Cancelado';
    case 'INCOMPLETE':
      return 'Pendiente de pago';
    case 'ADMIN_GRANT':
      return 'Concedido (gratis)';
    default:
      return s;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  statusCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  statusLabel: { fontSize: 13, color: Colors.textSecondary },
  statusValue: { color: Colors.text, fontWeight: '700' },
  adminGrant: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 6,
  },
  usageCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  usageLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '700' },
  usageAmount: { fontSize: 28, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  usageSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  warning: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.warning}40`,
    marginTop: 12,
  },
  warningText: { flex: 1, color: Colors.text, fontSize: 13 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  planCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    gap: 6,
  },
  planCardCurrent: { borderColor: Colors.primary },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  planName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  planPrice: { fontSize: 13, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  currentTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  currentTagText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  perkText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  planBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  planBtnText: { color: Colors.white, fontWeight: '800', fontSize: 14 },
  portalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: Colors.primaryGlow,
    borderRadius: 14,
    marginTop: 12,
  },
  portalBtnText: { color: Colors.primary, fontWeight: '700' },
});
