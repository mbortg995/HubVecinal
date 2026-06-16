import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, CheckCircle2, Circle } from 'lucide-react';
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
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const emptyForm = { title: '', description: '', status: 'pending', resolution: '', meeting: '' };

export default function Topics() {
  const { activeId, canManage } = useCommunities();
  const [topics, setTopics] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!activeId) return;
    setLoading(true);
    Promise.all([
      api.get(`/communities/${activeId}/topics`),
      api.get(`/communities/${activeId}/meetings`),
    ])
      .then(([t, m]) => {
        setTopics(t.data.topics);
        setMeetings(m.data.meetings);
      })
      .finally(() => setLoading(false));
  }, [activeId]);

  useEffect(() => load(), [load]);

  const visible = topics.filter((t) => filter === 'all' || t.status === filter);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || '',
      status: t.status,
      resolution: t.resolution || '',
      meeting: t.meeting?._id || t.meeting || '',
    });
    setError('');
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, meeting: form.meeting || null };
      if (editing) {
        await api.patch(`/communities/${activeId}/topics/${editing._id}`, payload);
      } else {
        await api.post(`/communities/${activeId}/topics`, payload);
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar');
    }
  };

  const remove = async (t) => {
    if (!confirm(`¿Eliminar el tema "${t.title}"?`)) return;
    await api.delete(`/communities/${activeId}/topics/${t._id}`);
    load();
  };

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const filters = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'resolved', label: 'Resueltos' },
  ];

  return (
    <div>
      <PageHeader
        title="Temas"
        description="Asuntos pendientes y resueltos de la comunidad"
        action={
          canManage && (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nuevo tema
            </Button>
          )
        }
      />

      <div className="mb-4 flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f.value ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay temas en esta vista.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => (
            <Card key={t._id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="flex gap-3">
                  {t.status === 'resolved' ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{t.title}</p>
                      <Badge variant={t.status === 'resolved' ? 'success' : 'warning'}>
                        {t.status === 'resolved' ? 'Resuelto' : 'Pendiente'}
                      </Badge>
                      {t.sourceIncident && <Badge variant="outline">Desde incidencia</Badge>}
                    </div>
                    {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                    {t.status === 'resolved' && t.resolution && (
                      <p className="mt-2 rounded-md bg-emerald-50 p-2 text-sm text-emerald-800">
                        <span className="font-medium">Resolución:</span> {t.resolution}
                      </p>
                    )}
                    {t.meeting && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Tratado en: {t.meeting.title} · {formatDate(t.meeting.date)}
                      </p>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(t)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Editar tema' : 'Nuevo tema'}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={form.title} onChange={upd('title')} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={form.description} onChange={upd('description')} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select id="status" value={form.status} onChange={upd('status')}>
              <option value="pending">Pendiente</option>
              <option value="resolved">Resuelto</option>
            </Select>
          </div>
          {form.status === 'resolved' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="resolution">Resolución adoptada</Label>
                <Textarea id="resolution" value={form.resolution} onChange={upd('resolution')} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meeting">Junta en la que se trató</Label>
                <Select id="meeting" value={form.meeting} onChange={upd('meeting')}>
                  <option value="">— Sin asignar —</option>
                  {meetings.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.title} · {formatDate(m.date)}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}
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
