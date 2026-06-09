'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { userService } from '@/services/userService';
import { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  // Começa false se não há token (evita spinner na tela de login)
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('api_token');
  });
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('api_token');

    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await userService.getMe();
      setUser(userData);
    } catch {
      // Token inválido ou expirado
      localStorage.removeItem('api_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const loginWithGoogle = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const logout = () => {
    localStorage.removeItem('api_token');
    // Remove o cookie para que o middleware também desautentique
    document.cookie = 'api_token=; path=/; max-age=0; SameSite=Lax';
    setUser(null);
    router.push('/');
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    loginWithGoogle,
    logout,
    refetchUser: fetchUser,
  };
}
