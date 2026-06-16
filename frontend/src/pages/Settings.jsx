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
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ name: '', address: '' });
  const [profile, setProfile] = useState({ name: '', nif: '', phone: '' });
  const [msg, setMsg] = useState('');

  const fetchDetail = () => {
    if (!activeId) return;
    api.get(`/communities/${activeId}`).then(({ data }) => {
      setData(data);
      setForm({ name: data.community.name, address: data.community.address || '' });
    });
  };

  useEffect(fetchDetail, [activeId]);

  // Carga los datos del usuario en el formulario de perfil.
  useEffect(() => {
    if (user) setProfile({ name: user.name || '', nif: user.nif || '', phone: user.phone || '' });
  }, [user]);

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

  const saveProfile = async (e) => {
    e.preventDefault();
    await updateProfile(profile);
    flash('Tus datos se han actualizado');
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
            <CardDescription>
              {user.email} · Rol en esta comunidad: {roleLabels[role] || '—'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pname">Nombre</Label>
                <Input
                  id="pname"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pnif">NIF</Label>
                  <Input
                    id="pnif"
                    value={profile.nif}
                    onChange={(e) => setProfile((p) => ({ ...p, nif: e.target.value }))}
                    placeholder="00000000X"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pphone">Teléfono</Label>
                  <Input
                    id="pphone"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="600 000 000"
                  />
                </div>
              </div>
              <Button type="submit">Guardar mis datos</Button>
            </form>
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
