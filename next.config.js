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
  async headers() {
    return [
      {
        source: '/betterboss-docfill.user.js',
        headers: [
          { key: 'Content-Type', value: 'text/javascript; charset=utf-8' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/betterboss-docfill-loader.js',
        headers: [
          { key: 'Content-Type', value: 'text/javascript; charset=utf-8' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
