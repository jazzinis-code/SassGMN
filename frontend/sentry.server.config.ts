import * as Sentry from '@sentry/nextjs';

/**
 * Configuração do Sentry para o lado do servidor Next.js (SSR/RSC).
 * Carregado automaticamente via instrumentation.ts.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Não captura dados de usuário automaticamente
  sendDefaultPii: false,
});
