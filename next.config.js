/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    domains: ['pseahbfqdbaoicnltkzd.supabase.co'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;