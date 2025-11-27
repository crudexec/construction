/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./prisma/**/*'],
    },
  },
}

module.exports = nextConfig