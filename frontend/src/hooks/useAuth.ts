'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasApiToken, setHasApiToken] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('api_token');
      setHasApiToken(!!token);
    }
  }, []);

  const isAuthenticated = status === 'authenticated' || hasApiToken;
  const isLoading = status === 'loading';

  const loginWithGoogle = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/google`;
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('api_token');
    }
    await signOut({ redirect: false });
    router.push('/');
  };

  return {
    session,
    user: session?.user,
    isAuthenticated,
    isLoading,
    loginWithGoogle,
    logout,
  };
}
