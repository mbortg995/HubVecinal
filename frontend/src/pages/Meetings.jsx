import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useCommunities } from '@/context/CommunityContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { formatDateTime, toInputDateTime } from '@/lib/format';

const emptyForm = { title: '', date: '', location: '', notes: '', status: 'upcoming' };

export default function Meetings() {
  const { activeId, canManage } = useCommunities();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!activeId) return;
    setLoading(true);
    api
      .get(`/communities/${activeId}/meetings`)
      .then(({ data }) => setMeetings(data.meetings))
      .finally(() => setLoading(false));
  }, [activeId]);

  useEffect(() => load(), [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, date: toInputDateTime(Date.now()) });
    setError('');
    setOpen(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      title: m.title,
      date: toInputDateTime(m.date),
      location: m.location || '',
      notes: m.notes || '',
      status: m.status,
    });
    setError('');
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, date: new Date(form.date).toISOString() };
      if (editing) {
        await api.patch(`/communities/${activeId}/meetings/${editing._id}`, payload);
      } else {
        await api.post(`/communities/${activeId}/meetings`, payload);
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar');
    }
  };

  const remove = async (m) => {
    if (!confirm(`¿Eliminar la junta "${m.title}"?`)) return;
    await api.delete(`/communities/${activeId}/meetings/${m._id}`);
    load();
  };

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Juntas vecinales"
        description="Próximas convocatorias y juntas celebradas"
        action={
          canManage && (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nueva junta
            </Button>
          )
        }
      />

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Todavía no hay juntas registradas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <Card key={m._id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{m.title}</p>
                      <Badge variant={m.status === 'upcoming' ? 'default' : 'secondary'}>
                        {m.status === 'upcoming' ? 'Próxima' : 'Celebrada'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDateTime(m.date)}</p>
                    {m.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {m.location}
                      </p>
                    )}
                    {m.notes && <p className="mt-2 max-w-prose text-sm">{m.notes}</p>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(m)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar junta' : 'Nueva junta'}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={form.title} onChange={upd('title')} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha y hora</Label>
              <Input id="date" type="datetime-local" value={form.date} onChange={upd('date')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <Select id="status" value={form.status} onChange={upd('status')}>
                <option value="upcoming">Próxima</option>
                <option value="held">Celebrada</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Lugar</Label>
            <Input id="location" value={form.location} onChange={upd('location')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Acta / notas</Label>
            <Textarea id="notes" value={form.notes} onChange={upd('notes')} rows={3} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
