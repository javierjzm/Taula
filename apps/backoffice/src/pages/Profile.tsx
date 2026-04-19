import { useEffect, useState, useCallback, useRef, type FormEvent } from 'react';
import { Save, Loader2, X, Upload, Plus, Trash2, Camera } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';

const CUISINE_OPTIONS = [
  { id: 'pizza_pasta', emoji: '🍕', label: 'Pizza & Pasta' },
  { id: 'burgers', emoji: '🍔', label: 'Burgers' },
  { id: 'sushi', emoji: '🍣', label: 'Sushi' },
  { id: 'steakhouse', emoji: '🥩', label: 'Steakhouse' },
  { id: 'seafood', emoji: '🦞', label: 'Seafood' },
  { id: 'healthy', emoji: '🥗', label: 'Healthy' },
  { id: 'asian', emoji: '🥢', label: 'Asian' },
  { id: 'mediterranean', emoji: '🫒', label: 'Mediterranean' },
  { id: 'mexican', emoji: '🌮', label: 'Mexican' },
  { id: 'tapas', emoji: '🥘', label: 'Tapas' },
  { id: 'brunch', emoji: '🥐', label: 'Brunch' },
  { id: 'fine_dining', emoji: '✨', label: 'Fine Dining' },
];

const PRICE_OPTIONS = [
  { value: 1, label: '€ — Econòmic' },
  { value: 2, label: '€€ — Moderat' },
  { value: 3, label: '€€€ — Alt' },
  { value: 4, label: '€€€€ — Premium' },
];

interface ProfileData {
  name: string;
  description: string;
  phone: string;
  website: string;
  cuisineType: string[];
  priceRange: number;
  coverImage: string;
  images: string[];
}

const emptyProfile: ProfileData = {
  name: '',
  description: '',
  phone: '',
  website: '',
  cuisineType: [],
  priceRange: 2,
  coverImage: '',
  images: [],
};

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/me');
        const d = res.data.data;
        setProfile({
          name: d.name ?? '',
          description: d.description ?? '',
          phone: d.phone ?? '',
          website: d.website ?? '',
          cuisineType: Array.isArray(d.cuisineType) ? d.cuisineType : [],
          priceRange: typeof d.priceRange === 'number' ? d.priceRange : 2,
          coverImage: d.coverImage ?? '',
          images: Array.isArray(d.images) ? d.images : [],
        });
      } catch {
        setError("No s'ha pogut carregar el perfil");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const uploadImage = useCallback(async (file: File, type: 'cover' | 'gallery') => {
    const setUploading = type === 'cover' ? setUploadingCover : setUploadingGallery;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload?folder=restaurants', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.data?.url;
      if (url) {
        if (type === 'cover') {
          setProfile((p) => ({ ...p, coverImage: url }));
        } else {
          setProfile((p) => ({ ...p, images: [...p.images, url] }));
        }
      }
    } catch (e) { console.error('Upload error:', e); }
    setUploading(false);
  }, []);

  const handleCoverSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, 'cover');
    e.target.value = '';
  }, [uploadImage]);

  const handleGallerySelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((f) => uploadImage(f, 'gallery'));
    }
    e.target.value = '';
  }, [uploadImage]);

  const removeGalleryImage = (idx: number) => {
    setProfile((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await api.patch('/me', {
        name: profile.name,
        description: profile.description,
        phone: profile.phone || undefined,
        website: profile.website || undefined,
        cuisineType: profile.cuisineType,
        priceRange: profile.priceRange,
        coverImage: profile.coverImage || null,
        images: profile.images,
      });
      localStorage.setItem('taula_restaurant_name', profile.name);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Error en desar els canvis");
    } finally {
      setSaving(false);
    }
  }

  function toggleCuisine(id: string) {
    setProfile((prev) => ({
      ...prev,
      cuisineType: prev.cuisineType.includes(id)
        ? prev.cuisineType.filter((c) => c !== id)
        : [...prev.cuisineType, id],
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-taula-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Perfil del Restaurant</h1>
        <p className="text-sm text-gray-500">Actualitza la informació pública del teu restaurant</p>
      </div>

      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">
              Canvis desats correctament!
            </div>
          )}

          {/* Cover Image */}
          <div className="rounded-2xl bg-white shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Foto de portada</h3>
              <p className="text-xs text-gray-400 mt-0.5">Imatge principal que apareix a la llista i al detall</p>
            </div>
            <div className="p-6">
              {profile.coverImage ? (
                <div className="relative group w-full h-52 rounded-xl overflow-hidden">
                  <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <Camera className="h-4 w-4" /> Canviar
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfile((p) => ({ ...p, coverImage: '' }))}
                      className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 w-full h-40 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                    uploadingCover ? 'border-taula-primary bg-taula-primary/5' : 'border-gray-200 hover:border-taula-primary hover:bg-gray-50',
                  )}
                >
                  {uploadingCover ? (
                    <Loader2 className="h-8 w-8 text-taula-primary animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-300" />
                      <span className="text-sm text-gray-400">Clica per pujar la foto de portada</span>
                      <span className="text-xs text-gray-300">JPG, PNG, WebP — Màx 10 MB</span>
                    </>
                  )}
                </div>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
            </div>
          </div>

          {/* Gallery */}
          <div className="rounded-2xl bg-white shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Galeria</h3>
                <p className="text-xs text-gray-400 mt-0.5">Fotos addicionals del restaurant, ambient, plats, etc.</p>
              </div>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadingGallery}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-taula-primary text-white text-xs font-medium hover:bg-taula-primary/90 disabled:opacity-50"
              >
                {uploadingGallery ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Afegir fotos
              </button>
            </div>
            <div className="p-6">
              {profile.images.length === 0 && !uploadingGallery ? (
                <div
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-taula-primary hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Upload className="h-6 w-6 text-gray-300" />
                  <span className="text-xs text-gray-400">Puja fotos del teu restaurant</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {profile.images.map((img, idx) => (
                    <div key={idx} className="relative group aspect-[4/3] rounded-xl overflow-hidden border">
                      <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                  {uploadingGallery && (
                    <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-taula-primary bg-taula-primary/5 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-taula-primary animate-spin" />
                    </div>
                  )}
                </div>
              )}
              <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGallerySelect} />
            </div>
          </div>

          {/* Info */}
          <div className="rounded-2xl bg-white shadow-sm border p-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Nom</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-taula-primary focus:ring-2 focus:ring-taula-primary/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Descripció</label>
              <textarea
                rows={4}
                value={profile.description}
                onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none resize-none focus:border-taula-primary focus:ring-2 focus:ring-taula-primary/20"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Telèfon</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+376 600 000"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-taula-primary focus:ring-2 focus:ring-taula-primary/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Web</label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://www.restaurant.ad"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-taula-primary focus:ring-2 focus:ring-taula-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Tipus de cuina</label>
              <div className="flex flex-wrap gap-2">
                {CUISINE_OPTIONS.map((ct) => {
                  const active = profile.cuisineType.includes(ct.id);
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => toggleCuisine(ct.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-taula-primary bg-taula-primary/10 text-taula-primary'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      <span>{ct.emoji}</span>
                      {ct.label}
                      {active && <X className="h-3 w-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Rang de preu</label>
              <div className="grid grid-cols-4 gap-2">
                {PRICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, priceRange: opt.value }))}
                    className={cn(
                      'rounded-lg border py-2.5 text-sm font-medium transition-colors',
                      profile.priceRange === opt.value
                        ? 'border-taula-primary bg-taula-primary/10 text-taula-primary'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {'€'.repeat(opt.value)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-taula-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-taula-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Desar canvis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
