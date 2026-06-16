import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar, si hay token intentamos recuperar el usuario.
  useEffect(() => {
    const token = localStorage.getItem('hv_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('hv_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAuthResponse = useCallback((data) => {
    localStorage.setItem('hv_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      return handleAuthResponse(data);
    },
    [handleAuthResponse]
  );

  // Alta de una administradora (organización + primer superadmin).
  const registerOrganization = useCallback(
    async (payload) => {
      const { data } = await api.post('/auth/register-organization', payload);
      return handleAuthResponse(data);
    },
    [handleAuthResponse]
  );

  // Inicia sesión a partir de la respuesta de aceptar una invitación.
  const setSession = useCallback(
    (data) => handleAuthResponse(data),
    [handleAuthResponse]
  );

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  // El usuario actualiza sus propios datos (nombre, NIF, teléfono).
  const updateProfile = useCallback(async (payload) => {
    const { data } = await api.patch('/auth/me', payload);
    setUser((prev) => ({ ...prev, ...data.user }));
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hv_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerOrganization,
        setSession,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
