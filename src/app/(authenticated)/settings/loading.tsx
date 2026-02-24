export default function SettingsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-dark-800 rounded animate-pulse" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-dark-900 rounded-lg p-6 h-32 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
