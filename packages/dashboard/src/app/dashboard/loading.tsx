// Shown by Next.js while a /dashboard/* route segment is loading (e.g. right
// after clicking a sidebar link, before the client bundle + first fetch for
// that page resolve). Without this, navigation showed a blank content area.
export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-5 space-y-2">
        <div className="h-7 w-40 rounded-lg animate-pulse" style={{ background: "var(--surface-1)" }} />
        <div className="h-3 w-24 rounded animate-pulse" style={{ background: "var(--surface-1)" }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl h-40 animate-pulse"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
          />
        ))}
      </div>
    </div>
  );
}
