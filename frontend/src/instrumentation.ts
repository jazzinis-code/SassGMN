/**
 * Next.js Instrumentation Hook — carregado automaticamente pelo framework.
 * Inicializa o Sentry para server-side e edge runtime.
 *
 * Ref: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

/**
 * Captura erros não tratados em Server Components e Route Handlers.
 * Usa captureException genérico para máxima compatibilidade de tipos.
 */
export const onRequestError = async (err: unknown) => {
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureException(err);
};
