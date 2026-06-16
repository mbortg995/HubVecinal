import { useEffect, useState, useCallback } from 'react';
import { Megaphone, Plus, Trash2, Pin, PinOff } from 'lucide-react';
import api from '@/lib/api';
import { useCommunities } from '@/context/CommunityContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { formatDate } from '@/lib/format';

export default function Announcements() {
  const { activeId, canManage } = useCommunities();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', pinned: false, notifyByEmail: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    if (!activeId) return;
    setLoading(true);
    api
      .get(`/communities/${activeId}/announcements`)
      .then(({ data }) => setAnnouncements(data.announcements))
      .finally(() => setLoading(false));
  }, [activeId]);

  useEffect(() => load(), [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post(`/communities/${activeId}/announcements`, form);
      setForm({ title: '', body: '', pinned: false, notifyByEmail: false });
      setOpen(false);
      load();
      const text = form.notifyByEmail
        ? `Aviso publicado. Notificación enviada a ${data.notified} vecino(s).`
        : 'Aviso publicado.';
      setNotice(text);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo publicar el aviso');
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (a) => {
    await api.patch(`/communities/${activeId}/announcements/${a._id}`, { pinned: !a.pinned });
    load();
  };

  const remove = async (a) => {
    if (!confirm(`¿Eliminar el aviso "${a.title}"?`)) return;
    await api.delete(`/communities/${activeId}/announcements/${a._id}`);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Avisos"
        description="Tablón de circulares y comunicaciones de la comunidad"
        action={
          canManage && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo aviso
            </Button>
          )
        }
      />

      {notice && (
        <div className="mb-4 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay avisos publicados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a._id} className={a.pinned ? 'border-primary/40' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{a.title}</p>
                        {a.pinned && (
                          <Badge variant="secondary">
                            <Pin className="mr-1 h-3 w-3" /> Fijado
                          </Badge>
                        )}
                      </div>
                      {a.body && <p className="mt-1 whitespace-pre-line text-sm">{a.body}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(a.createdAt)}
                        {a.createdBy?.name ? ` · ${a.createdBy.name}` : ''}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => togglePin(a)}>
                        {a.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(a)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo aviso">
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
            <Label htmlFor="body">Mensaje</Label>
            <Textarea
              id="body"
              rows={4}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
            />
            Fijar arriba del tablón
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.notifyByEmail}
              onChange={(e) => setForm((f) => ({ ...f, notifyByEmail: e.target.checked }))}
            />
            Notificar por email a todos los vecinos
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Publicando…' : 'Publicar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
