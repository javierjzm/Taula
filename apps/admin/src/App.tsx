import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { Building2, Users, BarChart3, LogOut, KeyRound } from 'lucide-react';
import { getAdminKey, setAdminKey, clearAdminKey, api } from '@/lib/api';
import RestaurantsPage from '@/pages/Restaurants';
import RestaurantDetailPage from '@/pages/RestaurantDetail';
import UsersPage from '@/pages/Users';
import StatsPage from '@/pages/Stats';

function LoginGate({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAdminKey(key.trim());
    try {
      await api.get('/stats');
      onLogin();
    } catch (err: unknown) {
      clearAdminKey();
      const msg = err instanceof Error ? err.message : 'Clave incorrecta';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-taula-primary text-white font-bold">
            T
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Taula Admin</h1>
            <p className="text-xs text-slate-500">Panel interno</p>
          </div>
        </div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Admin API key
        </label>
        <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 focus-within:border-taula-primary">
          <KeyRound className="h-4 w-4 text-slate-400" />
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="ADMIN_API_KEY"
            type="password"
            autoFocus
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!key || loading}
          className="mt-5 w-full rounded-lg bg-taula-primary py-2.5 text-sm font-semibold text-white hover:bg-taula-primary-dark disabled:opacity-50"
        >
          {loading ? 'Comprobando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const items = [
    { to: '/restaurants', label: 'Restaurantes', icon: Building2 },
    { to: '/users', label: 'Usuarios', icon: Users },
    { to: '/stats', label: 'Estadísticas', icon: BarChart3 },
  ];
  return (
    <div className="flex h-screen">
      <aside className="w-60 border-r bg-white px-3 py-5">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-taula-primary text-white font-bold">
            T
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Taula Admin</p>
            <p className="text-xs text-slate-500">v0.1</p>
          </div>
        </div>
        <nav className="space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-taula-primary/10 text-taula-primary'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => {
            clearAdminKey();
            navigate('/');
            window.location.reload();
          }}
          className="mt-6 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">{children}</main>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getAdminKey());

  useEffect(() => {
    if (!getAdminKey()) setAuthed(false);
  }, []);

  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/restaurants" />} />
        <Route path="/restaurants" element={<RestaurantsPage />} />
        <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="*" element={<Navigate to="/restaurants" />} />
      </Routes>
    </Layout>
  );
}
