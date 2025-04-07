import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb', // ✅ augmente la taille limite
      // allowedOrigins: ['http://localhost:3000'], // optionnel pour contrôler les domaines autorisés
    },
  },
}

export default nextConfig
