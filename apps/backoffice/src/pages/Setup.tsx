import { useEffect, useState } from 'react';
import { Plus, Trash2, GripVertical, Save, Settings2, MapPin, UtensilsCrossed, Clock, ShieldAlert } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface Zone {
  id: string;
  name: string;
  sortOrder: number;
  tables: Table[];
}

interface Table {
  id: string;
  zoneId: string;
  label: string;
  minCovers: number;
  maxCovers: number;
  isActive: boolean;
}

interface Service {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  slotInterval: number;
  turnDuration: number;
  daysOfWeek: number[];
  isActive: boolean;
}

interface RestaurantSettings {
  requiresApproval: boolean;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  noShowProtection: boolean;
  noShowFeePerPerson: number;
  noShowGraceMins: number;
}

const TABS = [
  { id: 'zones', label: 'Zones i taules', icon: MapPin },
  { id: 'services', label: 'Serveis', icon: UtensilsCrossed },
  { id: 'rules', label: 'Regles', icon: Settings2 },
  { id: 'noshow', label: 'Anti no-show', icon: ShieldAlert },
] as const;

const DAY_NAMES = ['Dg', 'Dl', 'Dm', 'Dc', 'Dj', 'Dv', 'Ds'];

export default function Setup() {
  const [tab, setTab] = useState<string>('zones');
  const [zones, setZones] = useState<Zone[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings>({
    requiresApproval: false,
    minAdvanceMinutes: 60,
    maxAdvanceDays: 30,
    noShowProtection: false,
    noShowFeePerPerson: 10,
    noShowGraceMins: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [zRes, sRes, mRes] = await Promise.all([
        api.get('/zones'),
        api.get('/services'),
        api.get('/me'),
      ]);
      setZones(zRes.data.data ?? []);
      setServices(sRes.data.data ?? []);
      const r = mRes.data.data;
      if (r) {
        setSettings({
          requiresApproval: r.requiresApproval ?? false,
          minAdvanceMinutes: r.minAdvanceMinutes ?? 60,
          maxAdvanceDays: r.maxAdvanceDays ?? 30,
          noShowProtection: r.noShowProtection ?? false,
          noShowFeePerPerson: r.noShowFeePerPerson ?? 10,
          noShowGraceMins: r.noShowGraceMins ?? 15,
        });
      }
    } catch {
      /* handled by interceptor */
    }
    setLoading(false);
  }

  // ─── ZONES ─────────────────────────────────────────────────────

  async function addZone() {
    const name = prompt('Nom de la zona (ex: Terrassa, Interior)');
    if (!name?.trim()) return;
    try {
      await api.post('/zones', { name: name.trim(), sortOrder: zones.length });
      loadAll();
    } catch (err: any) { alert(err?.response?.data?.message || err?.message || 'Error al guardar'); }
  }

  async function deleteZone(id: string) {
    if (!confirm('Eliminar aquesta zona i totes les seves taules?')) return;
    await api.delete(`/zones/${id}`);
    loadAll();
  }

  async function renameZone(id: string, current: string) {
    const name = prompt('Nou nom', current);
    if (!name?.trim() || name === current) return;
    await api.put(`/zones/${id}`, { name: name.trim() });
    loadAll();
  }

  // ─── TABLES ────────────────────────────────────────────────────

  async function addTable(zoneId: string) {
    const label = prompt('Etiqueta de la taula (ex: T1, Mesa 5)');
    if (!label?.trim()) return;
    const maxStr = prompt('Capacitat màxima (comensals)', '4');
    const maxCovers = parseInt(maxStr ?? '4', 10);
    if (isNaN(maxCovers) || maxCovers < 1) return;
    try {
      await api.post('/tables', { zoneId, label: label.trim(), maxCovers, minCovers: 1 });
      loadAll();
    } catch (err: any) { alert(err?.response?.data?.message || err?.message || 'Error al guardar'); }
  }

  async function deleteTable(id: string) {
    if (!confirm('Eliminar aquesta taula?')) return;
    await api.delete(`/tables/${id}`);
    loadAll();
  }

  async function toggleTable(id: string, active: boolean) {
    await api.put(`/tables/${id}`, { isActive: !active });
    loadAll();
  }

  // ─── SERVICES ──────────────────────────────────────────────────

  const [editService, setEditService] = useState<Partial<Service> | null>(null);

  function openNewService() {
    setEditService({
      name: '',
      startTime: '13:00',
      endTime: '16:00',
      slotInterval: 30,
      turnDuration: 90,
      daysOfWeek: [1, 2, 3, 4, 5],
      isActive: true,
    });
  }

  function openEditService(s: Service) {
    setEditService({ ...s });
  }

  async function saveService() {
    if (!editService?.name?.trim()) return;
    setSaving(true);
    try {
      if (editService.id) {
        await api.put(`/services/${editService.id}`, editService);
      } else {
        await api.post('/services', editService);
      }
      setEditService(null);
      loadAll();
    } catch (err: any) { alert(err?.response?.data?.message || err?.message || 'Error al guardar'); }
    setSaving(false);
  }

  async function deleteService(id: string) {
    if (!confirm('Eliminar aquest servei?')) return;
    await api.delete(`/services/${id}`);
    loadAll();
  }

  function toggleDay(day: number) {
    if (!editService) return;
    const days = editService.daysOfWeek ?? [];
    setEditService({
      ...editService,
      daysOfWeek: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort(),
    });
  }

  // ─── SETTINGS ──────────────────────────────────────────────────

  async function saveSettings() {
    setSaving(true);
    try {
      await api.patch('/settings', settings);
    } catch (err: any) { alert(err?.response?.data?.message || err?.message || 'Error al guardar'); }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-taula-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuració</h1>
        <p className="text-sm text-gray-500 mt-1">Defineix zones, taules, serveis i regles de reserva</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
              tab === id
                ? 'bg-white text-taula-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── ZONES & TABLES ──────────────────────────────────── */}
      {tab === 'zones' && (
        <div className="space-y-4">
          {zones.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <MapPin className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">Encara no has creat cap zona</p>
              <p className="text-xs text-gray-400 mt-1">Crea zones com "Interior", "Terrassa", etc.</p>
            </div>
          )}

          {zones.map((zone) => (
            <div key={zone.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-300" />
                  <button
                    onClick={() => renameZone(zone.id, zone.name)}
                    className="font-semibold text-gray-900 hover:text-taula-primary transition-colors"
                  >
                    {zone.name}
                  </button>
                  <span className="text-xs text-gray-400">
                    {zone.tables.length} taula{zone.tables.length !== 1 ? 'es' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addTable(zone.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-taula-primary/10 px-3 py-1.5 text-xs font-medium text-taula-primary hover:bg-taula-primary/20 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Taula
                  </button>
                  <button
                    onClick={() => deleteZone(zone.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {zone.tables.length > 0 && (
                <div className="divide-y">
                  {zone.tables.map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        'flex items-center justify-between px-4 py-2.5 text-sm',
                        !t.isActive && 'opacity-50',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-800">{t.label}</span>
                        <span className="text-xs text-gray-400">
                          {t.minCovers}–{t.maxCovers} pax
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTable(t.id, t.isActive)}
                          className={cn(
                            'w-9 h-5 rounded-full transition-colors relative',
                            t.isActive ? 'bg-green-500' : 'bg-gray-300',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                              t.isActive ? 'left-4' : 'left-0.5',
                            )}
                          />
                        </button>
                        <button
                          onClick={() => deleteTable(t.id)}
                          className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addZone}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-taula-primary hover:text-taula-primary transition-colors"
          >
            <Plus className="h-4 w-4" /> Afegir zona
          </button>
        </div>
      )}

      {/* ── SERVICES ────────────────────────────────────────── */}
      {tab === 'services' && (
        <div className="space-y-4">
          {services.map((svc) => (
            <div key={svc.id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{svc.name}</h3>
                    {!svc.isActive && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">INACTIU</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {svc.startTime} – {svc.endTime} · Cada {svc.slotInterval} min · Torn {svc.turnDuration} min
                  </p>
                  <div className="flex gap-1 mt-2">
                    {DAY_NAMES.map((d, i) => (
                      <span
                        key={i}
                        className={cn(
                          'w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-bold',
                          svc.daysOfWeek.includes(i)
                            ? 'bg-taula-primary text-white'
                            : 'bg-gray-100 text-gray-400',
                        )}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditService(svc)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteService(svc.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <Clock className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">Defineix els serveis del teu restaurant</p>
              <p className="text-xs text-gray-400 mt-1">Ex: "Dinar" de 13:00 a 16:00, "Sopar" de 20:00 a 23:30</p>
            </div>
          )}

          <button
            onClick={openNewService}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-taula-primary hover:text-taula-primary transition-colors"
          >
            <Plus className="h-4 w-4" /> Afegir servei
          </button>

          {/* Service editor modal */}
          {editService && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {editService.id ? 'Editar servei' : 'Nou servei'}
                </h3>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={editService.name ?? ''}
                    onChange={(e) => setEditService({ ...editService, name: e.target.value })}
                    placeholder="Dinar, Sopar..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hora inici</label>
                    <input
                      type="time"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={editService.startTime ?? ''}
                      onChange={(e) => setEditService({ ...editService, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hora fi</label>
                    <input
                      type="time"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={editService.endTime ?? ''}
                      onChange={(e) => setEditService({ ...editService, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Interval (min)</label>
                    <select
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={editService.slotInterval ?? 30}
                      onChange={(e) => setEditService({ ...editService, slotInterval: Number(e.target.value) })}
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Durada torn (min)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={editService.turnDuration ?? 90}
                      min={30}
                      max={300}
                      step={15}
                      onChange={(e) => setEditService({ ...editService, turnDuration: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dies actiu</label>
                  <div className="flex gap-1.5">
                    {DAY_NAMES.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={cn(
                          'w-9 h-9 flex items-center justify-center rounded-full text-xs font-bold transition-colors',
                          (editService.daysOfWeek ?? []).includes(i)
                            ? 'bg-taula-primary text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editService.isActive ?? true}
                      onChange={(e) => setEditService({ ...editService, isActive: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Actiu
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditService(null)}
                    className="flex-1 py-2.5 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel·lar
                  </button>
                  <button
                    onClick={saveService}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-lg bg-taula-primary text-white text-sm font-medium hover:bg-taula-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Desant...' : 'Desar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RULES ───────────────────────────────────────────── */}
      {tab === 'rules' && (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Aprovació manual</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Si actiu, les reserves queden en estat "Pendent" fins que les acceptis
              </p>
            </div>
            <button
              onClick={() => setSettings((s) => ({ ...s, requiresApproval: !s.requiresApproval }))}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative',
                settings.requiresApproval ? 'bg-taula-primary' : 'bg-gray-300',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  settings.requiresApproval ? 'left-5' : 'left-0.5',
                )}
              />
            </button>
          </div>

          <div className="border-t pt-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Antelació mínima</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-24 rounded-lg border px-3 py-2 text-sm"
                value={settings.minAdvanceMinutes}
                min={0}
                onChange={(e) => setSettings((s) => ({ ...s, minAdvanceMinutes: Number(e.target.value) }))}
              />
              <span className="text-sm text-gray-500">minuts</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Temps mínim abans de l'hora per acceptar reserves</p>
          </div>

          <div className="border-t pt-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Antelació màxima</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-24 rounded-lg border px-3 py-2 text-sm"
                value={settings.maxAdvanceDays}
                min={1}
                max={365}
                onChange={(e) => setSettings((s) => ({ ...s, maxAdvanceDays: Number(e.target.value) }))}
              />
              <span className="text-sm text-gray-500">dies</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Fins a quants dies endavant es pot reservar</p>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-taula-primary text-white text-sm font-medium hover:bg-taula-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Desant...' : 'Desar regles'}
          </button>
        </div>
      )}

      {/* ── ANTI NO-SHOW ────────────────────────────────────── */}
      {tab === 'noshow' && (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Protecció anti no-show</h3>
              <p className="text-sm text-gray-500 mt-1">
                Demana una targeta de crèdit com a garantia quan es fa una reserva.
                Si el client no es presenta, es cobra automàticament la penalització.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-5">
            <div>
              <h4 className="font-medium text-gray-800">Activar protecció</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Els clients hauran de registrar una targeta per reservar
              </p>
            </div>
            <button
              onClick={() => setSettings((s) => ({ ...s, noShowProtection: !s.noShowProtection }))}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative',
                settings.noShowProtection ? 'bg-red-500' : 'bg-gray-300',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  settings.noShowProtection ? 'left-5' : 'left-0.5',
                )}
              />
            </button>
          </div>

          {settings.noShowProtection && (
            <>
              <div className="border-t pt-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Penalització per persona
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-24 rounded-lg border px-3 py-2 text-sm"
                    value={settings.noShowFeePerPerson}
                    min={0}
                    max={200}
                    step={0.5}
                    onChange={(e) => setSettings((s) => ({ ...s, noShowFeePerPerson: Number(e.target.value) }))}
                  />
                  <span className="text-sm text-gray-500">€ / persona</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Ex: 10€ x 4 persones = 40€ de penalització màxima
                </p>
              </div>

              <div className="border-t pt-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temps de gràcia
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-24 rounded-lg border px-3 py-2 text-sm"
                    value={settings.noShowGraceMins}
                    min={5}
                    max={60}
                    step={5}
                    onChange={(e) => setSettings((s) => ({ ...s, noShowGraceMins: Number(e.target.value) }))}
                  />
                  <span className="text-sm text-gray-500">minuts</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Temps d'espera després de l'hora de la reserva abans de marcar no-show
                </p>
              </div>

              <div className="border-t pt-5 bg-amber-50 -mx-6 -mb-6 px-6 pb-6 pt-4 rounded-b-xl">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <p className="font-medium">Com funciona:</p>
                    <ol className="mt-1 space-y-1 list-decimal ml-3">
                      <li>El client registra la seva targeta al fer la reserva (no es cobra res)</li>
                      <li>Si no es presenta, el sistema espera el temps de gràcia ({settings.noShowGraceMins} min)</li>
                      <li>Passat el temps, es cobra automàticament {settings.noShowFeePerPerson}€ x persona</li>
                      <li>El client rep un email amb el justificant del càrrec</li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          )}

          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-taula-primary text-white text-sm font-medium hover:bg-taula-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Desant...' : 'Desar configuració'}
          </button>
        </div>
      )}
    </div>
  );
}
