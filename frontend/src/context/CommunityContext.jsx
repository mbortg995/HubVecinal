import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from './AuthContext';

const CommunityContext = createContext(null);

export function CommunityProvider({ children }) {
  const { user } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/communities/mine');
      setCommunities(data.communities);
      setActiveId((prev) => {
        if (prev && data.communities.some((c) => c._id === prev)) return prev;
        return data.communities[0]?._id || null;
      });
      return data.communities;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
    else {
      setCommunities([]);
      setActiveId(null);
      setLoading(false);
    }
  }, [user, load]);

  const active = communities.find((c) => c._id === activeId) || null;

  // El rol efectivo viene del backend en cada comunidad ('superadmin'|'admin'|'president'|'owner').
  const role = active?.role || null;
  const canManage = role === 'superadmin' || role === 'admin' || role === 'president';
  const isSuperadmin = user?.platformRole === 'superadmin';

  return (
    <CommunityContext.Provider
      value={{
        communities,
        active,
        activeId,
        setActiveId,
        loading,
        reload: load,
        role,
        canManage,
        isSuperadmin,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunities() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunities debe usarse dentro de CommunityProvider');
  return ctx;
}
