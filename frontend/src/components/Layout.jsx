import { useState } from 'react';
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
  Plus,
  FileText,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCommunities } from '@/context/CommunityContext';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/incidencias', label: 'Incidencias', icon: AlertCircle },
  { to: '/juntas', label: 'Juntas', icon: CalendarDays },
  { to: '/temas', label: 'Temas', icon: ListTodo },
  { to: '/arcas', label: 'Arcas comunes', icon: Wallet },
  { to: '/vecinos', label: 'Vecinos', icon: Users },
  { to: '/documentos', label: 'Documentos', icon: FileText },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

const roleLabels = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  president: 'Presidente',
  owner: 'Propietario',
};

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const { communities, activeId, setActiveId, role, isSuperadmin, reload } = useCommunities();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '' });
  const [error, setError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const createCommunity = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/communities', form);
      setForm({ name: '', address: '' });
      setOpen(false);
      await reload();
      setActiveId(data.community._id);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear');
    }
  };

  const roleLabel = isSuperadmin ? 'Superadmin' : roleLabels[role] || 'Propietario';

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex items-center gap-2 border-b px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-lg font-bold leading-tight tracking-tight">HubVecinal</span>
            {isSuperadmin && user?.organization?.name && (
              <span className="block truncate text-xs text-muted-foreground">
                {user.organization.name}
              </span>
            )}
          </div>
        </div>

        {(communities.length > 1 || isSuperadmin) && (
          <div className="space-y-2 border-b px-4 py-3">
            {communities.length > 0 && (
              <Select value={activeId || ''} onChange={(e) => setActiveId(e.target.value)}>
                {communities.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
            {isSuperadmin && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> Nueva comunidad
              </Button>
            )}
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
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
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

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-bold">HubVecinal</span>
          </div>
          <div className="flex items-center gap-2">
            {isSuperadmin && (
              <button onClick={() => setOpen(true)} className="text-muted-foreground">
                <Plus className="h-5 w-5" />
              </button>
            )}
            <button onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {communities.length > 1 && (
          <div className="border-b bg-card px-4 py-2 md:hidden">
            <Select value={activeId || ''} onChange={(e) => setActiveId(e.target.value)}>
              {communities.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}

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

      <Dialog open={open} onClose={() => setOpen(false)} title="Nueva comunidad">
        <form onSubmit={createCommunity} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cname">Nombre</Label>
            <Input
              id="cname"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Comunidad Los Olivos"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="caddr">Dirección</Label>
            <Input
              id="caddr"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
