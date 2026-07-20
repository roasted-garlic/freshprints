import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fresh-prints/shared', '@fresh-prints/show-picker'],
  allowedDevOrigins: ['*.trycloudflare.com'],
  serverExternalPackages: [
    'firebase',
    'firebase-admin',
    '@firebase/app',
    '@firebase/auth',
    '@firebase/firestore',
    '@firebase/functions',
    '@firebase/storage',
  ],
  devIndicators: false,
}

export default nextConfig
