import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fresh-prints/shared', '@fresh-prints/show-picker'],
  // Named tunnel host + quick tunnels. Does not fix HMR WebSocket over tunnel
  // (see portal-cloudflared-tunnel-setup.md); use localhost:3100 for hot reload.
  allowedDevOrigins: ['*.trycloudflare.com', 'myprintrequest.dev'],
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
