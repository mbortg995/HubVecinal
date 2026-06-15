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

  // ¿El usuario puede gestionar la comunidad activa? (presidente o admin asignado)
  const userId = user?._id;
  const canManage = Boolean(
    active &&
      userId &&
      (String(active.president) === String(userId) ||
        (user?.role === 'admin' && String(active.administrator) === String(userId)))
  );

  return (
    <CommunityContext.Provider
      value={{ communities, active, activeId, setActiveId, loading, reload: load, canManage }}
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
