import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Trash2, Save, GripVertical, ChevronDown, ChevronRight, Pencil, UtensilsCrossed, Star, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  allergens: string[];
  tags: string[];
  isAvailable: boolean;
  isPopular: boolean;
  sortOrder: number;
}

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

const ALLERGENS = [
  'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy',
  'dairy', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
];

const ALLERGEN_LABELS: Record<string, string> = {
  gluten: 'Gluten', crustaceans: 'Crustacis', eggs: 'Ous', fish: 'Peix',
  peanuts: 'Cacauets', soy: 'Soja', dairy: 'Lactis', nuts: 'Fruits secs',
  celery: 'Api', mustard: 'Mostassa', sesame: 'Sèsam', sulphites: 'Sulfits',
  lupin: 'Tramús', molluscs: 'Mol·luscs',
};

export default function MenuManager() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [newCatName, setNewCatName] = useState('');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: 0, image: '', allergens: [] as string[],
    tags: [] as string[], isPopular: false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload?folder=menu', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.data?.url;
      if (url) setItemForm((f) => ({ ...f, image: url }));
    } catch (e) { console.error('Upload error:', e); }
    setUploading(false);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) uploadImage(file);
  }, [uploadImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    e.target.value = '';
  }, [uploadImage]);

  const fetchMenu = async () => {
    try {
      const res = await api.get('/menu');
      setCategories(res.data.data);
      if (res.data.data.length > 0 && expandedCats.size === 0) {
        setExpandedCats(new Set([res.data.data[0].id]));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchMenu(); }, []);

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await api.post('/menu/categories', { name: newCatName.trim(), sortOrder: categories.length });
    setNewCatName('');
    fetchMenu();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Eliminar categoria i tots els seus plats?')) return;
    await api.delete(`/menu/categories/${id}`);
    fetchMenu();
  };

  const openNewItem = (catId: string) => {
    setEditingItem(null);
    setEditingCatId(catId);
    setItemForm({ name: '', description: '', price: 0, image: '', allergens: [], tags: [], isPopular: false });
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setEditingCatId(item.categoryId);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price,
      image: item.image || '',
      allergens: item.allergens,
      tags: item.tags,
      isPopular: item.isPopular,
    });
  };

  const saveItem = async () => {
    if (!itemForm.name.trim() || !editingCatId) return;
    setSaving(true);
    const payload = {
      categoryId: editingCatId,
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || undefined,
      price: itemForm.price,
      image: itemForm.image.trim() || undefined,
      allergens: itemForm.allergens,
      tags: itemForm.tags,
      isPopular: itemForm.isPopular,
    };
    try {
      if (editingItem) {
        await api.patch(`/menu/items/${editingItem.id}`, payload);
      } else {
        await api.post('/menu/items', payload);
      }
      setEditingCatId(null);
      setEditingItem(null);
      fetchMenu();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Eliminar plat?')) return;
    await api.delete(`/menu/items/${id}`);
    fetchMenu();
  };

  const toggleAllergen = (a: string) => {
    setItemForm((f) => ({
      ...f,
      allergens: f.allergens.includes(a) ? f.allergens.filter((x) => x !== a) : [...f.allergens, a],
    }));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-taula-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carta</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona les categories i plats del teu restaurant</p>
        </div>
      </div>

      {/* Add category */}
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm focus:ring-2 focus:ring-taula-primary/30 focus:border-taula-primary"
          placeholder="Nova categoria (Entrants, Principals, Postres...)"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
        />
        <button
          onClick={addCategory}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-taula-primary text-white text-sm font-medium hover:bg-taula-primary/90"
        >
          <Plus className="h-4 w-4" /> Afegir
        </button>
      </div>

      {categories.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border">
          <UtensilsCrossed className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Encara no tens categories</p>
          <p className="text-sm text-gray-400 mt-1">Crea categories per organitzar la teva carta</p>
        </div>
      )}

      {/* Categories + Items */}
      {categories.map((cat) => {
        const expanded = expandedCats.has(cat.id);
        return (
          <div key={cat.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div
              className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleCat(cat.id)}
            >
              <GripVertical className="h-4 w-4 text-gray-300" />
              {expanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                <p className="text-xs text-gray-400">{cat.items.length} plat{cat.items.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {expanded && (
              <div className="border-t">
                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0 hover:bg-gray-50 group"
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                        <UtensilsCrossed className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        {item.isPopular && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                        {!item.isAvailable && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Esgotat</span>}
                      </div>
                      {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
                      {item.allergens.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.allergens.map((a) => (
                            <span key={a} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{ALLERGEN_LABELS[a] || a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 tabular-nums">{item.price.toFixed(2)} €</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditItem(item)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-gray-500" /></button>
                      <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => openNewItem(cat.id)}
                  className="flex items-center gap-2 w-full px-5 py-3 text-sm text-taula-primary font-medium hover:bg-taula-primary/5 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Afegir plat
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Item edit modal */}
      {editingCatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingCatId(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl">
              <h3 className="font-bold text-lg text-gray-900">
                {editingItem ? 'Editar plat' : 'Nou plat'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={itemForm.name}
                  onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nom del plat"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripció</label>
                <textarea
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ingredients, preparació..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preu (€) *</label>
                <input
                  type="number"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={itemForm.price}
                  min={0}
                  step={0.5}
                  onChange={(e) => setItemForm((f) => ({ ...f, price: Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto del plat</label>
                {itemForm.image ? (
                  <div className="relative group w-full h-40 rounded-xl overflow-hidden border">
                    <img src={itemForm.image} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white/90 rounded-lg hover:bg-white"
                      >
                        <Upload className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemForm((f) => ({ ...f, image: '' }))}
                        className="p-2 bg-white/90 rounded-lg hover:bg-white"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                      uploading ? 'border-taula-primary bg-taula-primary/5' : 'border-gray-200 hover:border-taula-primary hover:bg-gray-50',
                    )}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-6 w-6 text-taula-primary animate-spin" />
                        <span className="text-xs text-taula-primary font-medium">Pujant imatge...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6 text-gray-300" />
                        <span className="text-xs text-gray-400">Arrossega o fes clic per pujar</span>
                        <span className="text-[10px] text-gray-300">JPG, PNG, WebP — Màx 10 MB</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Al·lèrgens</label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGENS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAllergen(a)}
                      className={cn(
                        'text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                        itemForm.allergens.includes(a)
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50',
                      )}
                    >
                      {ALLERGEN_LABELS[a] || a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setItemForm((f) => ({ ...f, isPopular: !f.isPopular }))}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                    itemForm.isPopular
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-gray-200 text-gray-500',
                  )}
                >
                  <Star className={cn('h-4 w-4', itemForm.isPopular ? 'fill-amber-500 text-amber-500' : '')} />
                  Plat popular
                </button>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
              <button
                onClick={() => { setEditingCatId(null); setEditingItem(null); }}
                className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel·lar
              </button>
              <button
                onClick={saveItem}
                disabled={saving || !itemForm.name.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-taula-primary text-white text-sm font-medium hover:bg-taula-primary/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Desant...' : 'Desar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
