/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingIncludes: {
    '/': ['./prisma/**/*', './database/**/*'],
  },
}

module.exports = nextConfig