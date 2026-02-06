/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'app.jobtread.com' },
      { protocol: 'https', hostname: 'better-boss.ai' },
      { protocol: 'https', hostname: 'mybetterboss.ai' },
    ],
  },
};

module.exports = nextConfig;
