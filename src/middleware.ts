import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    // Protected UI routes
    '/dashboard/:path*',
    '/jobs/:path*',
    '/estimates/:path*',
    '/takeoff/:path*',
    '/leads/:path*',
    '/finances/:path*',
    '/assistant/:path*',
    '/settings/:path*',
    // Protected API routes (require auth session)
    '/api/jobtread/:path*',
    '/api/ai/:path*',
    '/api/ghl/:path*',
    '/api/setup/:path*',
  ],
};
