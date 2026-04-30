import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { apiRestaurant } from '@/services/api';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isPopular: boolean;
  isAvailable: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  items: MenuItem[];
}

export default function MenuScreen() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingItem, setEditingItem] = useState<{
    catId: string;
    item: MenuItem | null;
  } | null>(null);

  const load = async () => {
    try {
      const { data } = await apiRestaurant<{ data: MenuCategory[] }>('/restaurant/menu');
      setCategories(data ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo cargar el menu');
    }
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await apiRestaurant('/restaurant/menu/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      setNewCatName('');
      setCreatingCat(false);
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const deleteCategory = (id: string) => {
    Alert.alert('Eliminar categoria', 'Se eliminaran tambien sus platos', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRestaurant(`/restaurant/menu/categories/${id}`, { method: 'DELETE' });
            await load();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const deleteItem = (id: string) => {
    Alert.alert('Eliminar plato', '', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRestaurant(`/restaurant/menu/items/${id}`, { method: 'DELETE' });
            await load();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Menu</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setCreatingCat(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.addBtnText}>Categoria</Text>
          </TouchableOpacity>
        </View>

        {categories.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Aun no tienes categorias en tu menu</Text>
          </View>
        ) : (
          categories.map((cat) => (
            <View key={cat.id} style={styles.catCard}>
              <View style={styles.catHeader}>
                <Text style={styles.catName}>{cat.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => setEditingItem({ catId: cat.id, item: null })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => deleteCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              {cat.items.length === 0 ? (
                <Text style={styles.catEmpty}>Sin platos</Text>
              ) : (
                cat.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.itemImg} />
                    ) : (
                      <View style={[styles.itemImg, styles.itemImgPh]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>
                        {item.name} {item.isPopular ? '⭐' : ''}
                      </Text>
                      {item.description ? (
                        <Text style={styles.itemDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.itemPrice}>{item.price.toFixed(2)}EUR</Text>
                    <TouchableOpacity
                      onPress={() => setEditingItem({ catId: cat.id, item })}
                    >
                      <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteItem(item.id)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={creatingCat} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setCreatingCat(false)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Nueva categoria</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor={Colors.textTertiary}
              value={newCatName}
              onChangeText={setNewCatName}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setCreatingCat(false);
                  setNewCatName('');
                }}
              >
                <Text style={{ color: Colors.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtnFull} onPress={addCategory}>
                <Text style={{ color: Colors.white, fontWeight: '700' }}>Crear</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ItemEditor
        visible={!!editingItem}
        catId={editingItem?.catId ?? ''}
        item={editingItem?.item ?? null}
        onClose={() => setEditingItem(null)}
        onSaved={() => {
          setEditingItem(null);
          load();
        }}
      />
    </SafeAreaView>
  );
}

interface ItemEditorProps {
  visible: boolean;
  catId: string;
  item: MenuItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function ItemEditor({ visible, catId, item, onClose, onSaved }: ItemEditorProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(item?.name ?? '');
    setDesc(item?.description ?? '');
    setPrice(item?.price ? String(item.price) : '');
  }, [item, visible]);

  const save = async () => {
    if (!name.trim() || !price) {
      Alert.alert('Datos requeridos', 'Nombre y precio son obligatorios');
      return;
    }
    setBusy(true);
    try {
      const body = {
        categoryId: catId,
        name: name.trim(),
        description: desc.trim() || undefined,
        price: Number(price.replace(',', '.')),
      };
      if (item) {
        await apiRestaurant(`/restaurant/menu/items/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiRestaurant('/restaurant/menu/items', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{item ? 'Editar plato' : 'Nuevo plato'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            placeholderTextColor={Colors.textTertiary}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            placeholder="Descripcion"
            placeholderTextColor={Colors.textTertiary}
            value={desc}
            onChangeText={setDesc}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Precio (EUR)"
            placeholderTextColor={Colors.textTertiary}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy}>
              <Text style={{ color: Colors.text, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtnFull} onPress={save} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={{ color: Colors.white, fontWeight: '700' }}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', gap: 8, padding: 60 },
  emptyText: { color: Colors.textSecondary },
  catCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    gap: 10,
  },
  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  catEmpty: { color: Colors.textTertiary, fontSize: 13, fontStyle: 'italic' },
  smallBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  itemImg: { width: 44, height: 44, borderRadius: 10 },
  itemImgPh: { backgroundColor: Colors.surfaceSecondary },
  itemName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  itemDesc: { fontSize: 12, color: Colors.textSecondary },
  itemPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  input: {
    backgroundColor: Colors.background,
    color: Colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtnFull: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
});
