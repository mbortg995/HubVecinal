import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, Crown, KeyRound, LogOut } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCommunities } from '@/context/CommunityContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function Onboarding() {
  const { user, logout, refreshUser } = useAuth();
  const { active, loading, reload } = useCommunities();
  const navigate = useNavigate();
  const [mode, setMode] = useState('join');
  const [join, setJoin] = useState({ joinCode: '', unit: '' });
  const [create, setCreate] = useState({ name: '', address: '', unit: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Si ya hay comunidad activa, no tiene sentido el onboarding.
  useEffect(() => {
    if (active) navigate('/', { replace: true });
  }, [active, navigate]);

  if (loading) return null;

  // Un administrador no se une por código: lo asigna un presidente.
  if (user?.role === 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Aún no administras ninguna comunidad</CardTitle>
            <CardDescription>
              Para que aparezca aquí, el presidente de una comunidad debe asignarte como administrador
              usando tu email <span className="font-medium text-foreground">{user.email}</span>.
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

  const submitJoin = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/communities/join', join);
      await refreshUser();
      await reload();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo unir a la comunidad');
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/communities', create);
      await refreshUser();
      await reload();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear la comunidad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">¡Hola, {user?.name}!</h1>
          <p className="text-sm text-muted-foreground">Vincula tu vivienda para empezar</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('join')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium',
              mode === 'join' ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
            )}
          >
            <KeyRound className="h-4 w-4" /> Unirme con código
          </button>
          <button
            onClick={() => setMode('create')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium',
              mode === 'create' ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
            )}
          >
            <Crown className="h-4 w-4" /> Crear comunidad
          </button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {mode === 'join' ? (
              <form onSubmit={submitJoin} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Introduce el código que te ha facilitado el presidente de tu comunidad.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="joinCode">Código de la comunidad</Label>
                  <Input
                    id="joinCode"
                    value={join.joinCode}
                    onChange={(e) => setJoin((s) => ({ ...s, joinCode: e.target.value }))}
                    placeholder="Ej. OLIVOS24"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit">Tu vivienda</Label>
                  <Input
                    id="unit"
                    value={join.unit}
                    onChange={(e) => setJoin((s) => ({ ...s, unit: e.target.value }))}
                    placeholder="Ej. 3ºB"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Uniéndome…' : 'Unirme a la comunidad'}
                </Button>
              </form>
            ) : (
              <form onSubmit={submitCreate} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Al crear la comunidad serás su <span className="font-medium text-foreground">presidente</span> y
                  podrás gestionar juntas, arcas y temas.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre de la comunidad</Label>
                  <Input
                    id="name"
                    value={create.name}
                    onChange={(e) => setCreate((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Ej. Comunidad Los Olivos"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={create.address}
                    onChange={(e) => setCreate((s) => ({ ...s, address: e.target.value }))}
                    placeholder="Calle, número, ciudad"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cunit">Tu vivienda</Label>
                  <Input
                    id="cunit"
                    value={create.unit}
                    onChange={(e) => setCreate((s) => ({ ...s, unit: e.target.value }))}
                    placeholder="Ej. 3ºB"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Creando…' : 'Crear comunidad'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Button variant="ghost" onClick={logout} className="mt-4 w-full text-muted-foreground">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
