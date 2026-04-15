// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing config (if any) goes here
  // For example:
  // reactStrictMode: true,
  // images: { domains: ['example.com'] },
  
  // ADD THIS LINE:
  turbopack: {},  // <-- Put this here
}

module.exports = nextConfig