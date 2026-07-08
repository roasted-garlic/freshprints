import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fresh-prints/shared'],
  allowedDevOrigins: ['*.trycloudflare.com'],
  serverExternalPackages: ['firebase', '@firebase/app', '@firebase/auth', '@firebase/firestore', '@firebase/functions', '@firebase/storage'],
  devIndicators: false,
}

export default nextConfig
