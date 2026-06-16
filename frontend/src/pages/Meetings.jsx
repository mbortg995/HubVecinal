import { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Send,
  ListOrdered,
  X,
  Users,
  ClipboardList,
  FileText,
  Download,
} from 'lucide-react';
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

const majorityLabels = {
  simple: 'Mayoría simple',
  tres_quintos: '3/5',
  un_tercio: '1/3',
  unanimidad: 'Unanimidad',
};
const voteLabels = { favor: 'A favor', contra: 'En contra', abstencion: 'Abstención' };

const emptyForm = {
  title: '',
  date: '',
  secondCallDate: '',
  location: '',
  notes: '',
  status: 'upcoming',
  agenda: [],
};

export default function Meetings() {
  const { activeId, canManage } = useCommunities();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Detalle de junta (quórum, asistencia, votaciones).
  const [detail, setDetail] = useState(null);
  const [att, setAtt] = useState({}); // ownerId -> 'absent' | 'present' | 'proxy:<id>'
  const [actaFile, setActaFile] = useState(null);

  const load = useCallback(() => {
    if (!activeId) return;
    setLoading(true);
    api
      .get(`/communities/${activeId}/meetings`)
      .then(({ data }) => setMeetings(data.meetings))
      .finally(() => setLoading(false));
  }, [activeId]);

  useEffect(() => load(), [load]);

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 4000);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, date: toInputDateTime(Date.now()), agenda: [] });
    setError('');
    setOpen(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      title: m.title,
      date: toInputDateTime(m.date),
      secondCallDate: m.secondCallDate ? toInputDateTime(m.secondCallDate) : '',
      location: m.location || '',
      notes: m.notes || '',
      status: m.status,
      agenda: (m.agenda || [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((p) => ({ title: p.title, description: p.description || '' })),
    });
    setError('');
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        date: new Date(form.date).toISOString(),
        secondCallDate: form.secondCallDate ? new Date(form.secondCallDate).toISOString() : null,
        agenda: form.agenda.filter((p) => p.title.trim()),
      };
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

  const sendConvocatoria = async (m) => {
    if (!confirm(`¿Enviar la convocatoria de "${m.title}" por email a todos los vecinos?`)) return;
    try {
      const { data } = await api.post(`/communities/${activeId}/meetings/${m._id}/convocatoria`);
      flash(`Convocatoria enviada a ${data.notified} vecino(s).`);
      load();
    } catch (err) {
      flash(err.response?.data?.message || 'No se pudo enviar');
    }
  };

  // --- Detalle / asistencia ---
  const openDetail = async (m) => {
    const { data } = await api.get(`/communities/${activeId}/meetings/${m._id}`);
    setDetail(data);
    // Reconstruye el borrador de asistencia.
    const draft = {};
    data.owners.forEach((o) => (draft[o.user] = 'absent'));
    data.meeting.attendance.forEach((a) => {
      const id = a.owner?._id || a.owner;
      if (a.proxyTo) draft[id] = `proxy:${a.proxyTo._id || a.proxyTo}`;
      else draft[id] = 'present';
    });
    setAtt(draft);
  };

  const refreshDetail = async () => {
    if (!detail) return;
    const { data } = await api.get(`/communities/${activeId}/meetings/${detail.meeting._id}`);
    setDetail(data);
  };

  const configPoint = async (pointId, body) => {
    await api.patch(`/communities/${activeId}/meetings/${detail.meeting._id}/agenda/${pointId}`, body);
    refreshDetail();
  };

  const vote = async (pointId, value) => {
    try {
      await api.post(
        `/communities/${activeId}/meetings/${detail.meeting._id}/agenda/${pointId}/vote`,
        { value }
      );
      refreshDetail();
    } catch (err) {
      flash(err.response?.data?.message || 'No se pudo votar');
    }
  };

  const uploadActa = async () => {
    if (!actaFile) return;
    const fd = new FormData();
    fd.append('file', actaFile);
    await api.post(`/communities/${activeId}/meetings/${detail.meeting._id}/acta`, fd);
    setActaFile(null);
    refreshDetail();
    flash('Acta adjuntada');
  };

  const downloadActa = async () => {
    const doc = detail.meeting.acta;
    const res = await api.get(`/communities/${activeId}/documents/${doc._id}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.originalName || doc.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeActa = async () => {
    if (!confirm('¿Eliminar el acta adjunta?')) return;
    await api.delete(`/communities/${activeId}/meetings/${detail.meeting._id}/acta`);
    refreshDetail();
  };

  const saveAttendance = async () => {
    const attendance = Object.entries(att)
      .filter(([, v]) => v !== 'absent')
      .map(([owner, v]) =>
        v.startsWith('proxy:') ? { owner, proxyTo: v.slice(6) } : { owner }
      );
    const { data } = await api.put(
      `/communities/${activeId}/meetings/${detail.meeting._id}/attendance`,
      { attendance }
    );
    setDetail((d) => ({ ...d, quorum: data.quorum }));
    flash('Asistencia guardada');
  };

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Helpers del orden del día.
  const addPoint = () => setForm((f) => ({ ...f, agenda: [...f.agenda, { title: '', description: '' }] }));
  const updPoint = (i, k, v) =>
    setForm((f) => ({
      ...f,
      agenda: f.agenda.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)),
    }));
  const removePoint = (i) =>
    setForm((f) => ({ ...f, agenda: f.agenda.filter((_, idx) => idx !== i) }));

  return (
    <div>
      <PageHeader
        title="Juntas vecinales"
        description="Convocatorias, orden del día y juntas celebradas"
        action={
          canManage && (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nueva junta
            </Button>
          )
        }
      />

      {notice && (
        <div className="mb-4 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</div>
      )}

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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{m.title}</p>
                      <Badge variant={m.status === 'upcoming' ? 'default' : 'secondary'}>
                        {m.status === 'upcoming' ? 'Próxima' : 'Celebrada'}
                      </Badge>
                      {m.convocatoriaSentAt && <Badge variant="success">Convocada</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      1ª: {formatDateTime(m.date)}
                      {m.secondCallDate && ` · 2ª: ${formatDateTime(m.secondCallDate)}`}
                    </p>
                    {m.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {m.location}
                      </p>
                    )}
                    {m.agenda?.length > 0 && (
                      <div className="mt-2">
                        <p className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                          <ListOrdered className="h-3 w-3" /> Orden del día
                        </p>
                        <ol className="ml-4 list-decimal text-sm">
                          {m.agenda
                            .slice()
                            .sort((a, b) => a.order - b.order)
                            .map((p) => (
                              <li key={p._id || p.title}>
                                {p.title}
                                {p.description && (
                                  <span className="text-muted-foreground"> — {p.description}</span>
                                )}
                              </li>
                            ))}
                        </ol>
                      </div>
                    )}
                    {m.notes && <p className="mt-2 max-w-prose text-sm">{m.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title="Detalle / asistencia / votaciones" onClick={() => openDetail(m)}>
                    <ClipboardList className="h-4 w-4" />
                  </Button>
                  {canManage && (
                    <>
                      {m.status === 'upcoming' && (
                        <Button variant="ghost" size="icon" title="Enviar convocatoria" onClick={() => sendConvocatoria(m)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(m)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Editar junta' : 'Nueva junta'}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={form.title} onChange={upd('title')} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">1ª convocatoria</Label>
              <Input id="date" type="datetime-local" value={form.date} onChange={upd('date')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secondCallDate">2ª convocatoria (opcional)</Label>
              <Input
                id="secondCallDate"
                type="datetime-local"
                value={form.secondCallDate}
                onChange={upd('secondCallDate')}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="location">Lugar</Label>
              <Input id="location" value={form.location} onChange={upd('location')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <Select id="status" value={form.status} onChange={upd('status')}>
                <option value="upcoming">Próxima</option>
                <option value="held">Celebrada</option>
              </Select>
            </div>
          </div>

          {/* Orden del día */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Orden del día</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPoint}>
                <Plus className="h-4 w-4" /> Punto
              </Button>
            </div>
            {form.agenda.length === 0 && (
              <p className="text-xs text-muted-foreground">Añade los puntos a tratar.</p>
            )}
            {form.agenda.map((p, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-2">
                <span className="mt-2 text-sm text-muted-foreground">{i + 1}.</span>
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Título del punto"
                    value={p.title}
                    onChange={(e) => updPoint(i, 'title', e.target.value)}
                  />
                  <Input
                    placeholder="Descripción (opcional)"
                    value={p.description}
                    onChange={(e) => updPoint(i, 'description', e.target.value)}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removePoint(i)}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" value={form.notes} onChange={upd('notes')} rows={2} />
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

      {/* Detalle: quórum y asistencia */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} title={detail?.meeting?.title} className="max-w-2xl">
        {detail && (
          <div className="space-y-5">
            {/* Quórum */}
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4" /> Quórum
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(detail.quorum.percent, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.quorum.percent.toFixed(1)}% de coeficientes ·{' '}
                {detail.quorum.ownersPresent}/{detail.quorum.ownersTotal} propietarios ·{' '}
                {detail.quorum.firstCallValid
                  ? 'quórum de 1ª convocatoria'
                  : detail.quorum.secondCallValid
                    ? 'válido en 2ª convocatoria'
                    : 'sin quórum'}
              </p>
            </div>

            {/* Asistencia (gestores) */}
            {detail.canManage ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Asistencia y delegaciones</p>
                {detail.owners.map((o) => (
                  <div key={o.user} className="flex items-center justify-between gap-2">
                    <span className="text-sm">
                      {o.name} <span className="text-muted-foreground">({o.coefficient}%)</span>
                    </span>
                    <Select
                      className="max-w-[60%]"
                      value={att[o.user] || 'absent'}
                      onChange={(e) => setAtt((a) => ({ ...a, [o.user]: e.target.value }))}
                    >
                      <option value="absent">Ausente</option>
                      <option value="present">Presente</option>
                      {detail.owners
                        .filter((x) => x.user !== o.user)
                        .map((x) => (
                          <option key={x.user} value={`proxy:${x.user}`}>
                            Representado por {x.name}
                          </option>
                        ))}
                    </Select>
                  </div>
                ))}
                <Button size="sm" onClick={saveAttendance}>
                  Guardar asistencia
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {detail.quorum.ownersPresent} de {detail.quorum.ownersTotal} propietarios presentes.
              </p>
            )}

            {/* Orden del día y votaciones */}
            {detail.meeting.agenda?.length > 0 && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ListOrdered className="h-4 w-4" /> Puntos y votaciones
                </p>
                {detail.meeting.agenda.map((p, i) => (
                  <div key={p._id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {i + 1}. {p.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{majorityLabels[p.majorityType]}</Badge>
                        {p.result.tally.favor + p.result.tally.contra + p.result.tally.abstencion > 0 && (
                          <Badge variant={p.result.approved ? 'success' : 'destructive'}>
                            {p.result.approved ? 'Aprobado' : 'No aprobado'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      A favor {p.result.tally.favor}% · En contra {p.result.tally.contra}% · Abstención{' '}
                      {p.result.tally.abstencion}%
                      {p.votingOpen ? ' · votación abierta' : ' · votación cerrada'}
                    </p>

                    {/* Botones de voto (propietarios, con votación abierta) */}
                    {detail.canVote && p.votingOpen && (
                      <div className="mt-2 flex gap-2">
                        {['favor', 'contra', 'abstencion'].map((v) => (
                          <Button
                            key={v}
                            size="sm"
                            variant={p.myVote === v ? 'default' : 'outline'}
                            onClick={() => vote(p._id, v)}
                          >
                            {voteLabels[v]}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Controles del gestor */}
                    {detail.canManage && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Select
                          className="h-9 max-w-[12rem]"
                          value={p.majorityType}
                          onChange={(e) => configPoint(p._id, { majorityType: e.target.value })}
                        >
                          <option value="simple">Mayoría simple</option>
                          <option value="tres_quintos">3/5</option>
                          <option value="un_tercio">1/3</option>
                          <option value="unanimidad">Unanimidad</option>
                        </Select>
                        <Button
                          size="sm"
                          variant={p.votingOpen ? 'destructive' : 'default'}
                          onClick={() => configPoint(p._id, { votingOpen: !p.votingOpen })}
                        >
                          {p.votingOpen ? 'Cerrar votación' : 'Abrir votación'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Acta (PDF) */}
            <div className="space-y-2 border-t pt-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" /> Acta
              </p>
              {detail.meeting.acta ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                  <span className="text-sm">{detail.meeting.acta.name}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={downloadActa}>
                      <Download className="h-4 w-4" /> Descargar
                    </Button>
                    {detail.canManage && (
                      <Button variant="ghost" size="icon" onClick={removeActa}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : detail.canManage ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="file" accept="application/pdf" onChange={(e) => setActaFile(e.target.files?.[0] || null)} />
                  <Button size="sm" onClick={uploadActa} disabled={!actaFile}>
                    Adjuntar acta
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aún no se ha adjuntado el acta.</p>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
