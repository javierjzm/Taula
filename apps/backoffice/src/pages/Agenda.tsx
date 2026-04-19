import { useEffect, useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Users, Check, X, AlertTriangle, Clock, List, LayoutGrid,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface TimelineEntry {
  reservationId: string;
  code: string;
  time: string;
  partySize: number;
  status: string;
  specialRequests: string | null;
  turnDuration: number;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  tableId: string | null;
  tableLabel: string | null;
  zoneName: string | null;
  zoneId: string | null;
}

interface TimelineZone {
  id: string;
  name: string;
  tables: { id: string; label: string }[];
}

interface TimelineService {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-blue-500',
  PENDING: 'bg-amber-400',
  ARRIVED: 'bg-emerald-500',
  NO_SHOW: 'bg-red-500',
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmat',
  PENDING: 'Pendent',
  ARRIVED: 'Arribat',
  NO_SHOW: 'No-show',
  CANCELLED_USER: 'Cancel·lat',
  CANCELLED_RESTAURANT: 'Cancel·lat',
};

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function displayDate(d: Date) {
  return d.toLocaleDateString('ca-AD', { weekday: 'long', day: 'numeric', month: 'long' });
}

const PX_PER_MINUTE = 2.5;

function ReservationBlock({ entry, left, width, onClick }: {
  entry: TimelineEntry; left: number; width: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute top-1.5 bottom-1.5 rounded-md px-1.5 flex items-center gap-1 text-white text-[11px] font-medium overflow-hidden cursor-pointer hover:brightness-110 transition-all shadow-sm',
        STATUS_COLORS[entry.status] ?? 'bg-gray-400',
      )}
      style={{ left, width }}
      title={`${entry.userName} · ${entry.partySize} pax · ${entry.code}`}
    >
      <span className="truncate">{entry.userName.split(' ')[0]}</span>
      <span className="opacity-80">·{entry.partySize}</span>
    </button>
  );
}

