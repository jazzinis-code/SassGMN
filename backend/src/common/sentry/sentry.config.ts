import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Inicializa o Sentry para o backend NestJS.
 *
 * Deve ser chamado ANTES de qualquer import de módulo NestJS
 * (chamado em main.ts antes de NestFactory.create).
 *
 * Se SENTRY_DSN não estiver configurado, a inicialização é ignorada
 * e não há impacto no funcionamento da aplicação.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    // Em desenvolvimento sem DSN configurado, Sentry fica desabilitado silenciosamente
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION ?? 'unknown',

    // Profiling de performance — captura traces de CPU
    integrations: [nodeProfilingIntegration()],

    // Amostragem: 100% dos erros, 10% das transações em produção
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Não captura dados sensíveis automaticamente
    sendDefaultPii: false,

    // Ignora erros esperados (autenticação, validação) — reduz ruído
    ignoreErrors: [
      'UnauthorizedException',
      'ForbiddenException',
      'NotFoundException',
      'BadRequestException',
      'ThrottlerException',
    ],
  });
}

/**
 * Captura uma exceção no Sentry com contexto adicional.
 * Wrapper conveniente para uso nos filtros de exceção.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!process.env.SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('request', context);
    }
    Sentry.captureException(error);
  });
}
