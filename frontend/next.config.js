/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

module.exports = nextConfig;
