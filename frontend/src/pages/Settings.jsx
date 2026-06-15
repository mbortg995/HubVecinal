import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, LogOut } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCommunities } from '@/context/CommunityContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const { activeId, canManage, reload } = useCommunities();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ name: '', address: '' });
  const [adminEmail, setAdminEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchDetail = () => {
    if (!activeId) return;
    api.get(`/communities/${activeId}`).then(({ data }) => {
      setData(data);
      setForm({ name: data.community.name, address: data.community.address || '' });
    });
  };

  useEffect(fetchDetail, [activeId]);

  if (!data) return <p className="text-muted-foreground">Cargando…</p>;

  const { community } = data;

  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };

  const saveCommunity = async (e) => {
    e.preventDefault();
    await api.patch(`/communities/${activeId}`, form);
    await reload();
    fetchDetail();
    flash('Datos de la comunidad actualizados');
  };

  const assignAdmin = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/communities/${activeId}/admin`, { email: adminEmail });
      setAdminEmail('');
      fetchDetail();
      flash('Administrador asignado');
    } catch (err) {
      flash(err.response?.data?.message || 'No se pudo asignar');
    }
  };

  const leave = async () => {
    if (!confirm('¿Seguro que quieres abandonar esta comunidad?')) return;
    await api.post(`/communities/${activeId}/leave`);
    await refreshUser();
    await reload();
    navigate('/onboarding', { replace: true });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(community.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <PageHeader title="Ajustes" description="Datos de la comunidad y de tu cuenta" />

      {msg && (
        <div className="mb-4 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{msg}</div>
      )}

      <div className="space-y-6">
        {/* Código de invitación */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Código de invitación</CardTitle>
            <CardDescription>
              Comparte este código con los propietarios para que se unan a la comunidad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 font-mono text-lg font-semibold hover:bg-accent"
            >
              {community.joinCode}
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </CardContent>
        </Card>

        {/* Datos de la comunidad (solo gestores) */}
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos de la comunidad</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveCommunity} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </div>
                <Button type="submit">Guardar cambios</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Asignar administrador (solo presidente/gestor) */}
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Administrador de fincas</CardTitle>
              <CardDescription>
                Actual: {community.administrator?.name || 'Sin asignar'}
                {community.administrator?.email ? ` (${community.administrator.email})` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={assignAdmin} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  placeholder="email@administrador.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
                <Button type="submit">Asignar</Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">
                La cuenta debe existir y estar registrada como administrador.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tu cuenta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tu cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rol</span>
              <span className="font-medium">
                {user.role === 'admin' ? 'Administrador' : user.isPresident ? 'Presidente' : 'Propietario'}
              </span>
            </div>
            {user.unit && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vivienda</span>
                <span className="font-medium">{user.unit}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abandonar comunidad (solo propietarios no presidentes) */}
        {user.role === 'owner' && !user.isPresident && (
          <Card className="border-destructive/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">Abandonar comunidad</p>
                <p className="text-sm text-muted-foreground">
                  Dejarás de tener acceso a la información de esta comunidad.
                </p>
              </div>
              <Button variant="destructive" onClick={leave}>
                <LogOut className="h-4 w-4" /> Abandonar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
