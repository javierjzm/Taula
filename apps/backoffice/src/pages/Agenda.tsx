import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Users, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface Reservation {
  id: string;
  time: string;
  guestName: string;
  partySize: number;
  status: 'CONFIRMED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED';
  notes?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: 'Confirmat', color: 'bg-blue-100 text-blue-700' },
  ARRIVED: { label: 'Arribat', color: 'bg-green-100 text-green-700' },
  NO_SHOW: { label: 'No-show', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancel·lat', color: 'bg-gray-100 text-gray-600' },
};

export default function Agenda() {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchReservations() {
    setLoading(true);
    try {
      const res = await api.get('/reservations', { params: { date } });
      setReservations(res.data.data ?? []);
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReservations();
  }, [date]);

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/reservations/${id}`, { status });
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: status as Reservation['status'] } : r)),
      );
    } catch (err) {
      console.error('Error updating reservation status', err);
    }
  }

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(format(d, 'yyyy-MM-dd'));
  }

  const displayDate = new Date(date + 'T00:00:00');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500">Reserves del dia seleccionat</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="rounded-lg border bg-white p-2 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium"
          />
          <button
            onClick={() => shiftDate(1)}
            className="rounded-lg border bg-white p-2 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
            className="rounded-lg bg-taula-primary px-4 py-2 text-sm font-medium text-white hover:bg-taula-primary-dark transition-colors"
          >
            Avui
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border overflow-hidden">
        <div className="border-b bg-gray-50/50 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700">
            {displayDate.toLocaleDateString('ca-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-taula-primary border-t-transparent" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Users className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p className="text-sm">No hi ha reserves per aquest dia</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase text-gray-500">
                  <th className="px-6 py-3">Hora</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Comensals</th>
                  <th className="px-6 py-3">Estat</th>
                  <th className="px-6 py-3">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reservations.map((r) => {
                  const cfg = statusConfig[r.status] ?? statusConfig.CONFIRMED;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                        {r.time}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{r.guestName}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <Users className="h-3.5 w-3.5" />
                          {r.partySize}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                            cfg.color,
                          )}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {r.status === 'CONFIRMED' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStatus(r.id, 'ARRIVED')}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Arribat
                            </button>
                            <button
                              onClick={() => updateStatus(r.id, 'NO_SHOW')}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              No-show
                            </button>
                          </div>
                        )}
                        {r.status !== 'CONFIRMED' && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
