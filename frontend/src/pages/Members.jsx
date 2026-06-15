import { useEffect, useState } from 'react';
import { Crown, User } from 'lucide-react';
import api from '@/lib/api';
import { useCommunities } from '@/context/CommunityContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Members() {
  const { activeId } = useCommunities();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    api
      .get(`/communities/${activeId}/members`)
      .then(({ data }) => setMembers(data.members))
      .finally(() => setLoading(false));
  }, [activeId]);

  return (
    <div>
      <PageHeader title="Vecinos" description="Propietarios vinculados a la comunidad" />

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <Card key={m._id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {m.isPresident ? <Crown className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {m.unit && <Badge variant="secondary">{m.unit}</Badge>}
                  {m.isPresident && (
                    <Badge>
                      <Crown className="mr-1 h-3 w-3" /> Presidente
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
