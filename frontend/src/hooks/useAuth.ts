'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
}

/**
 * Hook de autenticação.
 *
 * Fluxo:
 *  1. loginWithGoogle() redireciona para o backend OAuth (/auth/google)
 *  2. Backend processa OAuth → emite JWT → redireciona para /auth/callback?token=JWT
 *  3. /auth/callback salva JWT no localStorage + cookie
 *  4. Este hook valida o token com /auth/me a cada montagem
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('api_token')
      : null;

    if (!token) {
      setIsLoading(false);
      return;
    }

    // Valida token com o backend — confirma que ainda é válido
    api
      .get('/auth/me')
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setUser({ id: data.id, name: data.name, email: data.email });
        setIsAuthenticated(true);
      })
      .catch(() => {
        // Token inválido ou expirado — limpa tudo
        localStorage.removeItem('api_token');
        document.cookie = 'api_token=; path=/; max-age=0; SameSite=Lax';
        setIsAuthenticated(false);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loginWithGoogle = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    window.location.href = `${backendUrl}/auth/google`;
  };

  const logout = () => {
    localStorage.removeItem('api_token');
    document.cookie = 'api_token=; path=/; max-age=0; SameSite=Lax';
    setIsAuthenticated(false);
    setUser(null);
    router.push('/');
  };

  // session compatível com o shape que os componentes esperam
  const session = user ? { user } : null;

  return {
    session,
    user,
    isAuthenticated,
    isLoading,
    loginWithGoogle,
    logout,
  };
}
