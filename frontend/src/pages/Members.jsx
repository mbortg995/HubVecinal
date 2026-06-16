import { useEffect, useState, useCallback } from 'react';
import { Crown, ShieldCheck, User, Plus, Trash2, Copy, Check, Mail, X, Pencil, Send } from 'lucide-react';
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

// Etiqueta/estilo de un miembro según su rol y, si es propietario regular,
// según sea propietario o inquilino.
function memberMeta(m) {
  if (m.role === 'owner' && m.occupantType === 'tenant') {
    return { label: 'Inquilino', icon: User, variant: 'secondary' };
  }
  return roleMeta[m.role] || roleMeta.owner;
}

// Opciones del selector "Tipo de miembro": combinan rol + tipo de ocupante.
const memberTypeOptions = [
  { key: 'propietario', label: 'Propietario', role: 'owner', occupantType: 'owner' },
  { key: 'inquilino', label: 'Inquilino', role: 'owner', occupantType: 'tenant' },
  { key: 'presidente', label: 'Presidente', role: 'president', occupantType: 'owner' },
  { key: 'administrador', label: 'Administrador', role: 'admin', occupantType: 'owner' },
];
const typeKey = (role, occupantType) =>
  memberTypeOptions.find((o) => o.role === role && o.occupantType === occupantType)?.key ||
  'propietario';

export default function Members() {
  const { activeId, canManage, role: myRole } = useCommunities();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: '',
    role: 'owner',
    occupantType: 'owner',
    unit: '',
    coefficient: '',
  });
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    unit: '',
    coefficient: '',
    isResident: true,
    role: 'owner',
    occupantType: 'owner',
  });

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
      await api.post(`/communities/${activeId}/invitations`, {
        ...form,
        coefficient: Number(form.coefficient) || 0,
      });
      setForm({ email: '', role: 'owner', occupantType: 'owner', unit: '', coefficient: '' });
      setOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear la invitación');
    }
  };

  const resend = async (inv) => {
    try {
      const { data } = await api.post(`/communities/${activeId}/invitations/${inv._id}/resend`);
      alert(
        data.emailDelivered
          ? `Invitación reenviada a ${inv.email}`
          : `Reenviada (modo dev: el email se registra en consola, no se envía).`
      );
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo reenviar');
    }
  };

  const revoke = async (inv) => {
    if (!confirm(`¿Revocar la invitación a ${inv.email}?`)) return;
    await api.delete(`/communities/${activeId}/invitations/${inv._id}`);
    load();
  };

  const openEdit = (m) => {
    setEditing(m);
    setEditForm({
      unit: m.unit || '',
      coefficient: m.coefficient ?? '',
      isResident: m.isResident !== false,
      role: m.role,
      occupantType: m.occupantType || 'owner',
    });
    setError('');
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        unit: editForm.unit,
        coefficient: Number(editForm.coefficient) || 0,
        isResident: editForm.isResident,
        // El tipo de ocupante solo aplica a propietarios regulares.
        occupantType: editForm.role === 'owner' ? editForm.occupantType : 'owner',
      };
      // El rol solo lo puede cambiar un superadmin.
      if (myRole === 'superadmin') payload.role = editForm.role;
      await api.patch(`/communities/${activeId}/members/${editing._id}`, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar');
    }
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

  // Suma de coeficientes de la comunidad (debería rondar el 100%).
  const totalCoefficient = members.reduce((sum, m) => sum + (m.coefficient || 0), 0);
  const coefficientOff = canManage && members.length > 0 && Math.abs(totalCoefficient - 100) > 0.01;

  // Un superadmin puede conceder rol admin; el resto de gestores no.
  const typeOptions =
    myRole === 'superadmin'
      ? memberTypeOptions
      : memberTypeOptions.filter((o) => o.role !== 'admin');

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
          {coefficientOff && (
            <div className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-700">
              La suma de coeficientes de participación es {totalCoefficient.toFixed(2)}% (debería ser
              100%). Revisa los coeficientes de las viviendas.
            </div>
          )}

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
                      <Button variant="outline" size="sm" onClick={() => resend(inv)}>
                        <Send className="h-4 w-4" /> Reenviar
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
              const meta = memberMeta(m);
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
                      {canManage && m.user?.nif && (
                        <p className="truncate text-xs text-muted-foreground">NIF: {m.user.nif}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {m.unit && <Badge variant="secondary">{m.unit}</Badge>}
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {m.coefficient > 0 && (
                        <span className="text-xs text-muted-foreground">{m.coefficient}%</span>
                      )}
                      {!m.isResident && (
                        <span className="text-xs text-muted-foreground">No reside</span>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex flex-col">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeMember(m)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
              <Label htmlFor="memberType">Tipo de miembro</Label>
              <Select
                id="memberType"
                value={typeKey(form.role, form.occupantType)}
                onChange={(e) => {
                  const opt = memberTypeOptions.find((o) => o.key === e.target.value);
                  setForm((f) => ({ ...f, role: opt.role, occupantType: opt.occupantType }));
                }}
              >
                {typeOptions.map((o) => (
                  <option key={o.key} value={o.key}>
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
          <div className="space-y-1.5">
            <Label htmlFor="coefficient">Coeficiente de participación (%)</Label>
            <Input
              id="coefficient"
              type="number"
              min="0"
              step="0.01"
              value={form.coefficient}
              onChange={(e) => setForm((f) => ({ ...f, coefficient: e.target.value }))}
              placeholder="Ej. 3.25"
            />
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

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Editar a ${editing?.user?.name || ''}`}
      >
        <form onSubmit={submitEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="eunit">Vivienda</Label>
              <Input
                id="eunit"
                value={editForm.unit}
                onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ecoef">Coeficiente (%)</Label>
              <Input
                id="ecoef"
                type="number"
                min="0"
                step="0.01"
                value={editForm.coefficient}
                onChange={(e) => setEditForm((f) => ({ ...f, coefficient: e.target.value }))}
              />
            </div>
          </div>
          {editForm.role === 'owner' && (
            <div className="space-y-1.5">
              <Label htmlFor="eoccupant">Tipo de ocupante</Label>
              <Select
                id="eoccupant"
                value={editForm.occupantType}
                onChange={(e) => setEditForm((f) => ({ ...f, occupantType: e.target.value }))}
              >
                <option value="owner">Propietario</option>
                <option value="tenant">Inquilino</option>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="eresident">Residencia</Label>
            <Select
              id="eresident"
              value={editForm.isResident ? 'yes' : 'no'}
              onChange={(e) => setEditForm((f) => ({ ...f, isResident: e.target.value === 'yes' }))}
            >
              <option value="yes">Reside en la vivienda</option>
              <option value="no">No reside (alquilada / no habitada)</option>
            </Select>
          </div>
          {myRole === 'superadmin' && (
            <div className="space-y-1.5">
              <Label htmlFor="erole">Rol</Label>
              <Select
                id="erole"
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="owner">Propietario</option>
                <option value="president">Presidente</option>
                <option value="admin">Administrador</option>
              </Select>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
