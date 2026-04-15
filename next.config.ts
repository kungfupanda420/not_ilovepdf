import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ["jspdf", "fflate"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Empty turbopack config to acknowledge Turbopack is used (Next.js 16 default)
  turbopack: {},
  // Keep webpack fallbacks for compatibility when webpack is explicitly used
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    return config;
  },
}

export default nextConfig
