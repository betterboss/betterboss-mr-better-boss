export default function FinancesLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-dark-800 rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-dark-900 rounded-lg p-4 h-24 animate-pulse" />
        ))}
      </div>
      <div className="bg-dark-900 rounded-lg p-4 h-64 animate-pulse" />
    </div>
  );
}
