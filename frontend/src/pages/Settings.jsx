import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCommunities } from '@/context/CommunityContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const roleLabels = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  president: 'Presidente',
  owner: 'Propietario',
};

export default function Settings() {
  const { activeId, canManage, role, isSuperadmin, reload } = useCommunities();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ name: '', address: '' });
  const [msg, setMsg] = useState('');

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

  const deleteCommunity = async () => {
    if (!confirm(`¿Eliminar "${community.name}" y todos sus datos? Esta acción no se puede deshacer.`))
      return;
    await api.delete(`/communities/${activeId}`);
    await reload();
    navigate('/', { replace: true });
  };

  return (
    <div>
      <PageHeader title="Ajustes" description="Datos de la comunidad y de tu cuenta" />

      {msg && (
        <div className="mb-4 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{msg}</div>
      )}

      <div className="space-y-6">
        {/* Organización (superadmin) */}
        {isSuperadmin && user?.organization && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organización</CardTitle>
              <CardDescription>Administradora de fincas a la que pertenecen tus comunidades.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre</span>
                <span className="font-medium">{user.organization.name}</span>
              </div>
              {user.organization.contactEmail && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contacto</span>
                  <span className="font-medium">{user.organization.contactEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Datos de la comunidad (gestores) */}
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
              <span className="text-muted-foreground">Rol en esta comunidad</span>
              <span className="font-medium">{roleLabels[role] || '—'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Zona peligrosa (superadmin) */}
        {role === 'superadmin' && (
          <Card className="border-destructive/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">Eliminar comunidad</p>
                <p className="text-sm text-muted-foreground">
                  Borra la comunidad y todos sus datos (juntas, temas, arcas y membresías).
                </p>
              </div>
              <Button variant="destructive" onClick={deleteCommunity}>
                <Trash2 className="h-4 w-4" /> Eliminar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
