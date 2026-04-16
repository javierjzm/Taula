import { useEffect, useState, type FormEvent } from 'react';
import { Save, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface ProfileData {
  name: string;
  description: string;
  phone: string;
  website: string;
  cuisineType: string;
  priceRange: string;
}

const emptyProfile: ProfileData = {
  name: '',
  description: '',
  phone: '',
  website: '',
  cuisineType: '',
  priceRange: '',
};

const priceRangeOptions = [
  { value: 'LOW', label: '€ — Econòmic' },
  { value: 'MEDIUM', label: '€€ — Moderat' },
  { value: 'HIGH', label: '€€€ — Alt' },
  { value: 'PREMIUM', label: '€€€€ — Premium' },
];

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
          cuisineType: d.cuisineType ?? '',
          priceRange: d.priceRange ?? '',
        });
      } catch {
        setError("No s'ha pogut carregar el perfil");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await api.patch('/me', profile);
      localStorage.setItem('taula_restaurant_name', profile.name);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Error en desar els canvis");
    } finally {
      setSaving(false);
    }
  }

  function update(field: keyof ProfileData, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
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
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white shadow-sm border p-6 space-y-5">
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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Nom</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-taula-primary focus:ring-2 focus:ring-taula-primary/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Descripció</label>
            <textarea
              rows={4}
              value={profile.description}
              onChange={(e) => update('description', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none resize-none focus:border-taula-primary focus:ring-2 focus:ring-taula-primary/20"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Telèfon</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-taula-primary focus:ring-2 focus:ring-taula-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Web</label>
              <input
                type="url"
                value={profile.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder="https://www.restaurant.cat"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-taula-primary focus:ring-2 focus:ring-taula-primary/20"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipus de cuina</label>
              <input
                type="text"
                value={profile.cuisineType}
                onChange={(e) => update('cuisineType', e.target.value)}
                placeholder="Mediterrània, Japonesa..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-taula-primary focus:ring-2 focus:ring-taula-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Rang de preu</label>
              <select
                value={profile.priceRange}
                onChange={(e) => update('priceRange', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-taula-primary focus:ring-2 focus:ring-taula-primary/20 bg-white"
              >
                <option value="">Selecciona...</option>
                {priceRangeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
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
