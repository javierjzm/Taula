import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star } from 'lucide-react';
import { api } from '@/lib/api';

interface Owner {
  user: { id: string; name: string; email: string };
}
interface Subscription {
  plan: 'RESERVATIONS' | 'LISTING_BASIC' | 'LISTING_FEATURED';
  status: string;
  adminGranted: boolean;
  adminGrantUntil: string | null;
  currentPeriodEnd: string | null;
}
interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  parish: string;
  isActive: boolean;
  isFeatured: boolean;
  subscription: Subscription | null;
  owners: Owner[];
}

const planLabel: Record<Subscription['plan'], string> = {
  RESERVATIONS: 'Plan A · Reservas',
  LISTING_BASIC: 'Plan B Básico',
  LISTING_FEATURED: 'Plan B Destacado',
};

export default function RestaurantsPage() {
  const [items, setItems] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = q ? { q } : {};
      const res = await api.get<{ data: RestaurantRow[] }>('/restaurants', { params });
      setItems(res.data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-slate-900">Restaurantes</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 focus-within:border-taula-primary">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o slug…"
              className="w-64 bg-transparent text-sm outline-none"
            />
          </div>
          <button className="rounded-lg bg-taula-primary px-3 py-2 text-sm font-semibold text-white">
            Buscar
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Owners</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  No hay restaurantes.
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{r.name}</span>
                      {r.isFeatured ? <Star className="h-3.5 w-3.5 text-amber-500" /> : null}
                    </div>
                    <p className="text-xs text-slate-500">/{r.slug} · {r.parish}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {r.subscription ? (
                      <div>
                        <p className="font-medium">{planLabel[r.subscription.plan]}</p>
                        <p className="text-xs text-slate-500">
                          {r.subscription.adminGranted
                            ? `Concedido por admin${
                                r.subscription.adminGrantUntil
                                  ? ` hasta ${new Date(r.subscription.adminGrantUntil)
                                      .toISOString()
                                      .split('T')[0]}`
                                  : ''
                              }`
                            : r.subscription.currentPeriodEnd
                              ? `Hasta ${new Date(r.subscription.currentPeriodEnd)
                                  .toISOString()
                                  .split('T')[0]}`
                              : ''}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400">Sin plan</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill active={r.isActive} status={r.subscription?.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {r.owners.map((o) => o.user.email).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/restaurants/${r.id}`}
                      className="text-sm font-semibold text-taula-primary hover:underline"
                    >
                      Detalle →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ active, status }: { active: boolean; status?: string }) {
  if (!active)
    return (
      <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
        Pendiente
      </span>
    );
  if (!status)
    return (
      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
        Sin suscripción
      </span>
    );
  const cls =
    status === 'ACTIVE' || status === 'TRIALING' || status === 'ADMIN_GRANT'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'PAST_DUE'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-200 text-slate-700';
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>{status}</span>;
}
