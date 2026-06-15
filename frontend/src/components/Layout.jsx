import { NavLink, useNavigate } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  CalendarDays,
  ListTodo,
  Wallet,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCommunities } from '@/context/CommunityContext';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/juntas', label: 'Juntas', icon: CalendarDays },
  { to: '/temas', label: 'Temas', icon: ListTodo },
  { to: '/arcas', label: 'Arcas comunes', icon: Wallet },
  { to: '/vecinos', label: 'Vecinos', icon: Users },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const { communities, activeId, setActiveId } = useCommunities();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Barra lateral */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex items-center gap-2 border-b px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">HubVecinal</span>
        </div>

        {communities.length > 1 && (
          <div className="border-b px-4 py-3">
            <Select value={activeId || ''} onChange={(e) => setActiveId(e.target.value)}>
              {communities.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t px-4 py-4">
          <div className="mb-3">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.role === 'admin' ? 'Administrador de fincas' : user?.isPresident ? 'Presidente' : 'Propietario'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex flex-1 flex-col">
        {/* Cabecera móvil */}
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-bold">HubVecinal</span>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Nav inferior móvil */}
        <nav className="order-last flex items-center justify-around border-t bg-card py-2 md:hidden">
          {navItems.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-2 text-[10px]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
