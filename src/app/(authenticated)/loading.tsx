export default function AuthenticatedLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-boss-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-dark-400">Loading...</p>
      </div>
    </div>
  );
}
