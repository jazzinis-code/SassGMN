const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera output standalone para Docker (inclui server.js auto-contido)
  output: 'standalone',

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/:path*`,
      },
    ];
  },

  images: {
    domains: ['lh3.googleusercontent.com', 'maps.googleapis.com'],
  },

  // Habilita o instrumentation hook do Next.js (necessário para Sentry)
  experimental: {
    instrumentationHook: true,
  },
};

/**
 * Opções do Sentry para Next.js.
 * withSentryConfig é um no-op se NEXT_PUBLIC_SENTRY_DSN não estiver definido.
 */
const sentryWebpackPluginOptions = {
  // Suprime logs de upload de source maps em dev
  silent: true,

  // Upload de source maps para Sentry (requer SENTRY_AUTH_TOKEN em CI/CD)
  // Desabilitado por padrão — habilitar em pipeline de produção
  dryRun: !process.env.SENTRY_AUTH_TOKEN,

  // Não adiciona overlay de erro do Sentry em desenvolvimento
  disableLogger: true,

  // Tunnel para evitar bloqueio de ad-blockers (opcional)
  // tunnelRoute: '/monitoring',
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
