import * as Sentry from '@sentry/nextjs';

/**
 * Configuração do Sentry para Edge Runtime (middleware Next.js).
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
