import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { apiRestaurant } from '@/services/api';

interface RestaurantData {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  website: string | null;
  cuisineType: string[];
  priceRange: number;
  coverImage: string | null;
  images: string[];
  externalReservationUrl: string | null;
  subscription?: { plan: string; status: string };
}

export default function RestaurantProfileScreen() {
  const [data, setData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  useEffect(() => {
    apiRestaurant<{ data: RestaurantData }>('/restaurant/me')
      .then((res) => {
        setData(res.data);
        setName(res.data.name ?? '');
        setDescription(res.data.description ?? '');
        setPhone(res.data.phone ?? '');
        setWebsite(res.data.website ?? '');
        setExternalUrl(res.data.externalReservationUrl ?? '');
      })
      .catch((err: any) =>
        Alert.alert('Error', err.message ?? 'No se pudo cargar el perfil'),
      )
      .finally(() => setLoading(false));
  }, []);

  const isListing =
    data?.subscription?.plan === 'LISTING_BASIC' ||
    data?.subscription?.plan === 'LISTING_FEATURED';

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name,
        description: description || undefined,
        phone: phone || undefined,
      };
      if (website) body.website = website;
      if (isListing) {
        body.externalReservationUrl = externalUrl || null;
      }
      await apiRestaurant('/restaurant/me', { method: 'PATCH', body: JSON.stringify(body) });
      Alert.alert('Guardado', 'Datos del restaurante actualizados');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
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
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Perfil del restaurante</Text>

        <Field label="Nombre" value={name} onChangeText={setName} />
        <Field
          label="Descripcion"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Field label="Telefono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Web" value={website} onChangeText={setWebsite} keyboardType="url" />

        {isListing ? (
          <Field
            label="URL de reservas externa"
            placeholder="https://tureservaweb.com"
            value={externalUrl}
            onChangeText={setExternalUrl}
            keyboardType="url"
          />
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color={Colors.white} />
              <Text style={styles.saveText}>Guardar cambios</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'url' | 'email-address';
}

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: FieldProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 88, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  saveText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
});
