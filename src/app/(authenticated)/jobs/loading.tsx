export default function JobsLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-dark-800 rounded animate-pulse" />
        <div className="h-10 w-64 bg-dark-800 rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-dark-900 rounded-lg p-4 h-20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
