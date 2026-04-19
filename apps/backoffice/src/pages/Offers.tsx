import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Tag, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface Offer {
  id: string;
  title: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_ITEM' | 'SPECIAL_MENU';
  value: number;
  minCovers: number;
  daysOfWeek: number[];
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
  createdAt: string;
}

const OFFER_TYPES = [
  { value: 'PERCENTAGE', label: '% Descompte', example: 'Ex: 20% de descompte' },
  { value: 'FIXED_AMOUNT', label: '€ Descompte', example: 'Ex: 10€ de descompte' },
  { value: 'FREE_ITEM', label: 'Article gratis', example: 'Ex: Postre gratis' },
  { value: 'SPECIAL_MENU', label: 'Menú especial', example: 'Ex: Menú degustació 35€' },
] as const;

const DAY_LABELS = ['Dg', 'Dl', 'Dm', 'Dc', 'Dj', 'Dv', 'Ds'];

function formatOfferBadge(offer: Offer): string {
  switch (offer.type) {
    case 'PERCENTAGE': return `-${offer.value}%`;
    case 'FIXED_AMOUNT': return `-${offer.value}€`;
    case 'FREE_ITEM': return '🎁';
    case 'SPECIAL_MENU': return `${offer.value}€`;
    default: return '';
  }
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'PERCENTAGE' as Offer['type'],
    value: 20,
    minCovers: 1,
    daysOfWeek: [] as number[],
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
  });

  const fetchOffers = async () => {
    try {
      const res = await api.get('/offers');
      setOffers(res.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchOffers(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', type: 'PERCENTAGE', value: 20, minCovers: 1, daysOfWeek: [], startDate: '', endDate: '', startTime: '', endTime: '' });
    setShowForm(true);
  };

  const openEdit = (o: Offer) => {
    setEditing(o);
    setForm({
      title: o.title,
      description: o.description || '',
      type: o.type,
      value: o.value,
      minCovers: o.minCovers,
      daysOfWeek: o.daysOfWeek,
      startDate: o.startDate ? o.startDate.split('T')[0] : '',
      endDate: o.endDate ? o.endDate.split('T')[0] : '',
      startTime: o.startTime || '',
      endTime: o.endTime || '',
    });
    setShowForm(true);
  };

  const saveOffer = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      value: form.value,
      minCovers: form.minCovers,
      daysOfWeek: form.daysOfWeek,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/offers/${editing.id}`, payload);
      } else {
        await api.post('/offers', payload);
      }
      setShowForm(false);
      setEditing(null);
      fetchOffers();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await api.patch(`/offers/${id}`, { isActive: !active });
    fetchOffers();
  };

  const deleteOffer = async (id: string) => {
    if (!confirm("Eliminar oferta?")) return;
    await api.delete(`/offers/${id}`);
    fetchOffers();
  };

  const toggleDay = (d: number) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter((x) => x !== d) : [...f.daysOfWeek, d],
    }));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-taula-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ofertes i descomptes</h1>
          <p className="text-sm text-gray-500 mt-1">Crea promocions per atraure més clients</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-taula-primary text-white text-sm font-medium hover:bg-taula-primary/90">
          <Plus className="h-4 w-4" /> Nova oferta
        </button>
      </div>

      {offers.length === 0 && !showForm && (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Encara no tens ofertes</p>
          <p className="text-sm text-gray-400 mt-1">Les ofertes es mostren als clients a l'app</p>
        </div>
      )}

      {offers.map((o) => (
        <div key={o.id} className={cn('bg-white rounded-xl border shadow-sm p-5', !o.isActive && 'opacity-60')}>
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0',
              o.type === 'PERCENTAGE' ? 'bg-green-100 text-green-700' :
              o.type === 'FIXED_AMOUNT' ? 'bg-blue-100 text-blue-700' :
              o.type === 'FREE_ITEM' ? 'bg-purple-100 text-purple-700' :
              'bg-amber-100 text-amber-700',
            )}>
              {formatOfferBadge(o)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{o.title}</h3>
                {o.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activa</span>}
              </div>
              {o.description && <p className="text-sm text-gray-500 mt-0.5">{o.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                {o.daysOfWeek.length > 0 && o.daysOfWeek.length < 7 && (
                  <span>{o.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')}</span>
                )}
                {o.startTime && <span>{o.startTime} - {o.endTime}</span>}
                {o.minCovers > 1 && <span>Mínim {o.minCovers} pers.</span>}
                {o.endDate && <span>Fins {new Date(o.endDate).toLocaleDateString('ca')}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleActive(o.id, o.isActive)}
                className="p-2 rounded-lg hover:bg-gray-100"
                title={o.isActive ? 'Desactivar' : 'Activar'}
              >
                {o.isActive
                  ? <ToggleRight className="h-5 w-5 text-green-500" />
                  : <ToggleLeft className="h-5 w-5 text-gray-400" />}
              </button>
              <button onClick={() => openEdit(o)} className="p-2 rounded-lg hover:bg-gray-100"><Pencil className="h-4 w-4 text-gray-500" /></button>
              <button onClick={() => deleteOffer(o.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="h-4 w-4 text-red-400" /></button>
            </div>
          </div>
        </div>
      ))}

      {/* Offer form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl">
              <h3 className="font-bold text-lg">{editing ? 'Editar oferta' : 'Nova oferta'}</h3>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Títol *</label>
                <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Happy Hour -30%" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripció</label>
                <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Detalls de l'oferta..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipus d'oferta</label>
                <div className="grid grid-cols-2 gap-2">
                  {OFFER_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                      className={cn(
                        'text-left rounded-lg border px-3 py-2.5 text-sm transition-colors',
                        form.type === t.value ? 'border-taula-primary bg-taula-primary/5 ring-1 ring-taula-primary' : 'hover:bg-gray-50',
                      )}
                    >
                      <p className="font-medium">{t.label}</p>
                      <p className="text-xs text-gray-400">{t.example}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.type === 'PERCENTAGE' ? 'Percentatge (%)' : form.type === 'SPECIAL_MENU' ? 'Preu menú (€)' : 'Valor (€)'}
                  </label>
                  <input type="number" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.value} min={0} max={form.type === 'PERCENTAGE' ? 100 : 9999} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comensals mínims</label>
                  <input type="number" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.minCovers} min={1} max={50} onChange={(e) => setForm((f) => ({ ...f, minCovers: Number(e.target.value) }))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dies de la setmana</label>
                <div className="flex gap-2">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        'w-10 h-10 rounded-full text-xs font-medium transition-colors',
                        form.daysOfWeek.includes(i) ? 'bg-taula-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{form.daysOfWeek.length === 0 ? 'Tots els dies' : 'Només els dies seleccionats'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora inici</label>
                  <input type="time" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora fi</label>
                  <input type="time" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data inici</label>
                  <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data fi</label>
                  <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel·lar</button>
              <button onClick={saveOffer} disabled={saving || !form.title.trim()} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-taula-primary text-white text-sm font-medium hover:bg-taula-primary/90 disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? 'Desant...' : 'Desar oferta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
