import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface Slot {
  id: string;
  time: string;
  maxCovers: number;
  bookedCovers: number;
  isBlocked: boolean;
}

export default function Availability() {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchSlots() {
    setLoading(true);
    try {
      const res = await api.get('/slots', { params: { date } });
      setSlots(res.data.data ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSlots();
  }, [date]);

  async function toggleBlock(slot: Slot) {
    try {
      if (slot.isBlocked) {
        await api.delete(`/slots/block/${slot.id}`);
      } else {
        await api.post('/slots/block', { slotId: slot.id });
      }
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, isBlocked: !s.isBlocked } : s)),
      );
    } catch (err) {
      console.error('Error toggling slot block', err);
    }
  }

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(format(d, 'yyyy-MM-dd'));
  }

  function occupancyPercent(slot: Slot) {
    if (slot.maxCovers === 0) return 0;
    return Math.round((slot.bookedCovers / slot.maxCovers) * 100);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disponibilitat</h1>
          <p className="text-sm text-gray-500">Gestiona els slots horaris del restaurant</p>
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
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-taula-primary border-t-transparent" />
          </div>
        ) : slots.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Lock className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p className="text-sm">No hi ha slots configurats per aquest dia</p>
          </div>
        ) : (
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {slots.map((slot) => {
              const pct = occupancyPercent(slot);
              return (
                <div
                  key={slot.id}
                  className={cn(
                    'relative rounded-xl border p-4 transition-all',
                    slot.isBlocked
                      ? 'bg-red-50/50 border-red-200'
                      : 'bg-white hover:shadow-md',
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-semibold text-gray-900">{slot.time}</span>
                    <button
                      onClick={() => toggleBlock(slot)}
                      className={cn(
                        'rounded-lg p-2 transition-colors',
                        slot.isBlocked
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                      )}
                      title={slot.isBlocked ? 'Desbloquejar' : 'Bloquejar'}
                    >
                      {slot.isBlocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ocupació</span>
                      <span className="font-medium text-gray-700">
                        {slot.bookedCovers} / {slot.maxCovers}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          pct >= 90
                            ? 'bg-red-400'
                            : pct >= 60
                              ? 'bg-yellow-400'
                              : 'bg-green-400',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {slot.isBlocked && (
                    <div className="mt-2 text-xs font-medium text-red-600">Bloquejat</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
