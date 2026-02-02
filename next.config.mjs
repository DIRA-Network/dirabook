/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['@node-rs/argon2'],
  async rewrites() {
    return [
      { source: '/skill.md', destination: '/skill' },
      { source: '/heartbeat.md', destination: '/heartbeat' },
    ];
  },
};

export default nextConfig;
