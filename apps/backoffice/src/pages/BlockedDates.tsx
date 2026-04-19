import { useEffect, useState } from 'react';
import { Plus, Trash2, Lock, CalendarOff } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
  isFullDay: boolean;
  serviceId: string | null;
  service?: { name: string } | null;
}

interface Service {
  id: string;
  name: string;
}

export default function BlockedDates() {
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', reason: '', isFullDay: true, serviceId: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        api.get('/blocked-dates'),
        api.get('/services'),
      ]);
      setBlocked(bRes.data.data ?? []);
      setServices(sRes.data.data ?? []);
    } catch { /* */ }
    setLoading(false);
  }

  async function addBlocked() {
    if (!form.date) return;
    try {
      await api.post('/blocked-dates', {
        date: form.date,
        reason: form.reason.trim() || undefined,
        isFullDay: form.isFullDay,
        serviceId: !form.isFullDay && form.serviceId ? form.serviceId : undefined,
      });
      setShowForm(false);
      setForm({ date: '', reason: '', isFullDay: true, serviceId: '' });
      load();
    } catch { /* */ }
  }

  async function remove(id: string) {
    if (!confirm('Eliminar aquest bloqueig?')) return;
    await api.delete(`/blocked-dates/${id}`);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-taula-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dies bloquejats</h1>
          <p className="text-sm text-gray-500 mt-1">Vacances, festius, events privats...</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-taula-primary text-white text-sm font-medium hover:bg-taula-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Afegir
        </button>
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Bloquejar data</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
              <input
                type="date"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motiu (opcional)</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Festiu, vacances, event privat..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isFullDay}
                  onChange={(e) => setForm({ ...form, isFullDay: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Tot el dia
              </label>
            </div>

            {!form.isFullDay && services.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Servei a bloquejar</label>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.serviceId}
                  onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                >
                  <option value="">Selecciona...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel·lar
              </button>
              <button
                onClick={addBlocked}
                className="flex-1 py-2.5 rounded-lg bg-taula-primary text-white text-sm font-medium hover:bg-taula-primary/90 disabled:opacity-50"
                disabled={!form.date}
              >
                Bloquejar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {blocked.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <CalendarOff className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Cap dia bloquejat</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocked.map((b) => {
            const dateObj = new Date(b.date + 'T00:00:00');
            const dateStr = dateObj.toLocaleDateString('ca-AD', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            });
            return (
              <div key={b.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{dateStr}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {b.reason && <span className="text-xs text-gray-500">{b.reason}</span>}
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-medium',
                        b.isFullDay
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700',
                      )}>
                        {b.isFullDay ? 'Tot el dia' : b.service?.name ?? 'Servei'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => remove(b.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
