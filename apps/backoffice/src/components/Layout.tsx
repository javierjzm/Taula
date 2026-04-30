import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Calendar, CalendarDays, Settings2, CalendarOff,
  BarChart3, MessageCircle, Store, LogOut, Menu,
  UtensilsCrossed, Tag,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/calendar', label: 'Calendari', icon: CalendarDays },
  { to: '/menu', label: 'Carta', icon: UtensilsCrossed },
  { to: '/offers', label: 'Ofertes', icon: Tag },
  { to: '/setup', label: 'Configuració', icon: Settings2 },
  { to: '/blocked-dates', label: 'Dies bloquejats', icon: CalendarOff },
  { to: '/stats', label: 'Estadístiques', icon: BarChart3 },
  { to: '/reviews', label: 'Ressenyes', icon: MessageCircle },
  { to: '/profile', label: 'Perfil', icon: Store },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { restaurantName, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-taula-bg">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white shadow-lg transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-taula-primary text-white font-bold text-lg">
            T
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">Taula</p>
            <p className="text-xs text-gray-500 truncate">{restaurantName || 'Restaurant'}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-taula-primary/10 text-taula-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 lg:px-8">
          <p className="text-xs lg:text-sm text-amber-800">
            <span className="font-semibold">Esta web está en proceso de retirada.</span>{' '}
            La nueva experiencia está en la <span className="font-semibold">app móvil de Taula</span>{' '}
            (modo restaurante). Descárgala para gestionar reservas, plan, notificaciones y mucho más.
          </p>
        </div>
        <header className="flex h-16 items-center gap-4 border-b bg-white px-4 lg:px-8 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 lg:hidden">Taula</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
