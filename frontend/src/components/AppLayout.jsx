import { Navigate, Outlet } from 'react-router-dom';
import { Layout } from './Layout';
import { useCommunities } from '@/context/CommunityContext';

// Garantiza que hay una comunidad activa antes de mostrar la app.
export function AppLayout() {
  const { active, loading } = useCommunities();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Cargando comunidad…
      </div>
    );
  }

  if (!active) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
