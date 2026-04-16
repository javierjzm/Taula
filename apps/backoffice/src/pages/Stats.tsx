import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Users, CheckCircle2, XCircle, Ban, TrendingUp } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface StatsData {
  totalReservations: number;
  arrived: number;
  noShows: number;
  cancelled: number;
  totalCoversServed: number;
  daily: { date: string; count: number }[];
}

const emptyStats: StatsData = {
  totalReservations: 0,
  arrived: 0,
  noShows: 0,
  cancelled: 0,
  totalCoversServed: 0,
  daily: [],
};

const PIE_COLORS = ['#22c55e', '#ef4444', '#9ca3af', '#3b82f6'];

export default function Stats() {
  const [from, setFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [stats, setStats] = useState<StatsData>(emptyStats);
  const [loading, setLoading] = useState(false);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await api.get('/stats', { params: { from, to } });
      setStats(res.data.data ?? emptyStats);
    } catch {
      setStats(emptyStats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, [from, to]);

  const pieData = [
    { name: 'Arribats', value: stats.arrived },
    { name: 'No-show', value: stats.noShows },
    { name: 'Cancel·lats', value: stats.cancelled },
    {
      name: 'Confirmats',
      value: Math.max(0, stats.totalReservations - stats.arrived - stats.noShows - stats.cancelled),
    },
  ].filter((d) => d.value > 0);

  const cards = [
    { label: 'Total Reserves', value: stats.totalReservations, icon: TrendingUp, color: 'bg-blue-50 text-blue-600' },
    { label: 'Arribats', value: stats.arrived, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
    { label: 'No-shows', value: stats.noShows, icon: XCircle, color: 'bg-red-50 text-red-600' },
    { label: 'Cancel·lats', value: stats.cancelled, icon: Ban, color: 'bg-gray-100 text-gray-600' },
    { label: 'Comensals Servits', value: stats.totalCoversServed, icon: Users, color: 'bg-orange-50 text-taula-primary' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estadístiques</h1>
          <p className="text-sm text-gray-500">Resum d'activitat del restaurant</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Des de</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border bg-white px-3 py-2 text-sm"
          />
          <label className="text-sm text-gray-600">fins</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-taula-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl bg-white border shadow-sm p-5 flex items-center gap-4"
              >
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', card.color)}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white border shadow-sm p-6">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Distribució d'estats</h3>
              {pieData.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">Sense dades</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl bg-white border shadow-sm p-6">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Reserves diàries</h3>
              {stats.daily.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">Sense dades</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(d: string) => format(new Date(d), 'dd/MM')}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(d: string) => format(new Date(d), 'dd/MM/yyyy')}
                    />
                    <Bar dataKey="count" name="Reserves" fill="#FF5C3A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
