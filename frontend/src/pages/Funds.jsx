import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import api from '@/lib/api';
import { useCommunities } from '@/context/CommunityContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { formatCurrency, formatDate, toInputDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function Funds() {
  const { activeId, canManage } = useCommunities();
  const [transactions, setTransactions] = useState([]);
  const [funds, setFunds] = useState({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'income', concept: '', amount: '', date: '' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!activeId) return;
    setLoading(true);
    api
      .get(`/communities/${activeId}/transactions`)
      .then(({ data }) => {
        setTransactions(data.transactions);
        setFunds(data.funds);
      })
      .finally(() => setLoading(false));
  }, [activeId]);

  useEffect(() => load(), [load]);

  const openNew = () => {
    setForm({ type: 'income', concept: '', amount: '', date: toInputDateTime(Date.now()) });
    setError('');
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/communities/${activeId}/transactions`, {
        ...form,
        amount: Number(form.amount),
        date: new Date(form.date).toISOString(),
      });
      setOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar');
    }
  };

  const remove = async (t) => {
    if (!confirm(`¿Eliminar el movimiento "${t.concept}"?`)) return;
    await api.delete(`/communities/${activeId}/transactions/${t._id}`);
    load();
  };

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Arcas comunes"
        description="Saldo y movimientos económicos de la comunidad"
        action={
          canManage && (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nuevo movimiento
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo actual</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className={cn('text-3xl font-bold', funds.balance < 0 && 'text-destructive')}>
              {formatCurrency(funds.balance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(funds.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(funds.expense)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : transactions.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No hay movimientos registrados.</p>
          ) : (
            <div className="divide-y">
              {transactions.map((t) => (
                <div key={t._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full',
                        t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      )}
                    >
                      {t.type === 'income' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{t.concept}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'font-semibold',
                        t.type === 'income' ? 'text-emerald-600' : 'text-destructive'
                      )}
                    >
                      {t.type === 'income' ? '+' : '−'}
                      {formatCurrency(t.amount)}
                    </span>
                    {canManage && (
                      <Button variant="ghost" size="icon" onClick={() => remove(t)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo movimiento">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="type">Tipo</Label>
            <Select id="type" value={form.type} onChange={upd('type')}>
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="concept">Concepto</Label>
            <Input id="concept" value={form.concept} onChange={upd('concept')} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Importe (€)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={upd('amount')}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="datetime-local" value={form.date} onChange={upd('date')} required />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
