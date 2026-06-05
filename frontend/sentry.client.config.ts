import * as Sentry from '@sentry/nextjs';

/**
 * Configuração do Sentry para o lado do cliente (browser).
 * Carregado automaticamente pelo @sentry/nextjs via next.config.js.
 *
 * Se NEXT_PUBLIC_SENTRY_DSN não estiver configurado, Sentry fica desabilitado.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',

  // Amostragem de performance
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Oculta automaticamente dados sensíveis nos replays
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Ignora erros 401/403 que são esperados (usuário não autenticado)
  ignoreErrors: [
    'UnauthorizedException',
    'Request failed with status code 401',
    'Request failed with status code 403',
    /^(ChunkLoadError)/,
  ],

  beforeSend(event) {
    // Não envia eventos em desenvolvimento local (sem DSN configurado)
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return null;
    return event;
  },
});
