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
};

// Sentry desabilitado para desenvolvimento local.
// Para produção, re-envolva com withSentryConfig do @sentry/nextjs.
module.exports = nextConfig;
