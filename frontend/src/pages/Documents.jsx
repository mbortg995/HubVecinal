import { useEffect, useState, useCallback, useRef } from 'react';
import { FileText, Download, Trash2, Upload } from 'lucide-react';
import api from '@/lib/api';
import { useCommunities } from '@/context/CommunityContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { formatDate } from '@/lib/format';

const categories = [
  { value: 'acta', label: 'Acta' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'circular', label: 'Circular' },
  { value: 'factura', label: 'Factura' },
  { value: 'otro', label: 'Otro' },
];
const catLabel = (v) => categories.find((c) => c.value === v)?.label || 'Otro';

function humanSize(bytes) {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export default function Documents() {
  const { activeId, canManage } = useCommunities();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'otro' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const fileInput = useRef(null);

  const load = useCallback(() => {
    if (!activeId) return;
    setLoading(true);
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    api
      .get(`/communities/${activeId}/documents${qs}`)
      .then(({ data }) => setDocuments(data.documents))
      .finally(() => setLoading(false));
  }, [activeId, q]);

  // Búsqueda con un pequeño retardo para no llamar en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Selecciona un archivo');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', form.name || file.name);
      fd.append('category', form.category);
      await api.post(`/communities/${activeId}/documents`, fd);
      setForm({ name: '', category: 'otro' });
      setFile(null);
      setOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo subir el documento');
    } finally {
      setBusy(false);
    }
  };

  // Descarga autenticada: pedimos el blob (el interceptor añade el token) y lo guardamos.
  const download = async (doc) => {
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

  const remove = async (doc) => {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return;
    await api.delete(`/communities/${activeId}/documents/${doc._id}`);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Documentos"
        description="Actas, contratos, seguros y circulares de la comunidad"
        action={
          canManage && (
            <Button onClick={() => setOpen(true)}>
              <Upload className="h-4 w-4" /> Subir documento
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en documentos (nombre y contenido de los PDF)…"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {q.trim() ? 'Sin resultados para tu búsqueda.' : 'Todavía no hay documentos.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc._id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(doc.createdAt)}
                      {doc.size ? ` · ${humanSize(doc.size)}` : ''}
                      {doc.uploadedBy?.name ? ` · ${doc.uploadedBy.name}` : ''}
                    </p>
                    {doc.textPreview && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">
                        {doc.textPreview}…
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{catLabel(doc.category)}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => download(doc)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  {canManage && (
                    <Button variant="ghost" size="icon" onClick={() => remove(doc)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Subir documento">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="file">Archivo</Label>
            <Input
              id="file"
              ref={fileInput}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre (opcional)</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Si lo dejas vacío, se usa el nombre del archivo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Categoría</Label>
            <Select
              id="category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Subiendo…' : 'Subir'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
