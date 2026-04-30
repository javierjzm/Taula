import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, BadgeX, Calendar, Star } from 'lucide-react';
import { api } from '@/lib/api';

interface Subscription {
  plan: 'RESERVATIONS' | 'LISTING_BASIC' | 'LISTING_FEATURED';
  status: string;
  adminGranted: boolean;
  adminGrantUntil: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}
interface RestaurantDetail {
  id: string;
  name: string;
  slug: string;
  parish: string;
  isActive: boolean;
  isFeatured: boolean;
  externalReservationUrl: string | null;
  subscription: Subscription | null;
  owners: { user: { id: string; name: string; email: string } }[];
  _count: { reservations: number; reviews: number };
}

const planLabel: Record<Subscription['plan'], string> = {
  RESERVATIONS: 'Plan A · Reservas (20€/mes + 1€/comensal)',
  LISTING_BASIC: 'Plan B Básico · 49,99€/mes',
  LISTING_FEATURED: 'Plan B Destacado · 99,99€/mes',
};

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plan, setPlan] = useState<Subscription['plan']>('RESERVATIONS');
  const [until, setUntil] = useState<string>('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<{ data: RestaurantDetail }>(`/restaurants/${id}`);
      setRestaurant(res.data.data);
      if (res.data.data.subscription) {
        setPlan(res.data.data.subscription.plan);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const grant = async () => {
    if (!id) return;
    setSavingPlan(true);
    setError(null);
    try {
      await api.post(`/restaurants/${id}/grant-plan`, {
        plan,
        until: until || undefined,
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo conceder el plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const revoke = async () => {
    if (!id) return;
    if (!confirm('¿Seguro que quieres revocar el plan?')) return;
    setSavingPlan(true);
    setError(null);
    try {
      await api.post(`/restaurants/${id}/revoke-plan`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo revocar el plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const approve = async () => {
    if (!id) return;
    setSavingPlan(true);
    try {
      await api.patch(`/restaurants/${id}/approve`);
      await load();
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading) return <p className="text-slate-500">Cargando…</p>;
  if (!restaurant) return <p className="text-slate-500">No encontrado</p>;

  return (
    <div>
      <Link
        to="/restaurants"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-taula-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{restaurant.name}</h1>
                {restaurant.isFeatured ? <Star className="h-5 w-5 text-amber-500" /> : null}
              </div>
              <p className="text-sm text-slate-500">/{restaurant.slug} · {restaurant.parish}</p>
            </div>
            {restaurant.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <BadgeCheck className="h-3.5 w-3.5" /> Activo
              </span>
            ) : (
              <button
                onClick={approve}
                disabled={savingPlan}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200"
              >
                <BadgeX className="h-3.5 w-3.5" /> Pendiente · aprobar
              </button>
            )}
          </div>

          <dl className="grid gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Reservas
              </dt>
              <dd className="text-slate-800">{restaurant._count.reservations}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Reseñas
              </dt>
              <dd className="text-slate-800">{restaurant._count.reviews}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                URL externa de reservas (Plan B)
              </dt>
              <dd className="text-slate-800">
                {restaurant.externalReservationUrl ? (
                  <a
                    href={restaurant.externalReservationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-taula-primary hover:underline"
                  >
                    {restaurant.externalReservationUrl}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Owners</h2>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {restaurant.owners.map((o) => (
                    <tr key={o.user.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{o.user.name}</td>
                      <td className="px-3 py-2 text-slate-600">{o.user.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Suscripción</h2>
            {restaurant.subscription ? (
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{planLabel[restaurant.subscription.plan]}</p>
                <p className="text-slate-600">
                  Estado: <span className="font-semibold">{restaurant.subscription.status}</span>
                </p>
                {restaurant.subscription.adminGranted && (
                  <p className="text-emerald-700">
                    Otorgado por admin
                    {restaurant.subscription.adminGrantUntil
                      ? ` · hasta ${new Date(restaurant.subscription.adminGrantUntil)
                          .toISOString()
                          .split('T')[0]}`
                      : ''}
                  </p>
                )}
                {restaurant.subscription.currentPeriodEnd && (
                  <p className="text-slate-500">
                    Periodo Stripe hasta{' '}
                    {new Date(restaurant.subscription.currentPeriodEnd)
                      .toISOString()
                      .split('T')[0]}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Sin suscripción.</p>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Calendar className="h-4 w-4" /> Conceder plan (gratuito)
            </h2>
            <label className="mb-2 block text-xs font-semibold text-slate-500">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as Subscription['plan'])}
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="RESERVATIONS">Plan A · Reservas</option>
              <option value="LISTING_BASIC">Plan B Básico</option>
              <option value="LISTING_FEATURED">Plan B Destacado</option>
            </select>
            <label className="mb-2 block text-xs font-semibold text-slate-500">
              Hasta (opcional)
            </label>
            <input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <button
              onClick={grant}
              disabled={savingPlan}
              className="w-full rounded-lg bg-taula-primary py-2 text-sm font-semibold text-white hover:bg-taula-primary-dark disabled:opacity-50"
            >
              {savingPlan ? 'Guardando…' : 'Conceder / actualizar'}
            </button>
            <button
              onClick={revoke}
              disabled={savingPlan}
              className="mt-2 w-full rounded-lg border border-red-200 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Revocar plan
            </button>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
