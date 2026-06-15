import { useEffect, useState, useCallback } from 'react';
import { Crown, ShieldCheck, User, Plus, Trash2, Copy, Check, Mail, X } from 'lucide-react';
import api from '@/lib/api';
import { useCommunities } from '@/context/CommunityContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';

const roleMeta = {
  admin: { label: 'Administrador', icon: ShieldCheck, variant: 'default' },
  president: { label: 'Presidente', icon: Crown, variant: 'default' },
  owner: { label: 'Propietario', icon: User, variant: 'secondary' },
};

export default function Members() {
  const { activeId, canManage, role: myRole } = useCommunities();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'owner', unit: '' });
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(() => {
    if (!activeId) return;
    setLoading(true);
    const reqs = [api.get(`/communities/${activeId}/members`)];
    if (canManage) reqs.push(api.get(`/communities/${activeId}/invitations`));
    Promise.all(reqs)
      .then((res) => {
        setMembers(res[0].data.members);
        setInvitations(res[1]?.data.invitations || []);
      })
      .finally(() => setLoading(false));
  }, [activeId, canManage]);

  useEffect(() => load(), [load]);

  const invite = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/communities/${activeId}/invitations`, form);
      setForm({ email: '', role: 'owner', unit: '' });
      setOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear la invitación');
    }
  };

  const revoke = async (inv) => {
    if (!confirm(`¿Revocar la invitación a ${inv.email}?`)) return;
    await api.delete(`/communities/${activeId}/invitations/${inv._id}`);
    load();
  };

  const removeMember = async (m) => {
    if (!confirm(`¿Quitar a ${m.user?.name} de la comunidad?`)) return;
    await api.delete(`/communities/${activeId}/members/${m._id}`);
    load();
  };

  const copyLink = (inv) => {
    const url = `${window.location.origin}/invitar/${inv.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(inv._id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Un superadmin puede conceder rol admin; el resto de gestores solo owner/president.
  const roleOptions =
    myRole === 'superadmin'
      ? [
          { value: 'owner', label: 'Propietario' },
          { value: 'president', label: 'Presidente' },
          { value: 'admin', label: 'Administrador' },
        ]
      : [
          { value: 'owner', label: 'Propietario' },
          { value: 'president', label: 'Presidente' },
        ];

  return (
    <div>
      <PageHeader
        title="Vecinos"
        description="Miembros de la comunidad e invitaciones pendientes"
        action={
          canManage && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Invitar
            </Button>
          )
        }
      />

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-6">
          {/* Invitaciones pendientes (solo gestores) */}
          {canManage && invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4" /> Invitaciones pendientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {invitations.map((inv) => (
                  <div
                    key={inv._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {roleMeta[inv.role]?.label}
                        {inv.unit ? ` · ${inv.unit}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyLink(inv)}>
                        {copiedId === inv._id ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-600" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" /> Copiar enlace
                          </>
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => revoke(inv)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Miembros */}
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((m) => {
              const meta = roleMeta[m.role] || roleMeta.owner;
              const Icon = meta.icon;
              return (
                <Card key={m._id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.user?.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{m.user?.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {m.unit && <Badge variant="secondary">{m.unit}</Badge>}
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    {canManage && (
                      <Button variant="ghost" size="icon" onClick={() => removeMember(m)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Invitar a la comunidad"
        description="Se generará un enlace de invitación que podrás copiar y enviar."
      >
        <form onSubmit={invite} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email del invitado</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="role">Rol</Label>
              <Select
                id="role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {roleOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Vivienda</Label>
              <Input
                id="unit"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                placeholder="Ej. 3ºB"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear invitación</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
