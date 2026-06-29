/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Apenas para Docker/produção — desabilitado para dev local

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

  experimental: {
    instrumentationHook: false,
  },

  // Aumenta o timeout de carregamento de chunks para suportar
  // compilação lenta no primeiro acesso em dev (Node.js v24)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output.chunkLoadTimeout = 600_000; // 10 minutos
    }
    return config;
  },
};

// Sentry desabilitado para desenvolvimento local.
// Para produção, re-envolva com withSentryConfig do @sentry/nextjs.
module.exports = nextConfig;
