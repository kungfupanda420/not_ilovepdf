import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ["jspdf", "fflate"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turbopack config with resolve aliases for Node.js modules that don't exist in browser
  turbopack: {
    resolveAlias: {
      fs: { browser: './empty-module.js' },
      path: { browser: './empty-module.js' },
      crypto: { browser: './empty-module.js' },
      stream: { browser: './empty-module.js' },
      buffer: { browser: './empty-module.js' },
    },
  },
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
