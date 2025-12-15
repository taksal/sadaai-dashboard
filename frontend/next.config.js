/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['recharts'],
  output: 'standalone', // Required for Docker deployment
}

module.exports = nextConfig
