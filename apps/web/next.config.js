/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@kanban/types'],
  output: 'standalone',
};

module.exports = nextConfig;