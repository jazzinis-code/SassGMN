'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  const loginWithGoogle = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  const logout = async () => {
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