export default function Agenda() {
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState(() => {
    const paramDate = searchParams.get('date');
    if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate)) {
      return new Date(paramDate + 'T00:00:00');
    }
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [zones, setZones] = useState<TimelineZone[]>([]);
  const [services, setServices] = useState<TimelineService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  useEffect(() => { load(); }, [date]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/timeline', { params: { date: formatDate(date) } });
      setEntries(data.data.entries ?? []);
      setZones(data.data.zones ?? []);
      setServices(data.data.services ?? []);
    } catch (err: any) { alert(err?.response?.data?.message || err?.message || 'Error'); }
    setLoading(false);
  }

  function prevDay() {
    setDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  }
  function nextDay() {
    setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  }
  function goToday() {
    const d = new Date(); d.setHours(0, 0, 0, 0); setDate(d);
  }

  const timeRange = useMemo(() => {
    if (services.length === 0) return { start: 720, end: 1380 };
    const starts = services.map((s) => timeToMinutes(s.startTime));
    const ends = services.map((s) => timeToMinutes(s.endTime));
    return {
      start: Math.floor(Math.min(...starts) / 60) * 60,
      end: Math.ceil(Math.max(...ends) / 60) * 60,
    };
  }, [services]);

  const hours = useMemo(() => {
    const arr = [];
    for (let m = timeRange.start; m <= timeRange.end; m += 60) arr.push(m);
    return arr;
  }, [timeRange]);

  const activeEntries = useMemo(
    () => entries.filter((e) => !['CANCELLED_USER', 'CANCELLED_RESTAURANT'].includes(e.status)),
    [entries],
  );

  const unassigned = activeEntries.filter((e) => !e.tableId);

  const stats = useMemo(() => ({
    total: activeEntries.length,
    covers: activeEntries.reduce((s, e) => s + e.partySize, 0),
    pending: activeEntries.filter((e) => e.status === 'PENDING').length,
  }), [activeEntries]);

  async function updateStatus(reservationId: string, status: string) {
    try {
      await api.patch(`/reservations/${reservationId}`, { status });
      load();
      setSelectedEntry(null);
    } catch (err: any) { alert(err?.response?.data?.message || err?.message || 'Error'); }
  }

  const gridWidth = (timeRange.end - timeRange.start) * PX_PER_MINUTE;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-taula-primary" />
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className="text-center py-20">
        <CalendarIcon className="mx-auto h-12 w-12 text-gray-300" />
        <h2 className="mt-4 text-lg font-semibold text-gray-700">Configura el teu restaurant</h2>
        <p className="text-sm text-gray-500 mt-1">Ves a Configuració per crear zones, taules i serveis</p>
        <a href="/setup" className="inline-block mt-4 px-4 py-2 rounded-lg bg-taula-primary text-white text-sm font-medium hover:bg-taula-primary/90 transition-colors">
          Anar a Configuració
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold text-gray-900 capitalize">{displayDate(date)}</h1>
          <button onClick={nextDay} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="h-5 w-5" /></button>
          <button onClick={goToday} className="ml-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">Avui</button>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-gray-600"><CalendarIcon className="h-4 w-4" /> {stats.total} reserves</span>
          <span className="flex items-center gap-1 text-gray-600"><Users className="h-4 w-4" /> {stats.covers} comensals</span>
          {stats.pending > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-medium"><Clock className="h-4 w-4" /> {stats.pending} pendents</span>
          )}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn('p-1.5 rounded-md', viewMode === 'timeline' ? 'bg-white shadow-sm' : 'text-gray-500')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md', viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        {Object.entries(STATUS_COLORS).map(([st, bg]) => (
          <span key={st} className="flex items-center gap-1.5">
            <span className={cn('w-3 h-3 rounded', bg)} />
            {STATUS_LABELS[st]}
          </span>
        ))}
      </div>

      {activeEntries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <CalendarIcon className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No hi ha reserves per aquest dia</p>
        </div>
      ) : viewMode === 'list' ? (
        /* ─── LIST VIEW ─── */
        <div className="bg-white rounded-xl border shadow-sm divide-y">
          {activeEntries
            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
            .map((entry) => (
            <button
              key={entry.reservationId}
              onClick={() => setSelectedEntry(entry)}
              className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className={cn('w-2 h-8 rounded-full shrink-0', STATUS_COLORS[entry.status] ?? 'bg-gray-400')} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{entry.time}</span>
                  <span className="text-gray-700 text-sm truncate">{entry.userName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span>{entry.partySize} pax</span>
                  <span className="font-mono">{entry.code}</span>
                  {entry.tableLabel ? (
                    <span>{entry.tableLabel} ({entry.zoneName})</span>
                  ) : (
                    <span className="text-amber-600 font-medium">Sense taula</span>
                  )}
                </div>
              </div>
              <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0', STATUS_COLORS[entry.status] ?? 'bg-gray-400')}>
                {STATUS_LABELS[entry.status]}
              </span>
            </button>
          ))}
        </div>
      ) : (
        /* ─── TIMELINE VIEW ─── */
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: gridWidth + 160 }}>
              {/* Time header */}
              <div className="flex border-b bg-gray-50">
                <div className="w-40 min-w-[160px] px-3 py-2 text-xs font-semibold text-gray-500 border-r">
                  Taula
                </div>
                <div className="flex-1 relative" style={{ width: gridWidth }}>
                  {hours.map((m) => (
                    <div
                      key={m}
                      className="absolute top-0 bottom-0 border-l border-gray-200"
                      style={{ left: (m - timeRange.start) * PX_PER_MINUTE }}
                    >
                      <span className="text-[10px] text-gray-400 ml-1">{minutesToTime(m)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows per zone + table */}
              {zones.map((zone) => {
                const zoneUnassigned = unassigned.filter(
                  (e) => e.zoneId === zone.id || (!e.zoneId && zones[0]?.id === zone.id),
                );
                return (
                  <div key={zone.id}>
                    <div className="px-3 py-1.5 bg-gray-50 border-b">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{zone.name}</span>
                    </div>
                    {zone.tables.map((table) => {
                      const tableEntries = activeEntries.filter((e) => e.tableId === table.id);
                      return (
                        <div key={table.id} className="flex border-b hover:bg-gray-50/50">
                          <div className="w-40 min-w-[160px] px-3 py-2.5 border-r flex items-center">
                            <span className="text-sm font-medium text-gray-700">{table.label}</span>
                          </div>
                          <div className="flex-1 relative" style={{ width: gridWidth, height: 44 }}>
                            {services.map((svc) => {
                              const left = (timeToMinutes(svc.startTime) - timeRange.start) * PX_PER_MINUTE;
                              const w = (timeToMinutes(svc.endTime) - timeToMinutes(svc.startTime)) * PX_PER_MINUTE;
                              return <div key={svc.id} className="absolute top-1 bottom-1 bg-gray-50 rounded" style={{ left, width: w }} />;
                            })}
                            {tableEntries.map((entry) => (
                              <ReservationBlock
                                key={entry.reservationId}
                                entry={entry}
                                left={(timeToMinutes(entry.time) - timeRange.start) * PX_PER_MINUTE}
                                width={entry.turnDuration * PX_PER_MINUTE}
                                onClick={() => setSelectedEntry(entry)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {/* Unassigned row for this zone */}
                    {zoneUnassigned.length > 0 && (
                      <div className="flex border-b bg-amber-50/40">
                        <div className="w-40 min-w-[160px] px-3 py-2.5 border-r flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-amber-700 italic">Sense taula</span>
                        </div>
                        <div className="flex-1 relative" style={{ width: gridWidth, height: 44 }}>
                          {zoneUnassigned.map((entry) => (
                            <ReservationBlock
                              key={entry.reservationId}
                              entry={entry}
                              left={(timeToMinutes(entry.time) - timeRange.start) * PX_PER_MINUTE}
                              width={entry.turnDuration * PX_PER_MINUTE}
                              onClick={() => setSelectedEntry(entry)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unassigned without zone */}
              {unassigned.filter((e) => !e.zoneId && zones.length > 1).length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-amber-50 border-b">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Sense zona assignada</span>
                  </div>
                  <div className="flex border-b bg-amber-50/30">
                    <div className="w-40 min-w-[160px] px-3 py-2.5 border-r flex items-center">
                      <span className="text-xs text-amber-600 italic">—</span>
                    </div>
                    <div className="flex-1 relative" style={{ width: gridWidth, height: 44 }}>
                      {unassigned.filter((e) => !e.zoneId).map((entry) => (
                        <ReservationBlock
                          key={entry.reservationId}
                          entry={entry}
                          left={(timeToMinutes(entry.time) - timeRange.start) * PX_PER_MINUTE}
                          width={entry.turnDuration * PX_PER_MINUTE}
                          onClick={() => setSelectedEntry(entry)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedEntry(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{selectedEntry.userName}</h3>
              <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold text-white', STATUS_COLORS[selectedEntry.status] ?? 'bg-gray-400')}>
                {STATUS_LABELS[selectedEntry.status]}
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>📧 {selectedEntry.userEmail}</p>
              {selectedEntry.userPhone && <p>📱 {selectedEntry.userPhone}</p>}
              <p>🕐 {selectedEntry.time} · {selectedEntry.partySize} comensals</p>
              <p>🎫 Codi: <span className="font-mono font-bold">{selectedEntry.code}</span></p>
              {selectedEntry.tableLabel ? (
                <p>🪑 {selectedEntry.tableLabel} ({selectedEntry.zoneName})</p>
              ) : (
                <p className="text-amber-600 font-medium">⚠️ Sense taula assignada</p>
              )}
              {selectedEntry.specialRequests && (
                <p className="bg-gray-50 rounded-lg p-2 text-xs">📝 {selectedEntry.specialRequests}</p>
              )}
            </div>

            {(selectedEntry.status === 'CONFIRMED' || selectedEntry.status === 'PENDING') && (
              <div className="flex gap-2 pt-2">
                {selectedEntry.status === 'PENDING' && (
                  <button
                    onClick={() => updateStatus(selectedEntry.reservationId, 'CONFIRMED')}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"
                  >
                    <Check className="h-4 w-4" /> Acceptar
                  </button>
                )}
                <button
                  onClick={() => updateStatus(selectedEntry.reservationId, 'ARRIVED')}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600"
                >
                  <Check className="h-4 w-4" /> Arribat
                </button>
                <button
                  onClick={() => updateStatus(selectedEntry.reservationId, 'NO_SHOW')}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"
                >
                  <X className="h-4 w-4" /> No-show
                </button>
                <button
                  onClick={() => { if (confirm('Cancel·lar?')) updateStatus(selectedEntry.reservationId, 'CANCELLED_RESTAURANT'); }}
                  className="py-2 px-3 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200"
                >
                  Cancel·lar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
