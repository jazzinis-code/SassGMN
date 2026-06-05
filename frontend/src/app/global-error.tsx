'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Handler global de erros de renderização React (App Router).
 * Reporta ao Sentry e exibe mensagem amigável ao usuário.
 *
 * Ref: https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-4 max-w-md px-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Algo deu errado
            </h1>
            <p className="text-gray-500">
              Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
