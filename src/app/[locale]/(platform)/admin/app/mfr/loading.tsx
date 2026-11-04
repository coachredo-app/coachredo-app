export default function AdminMfrLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-64 bg-cr-border rounded" />
      <div className="bg-surface rounded-xl border border-cr-border overflow-hidden">
        <div className="divide-y divide-cr-border">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-12 bg-cr-border/40" />
          ))}
        </div>
      </div>
    </div>
  )
}
