import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface StatsResponse {
  data: {
    totalRestaurants: number;
    activeRestaurants: number;
    totalReservations: number;
    totalUsers: number;
    plans: { plan: string; status: string; _count: { _all: number } }[];
  };
}

export default function StatsPage() {
  const [data, setData] = useState<StatsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<StatsResponse>('/stats');
        setData(res.data.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-slate-500">Cargando…</p>;
  if (!data) return <p className="text-slate-500">Sin datos.</p>;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-slate-900">Estadísticas</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Restaurantes totales" value={data.totalRestaurants} />
        <Stat label="Restaurantes activos" value={data.activeRestaurants} />
        <Stat label="Usuarios" value={data.totalUsers} />
        <Stat label="Reservas confirmadas" value={data.totalReservations} />
      </div>

      <div className="mt-8 rounded-2xl border bg-white">
        <div className="border-b px-4 py-3 text-sm font-semibold text-slate-700">
          Suscripciones por plan/estado
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {data.plans.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  Sin suscripciones aún.
                </td>
              </tr>
            ) : (
              data.plans.map((p) => (
                <tr key={`${p.plan}-${p.status}`} className="border-b last:border-0">
                  <td className="px-4 py-3 font-semibold">{p.plan}</td>
                  <td className="px-4 py-3 text-slate-600">{p.status}</td>
                  <td className="px-4 py-3 text-right">{p._count._all}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
