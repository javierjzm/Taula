import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface UserRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  ownerships: { restaurant: { id: string; name: string; slug: string } }[];
  _count: { reservations: number; reviews: number };
}

export default function UsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{ data: UserRow[] }>('/users');
        setItems(res.data.data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-slate-900">Usuarios</h1>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Restaurantes</th>
              <th className="px-4 py-3 text-right">Reservas</th>
              <th className="px-4 py-3 text-right">Reseñas</th>
              <th className="px-4 py-3 text-left">Alta</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Sin usuarios.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {u.ownerships.length === 0
                      ? '—'
                      : u.ownerships.map((o) => o.restaurant.name).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right">{u._count.reservations}</td>
                  <td className="px-4 py-3 text-right">{u._count.reviews}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.createdAt).toISOString().split('T')[0]}
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
