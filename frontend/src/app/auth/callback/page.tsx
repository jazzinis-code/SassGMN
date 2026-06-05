'use client';

import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Lógica de callback separada para permitir Suspense boundary obrigatório
 * ao usar useSearchParams() no Next.js 14 App Router.
 */
function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      router.replace('/?error=missing_token');
      return;
    }

    // Persiste o JWT do backend para uso nas chamadas da API
    localStorage.setItem('api_token', token);

    router.replace('/dashboard');
  }, [router, searchParams]);

  return null;
}

/**
 * Página de callback do OAuth backend.
 * O NestJS redireciona para /auth/callback?token=<jwt> após o login Google.
 */
export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <Suspense fallback={<Spinner size="lg" />}>
          <CallbackHandler />
        </Suspense>
        <Spinner size="lg" />
        <p className="text-sm text-gray-500">Autenticando, aguarde...</p>
      </div>
    </div>
  );
}
