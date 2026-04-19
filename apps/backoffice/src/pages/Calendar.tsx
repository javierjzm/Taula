import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface DaySummary {
  date: string;
  reservations: number;
  covers: number;
  blocked: boolean;
}

const DAY_HEADERS = ['Dl', 'Dm', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

export default function CalendarPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [year, month]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/calendar', { params: { year, month } });
      setDays(data.data ?? []);
    } catch { /* */ }
    setLoading(false);
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('ca-AD', { month: 'long', year: 'numeric' });

  const grid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    let dow = firstDay.getDay();
    if (dow === 0) dow = 7;
    const blanks = dow - 1;

    const cells: (DaySummary | null)[] = [];
    for (let i = 0; i < blanks; i++) cells.push(null);
    for (const d of days) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [days, year, month]);

  const today = new Date().toISOString().split('T')[0];
  const maxRes = Math.max(1, ...days.map((d) => d.reservations));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold text-gray-900 capitalize min-w-[200px] text-center">{monthName}</h1>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> Reserves</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Comensals</span>
          <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Bloquejat</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-taula-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((cell, i) => {
              if (!cell) return <div key={i} className="min-h-[90px] bg-gray-50/50 border-b border-r" />;
              const dayNum = parseInt(cell.date.split('-')[2], 10);
              const isToday = cell.date === today;
              const heat = cell.reservations / maxRes;

              return (
                <button
                  key={cell.date}
                  onClick={() => navigate(`/agenda?date=${cell.date}`)}
                  className={cn(
                    'min-h-[90px] p-2 border-b border-r text-left hover:bg-gray-50 transition-colors relative',
                    cell.blocked && 'bg-red-50',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'text-sm font-medium',
                      isToday
                        ? 'bg-taula-primary text-white w-7 h-7 rounded-full flex items-center justify-center'
                        : 'text-gray-700',
                    )}>
                      {dayNum}
                    </span>
                    {cell.blocked && <Lock className="h-3 w-3 text-red-400" />}
                  </div>

                  {cell.reservations > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <div
                          className="h-1.5 rounded-full bg-taula-primary/80"
                          style={{ width: `${Math.max(heat * 100, 15)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {cell.reservations} res · {cell.covers} pax
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
