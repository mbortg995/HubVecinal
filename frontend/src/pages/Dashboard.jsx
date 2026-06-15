import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  CalendarDays,
  ListTodo,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  MapPin,
  Users,
} from 'lucide-react';
import api from '@/lib/api';
import { useCommunities } from '@/context/CommunityContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';

export default function Dashboard() {
  const { activeId } = useCommunities();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    api
      .get(`/communities/${activeId}`)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [activeId]);

  if (loading || !data) {
    return <p className="text-muted-foreground">Cargando el hub de tu comunidad…</p>;
  }

  const { community, funds, upcomingMeetings, lastHeldMeeting, pendingTopics, resolvedTopics } = data;
  const lastMeetingTopics = resolvedTopics.filter(
    (t) => t.meeting && lastHeldMeeting && t.meeting === lastHeldMeeting._id
  );

  return (
    <div>
      <PageHeader
        title={community.name}
        description={community.address || 'Tu comunidad de un vistazo'}
      />

      {/* Tarjetas resumen */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo en arcas
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(funds.balance)}</p>
            <div className="mt-2 flex gap-4 text-xs">
              <span className="flex items-center gap-1 text-emerald-600">
                <TrendingUp className="h-3 w-3" /> {formatCurrency(funds.income)}
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <TrendingDown className="h-3 w-3" /> {formatCurrency(funds.expense)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próxima junta
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {upcomingMeetings[0] ? (
              <>
                <p className="text-lg font-bold leading-tight">{upcomingMeetings[0].title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(upcomingMeetings[0].date)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No hay juntas programadas</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Temas pendientes
            </CardTitle>
            <ListTodo className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingTopics.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">por resolver</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Próximas juntas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Próximas juntas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMeetings.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay próximas juntas.</p>
            )}
            {upcomingMeetings.map((m) => (
              <div key={m._id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{m.title}</p>
                  <Badge variant="secondary">{formatDate(m.date)}</Badge>
                </div>
                {m.location && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {m.location}
                  </p>
                )}
              </div>
            ))}
            <Link to="/juntas" className="block text-sm font-medium text-primary hover:underline">
              Ver todas las juntas →
            </Link>
          </CardContent>
        </Card>

        {/* Última junta celebrada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" /> Última junta celebrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastHeldMeeting ? (
              <>
                <p className="font-medium">{lastHeldMeeting.title}</p>
                <p className="text-sm text-muted-foreground">{formatDate(lastHeldMeeting.date)}</p>
                {lastHeldMeeting.notes && (
                  <p className="mt-2 text-sm">{lastHeldMeeting.notes}</p>
                )}
                {lastMeetingTopics.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Temas resueltos
                    </p>
                    {lastMeetingTopics.map((t) => (
                      <div key={t._id} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{t.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aún no se ha celebrado ninguna junta.</p>
            )}
          </CardContent>
        </Card>

        {/* Temas pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="h-4 w-4" /> Temas pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingTopics.length === 0 && (
              <p className="text-sm text-muted-foreground">¡No hay temas pendientes!</p>
            )}
            {pendingTopics.slice(0, 5).map((t) => (
              <div key={t._id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{t.title}</p>
                  {t.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                  )}
                </div>
                <Badge variant="warning">Pendiente</Badge>
              </div>
            ))}
            <Link to="/temas" className="block text-sm font-medium text-primary hover:underline">
              Ver todos los temas →
            </Link>
          </CardContent>
        </Card>

        {/* Info comunidad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Tu comunidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Presidente/a</span>
              <span className="font-medium">{community.president?.name || 'Sin asignar'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Administrador</span>
              <span className="font-medium">
                {community.administrators?.length
                  ? community.administrators.map((a) => a.name).join(', ')
                  : 'Sin asignar'}
              </span>
            </div>
            <Link to="/vecinos" className="block text-sm font-medium text-primary hover:underline">
              Ver vecinos e invitaciones →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
