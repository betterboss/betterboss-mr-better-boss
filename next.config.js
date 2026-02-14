/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'app.jobtread.com' },
      { protocol: 'https', hostname: 'better-boss.ai' },
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
      {
        source: '/api/extension/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-Sync-Token, X-Extension-Version' },
        ],
      },
      {
        source: '/betterboss-docfill-extension.zip',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'application/zip' },
          { key: 'Content-Disposition', value: 'attachment; filename="better-boss-docfill-extension.zip"' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
