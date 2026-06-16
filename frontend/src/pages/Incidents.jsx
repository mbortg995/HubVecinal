import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Plus, Trash2, MessageSquare, ImageIcon, Send } from 'lucide-react';
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
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const statusMeta = {
  open: { label: 'Abierta', variant: 'warning' },
  in_progress: { label: 'En curso', variant: 'default' },
  resolved: { label: 'Resuelta', variant: 'success' },
};

export default function Incidents() {
  const { activeId, canManage } = useCommunities();
  const [incidents, setIncidents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Detalle
  const [detail, setDetail] = useState(null);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [comment, setComment] = useState('');

  const load = useCallback(() => {
    if (!activeId) return;
    setLoading(true);
    const reqs = [api.get(`/communities/${activeId}/incidents`)];
    if (canManage) reqs.push(api.get(`/communities/${activeId}/members`));
    Promise.all(reqs)
      .then((res) => {
        setIncidents(res[0].data.incidents);
        if (res[1]) setMembers(res[1].data.members);
      })
      .finally(() => setLoading(false));
  }, [activeId, canManage]);

  useEffect(() => load(), [load]);

  const visible = incidents.filter((i) => filter === 'all' || i.status === filter);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      files.forEach((f) => fd.append('photos', f));
      await api.post(`/communities/${activeId}/incidents`, fd);
      setForm({ title: '', description: '' });
      setFiles([]);
      setOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear la incidencia');
    } finally {
      setBusy(false);
    }
  };

  // Carga las fotos (como blobs autenticados) al abrir el detalle.
  const openDetail = async (inc) => {
    setDetail(inc);
    setComment('');
    setPhotoUrls([]);
    const urls = await Promise.all(
      inc.photos.map(async (_, idx) => {
        try {
          const res = await api.get(
            `/communities/${activeId}/incidents/${inc._id}/photos/${idx}/download`,
            { responseType: 'blob' }
          );
          return URL.createObjectURL(res.data);
        } catch {
          return null;
        }
      })
    );
    setPhotoUrls(urls.filter(Boolean));
  };

  const refreshDetail = (incident) => {
    setDetail(incident);
    setIncidents((list) => list.map((i) => (i._id === incident._id ? incident : i)));
  };

  const changeStatus = async (status) => {
    const { data } = await api.patch(`/communities/${activeId}/incidents/${detail._id}`, { status });
    refreshDetail(data.incident);
  };

  const assign = async (userId) => {
    const { data } = await api.patch(`/communities/${activeId}/incidents/${detail._id}`, {
      assignedTo: userId || null,
    });
    refreshDetail(data.incident);
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const { data } = await api.post(`/communities/${activeId}/incidents/${detail._id}/comments`, {
      text: comment,
    });
    refreshDetail(data.incident);
    setComment('');
  };

  const remove = async (inc) => {
    if (!confirm(`¿Eliminar la incidencia "${inc.title}"?`)) return;
    await api.delete(`/communities/${activeId}/incidents/${inc._id}`);
    setDetail(null);
    load();
  };

  const filters = [
    { value: 'all', label: 'Todas' },
    { value: 'open', label: 'Abiertas' },
    { value: 'in_progress', label: 'En curso' },
    { value: 'resolved', label: 'Resueltas' },
  ];

  return (
    <div>
      <PageHeader
        title="Incidencias"
        description="Reporta y haz seguimiento de las averías y problemas de la comunidad"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Reportar
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
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
            No hay incidencias en esta vista.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((inc) => {
            const meta = statusMeta[inc.status];
            return (
              <Card key={inc._id} className="cursor-pointer hover:border-primary/40" onClick={() => openDetail(inc)}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold">{inc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {inc.createdBy?.name} · {formatDateTime(inc.createdAt)}
                      </p>
                      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                        {inc.photos.length > 0 && (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" /> {inc.photos.length}
                          </span>
                        )}
                        {inc.comments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {inc.comments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Crear */}
      <Dialog open={open} onClose={() => setOpen(false)} title="Reportar incidencia">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="photos">Fotos (opcional)</Label>
            <Input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Enviando…' : 'Reportar'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Detalle */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} title={detail?.title}>
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusMeta[detail.status].variant}>
                {statusMeta[detail.status].label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {detail.createdBy?.name} · {formatDateTime(detail.createdAt)}
              </span>
            </div>

            {detail.description && <p className="text-sm">{detail.description}</p>}

            {photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photoUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-md object-cover" />
                  </a>
                ))}
              </div>
            )}

            {canManage && (
              <div className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select value={detail.status} onChange={(e) => changeStatus(e.target.value)}>
                    <option value="open">Abierta</option>
                    <option value="in_progress">En curso</option>
                    <option value="resolved">Resuelta</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Asignada a</Label>
                  <Select
                    value={detail.assignedTo?._id || ''}
                    onChange={(e) => assign(e.target.value)}
                  >
                    <option value="">Sin asignar</option>
                    {members.map((m) => (
                      <option key={m._id} value={m.user._id}>
                        {m.user.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
            {!canManage && detail.assignedTo && (
              <p className="text-sm text-muted-foreground">Asignada a: {detail.assignedTo.name}</p>
            )}

            {/* Comentarios */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Comentarios</p>
              {detail.comments.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin comentarios todavía.</p>
              )}
              {detail.comments.map((c, i) => (
                <div key={i} className="rounded-md bg-secondary p-2 text-sm">
                  <span className="font-medium">{c.author?.name || 'Usuario'}: </span>
                  {c.text}
                </div>
              ))}
              <form onSubmit={postComment} className="flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribe un comentario…"
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>

            {canManage && (
              <div className="flex justify-end border-t pt-3">
                <Button variant="destructive" size="sm" onClick={() => remove(detail)}>
                  <Trash2 className="h-4 w-4" /> Eliminar incidencia
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
