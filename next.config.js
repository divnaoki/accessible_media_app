/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pseahbfqdbaoicnltkzd.supabase.co',
      },
    ],
    domains: ['res.cloudinary.com'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;