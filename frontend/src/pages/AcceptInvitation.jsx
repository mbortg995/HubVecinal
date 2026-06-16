import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Building2, Crown, ShieldCheck, User } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const roleLabels = {
  owner: { label: 'Propietario', icon: User },
  president: { label: 'Presidente', icon: Crown },
  admin: { label: 'Administrador', icon: ShieldCheck },
};

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [invitation, setInvitation] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | invalid
  const [form, setForm] = useState({ name: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/invitations/${token}`)
      .then(({ data }) => {
        setInvitation(data.invitation);
        setStatus('ready');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando invitación…</div>;
  }

  if (status === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Invitación no válida</CardTitle>
            <CardDescription>
              Este enlace no existe, ya fue utilizado o ha caducado. Pide a tu administrador o
              presidente que te envíe uno nuevo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Ir a iniciar sesión
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const accept = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post(`/invitations/${token}/accept`, form);
      setSession(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo aceptar la invitación');
    } finally {
      setBusy(false);
    }
  };

  const roleInfo =
    invitation.role === 'owner' && invitation.occupantType === 'tenant'
      ? { label: 'Inquilino', icon: User }
      : roleLabels[invitation.role] || roleLabels.owner;
  const RoleIcon = roleInfo.icon;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Te han invitado</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{invitation.community?.name}</CardTitle>
            <CardDescription>
              {invitation.organization?.name} te invita a unirte como{' '}
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <RoleIcon className="h-3.5 w-3.5" /> {roleInfo.label}
              </span>
              {invitation.unit ? ` · vivienda ${invitation.unit}` : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={accept} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={invitation.email} disabled />
              </div>

              {invitation.requiresAccount ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Tu nombre</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Crea una contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      minLength={6}
                      required
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ya tienes una cuenta con este email. Al aceptar, se añadirá esta comunidad a tu cuenta.
                </p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Uniéndome…' : 'Aceptar y unirme'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
