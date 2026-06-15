import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, Plus } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCommunities } from '@/context/CommunityContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Onboarding() {
  const { user, logout } = useAuth();
  const { active, loading, reload, isSuperadmin } = useCommunities();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', address: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Si ya hay comunidad activa, fuera del onboarding.
  useEffect(() => {
    if (active) navigate('/', { replace: true });
  }, [active, navigate]);

  if (loading) return null;

  const createCommunity = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/communities', form);
      await reload();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear la comunidad');
    } finally {
      setBusy(false);
    }
  };

  // Superadmin sin comunidades → crea la primera.
  if (isSuperadmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">¡Hola, {user?.name}!</h1>
            <p className="text-sm text-muted-foreground">
              {user?.organization?.name
                ? `Da de alta la primera comunidad de ${user.organization.name}`
                : 'Da de alta tu primera comunidad'}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" /> Nueva comunidad
              </CardTitle>
              <CardDescription>
                Después podrás invitar al presidente y a los propietarios por email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createCommunity} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre de la comunidad</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ej. Comunidad Los Olivos"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Calle, número, ciudad"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Creando…' : 'Crear comunidad'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Button variant="ghost" onClick={logout} className="mt-4 w-full text-muted-foreground">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  // Propietario / miembro sin ninguna comunidad → debe esperar una invitación.
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Aún no perteneces a ninguna comunidad</CardTitle>
          <CardDescription>
            El acceso a una comunidad es por invitación. Pide a tu presidente o al administrador de
            la finca que te invite usando tu email{' '}
            <span className="font-medium text-foreground">{user?.email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={reload} className="w-full">
            Comprobar de nuevo
          </Button>
          <Button variant="ghost" onClick={logout} className="w-full">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
