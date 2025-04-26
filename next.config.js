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
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'accessible-media-app.vercel.app', // Vercelのデプロイドメイン
        'accessible-media-app-div-naokis-projects.vercel.app', // プレビュー環境用
        'accessible-media-app-git-main-div-naokis-projects.vercel.app', // デプロイ環境用
      ],
    },
  },
};

module.exports = nextConfig;