import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 bg-grid-pattern">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-boss-500/10 rounded-full blur-[128px]" />
      </div>
      <div className="relative text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700/50 mb-4">
          <span className="text-3xl font-bold text-dark-500">404</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-sm text-dark-400 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="btn-primary inline-flex items-center gap-2 px-4 py-2.5"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
