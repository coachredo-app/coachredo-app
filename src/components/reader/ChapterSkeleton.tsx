export default function ChapterSkeleton() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#0a0d1a' }}>
      <div className="max-w-xl mx-auto px-4">
        <div className="pt-10 pb-6">
          {/* Back link */}
          <div
            className="h-3 w-14 rounded mb-5 animate-pulse"
            style={{ backgroundColor: '#1f2937' }}
          />
          {/* Chapter label */}
          <div
            className="h-2.5 w-20 rounded mb-3 animate-pulse"
            style={{ backgroundColor: '#1f2937' }}
          />
          {/* Title line 1 */}
          <div
            className="h-7 w-4/5 rounded mb-2 animate-pulse"
            style={{ backgroundColor: '#1f2937' }}
          />
          {/* Title line 2 */}
          <div
            className="h-7 w-3/5 rounded mb-4 animate-pulse"
            style={{ backgroundColor: '#1f2937' }}
          />
          {/* Progress bar */}
          <div className="flex items-center gap-3 mt-3">
            <div
              className="flex-1 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#1f2937' }}
            />
            <div
              className="h-2.5 w-8 rounded animate-pulse"
              style={{ backgroundColor: '#1f2937' }}
            />
          </div>
          <div
            className="h-2.5 w-24 rounded mt-2 animate-pulse"
            style={{ backgroundColor: '#1f2937' }}
          />
        </div>

        {/* Content lines */}
        <div className="space-y-3 mt-2">
          {[1, 0.9, 0.75, 1, 0.6, 0.85, 0.7].map((w, i) => (
            <div
              key={i}
              className="h-4 rounded animate-pulse"
              style={{
                backgroundColor: '#1f2937',
                width: `${w * 100}%`,
                animationDelay: `${i * 60}ms`,
              }}
            />
          ))}
        </div>

        {/* PNL gate skeleton */}
        <div
          className="mt-10 rounded-2xl px-6 py-8 text-center animate-pulse"
          style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
        >
          <div className="h-4 w-3/4 mx-auto rounded mb-2" style={{ backgroundColor: '#1f2937' }} />
          <div className="h-4 w-1/2 mx-auto rounded mb-6" style={{ backgroundColor: '#1f2937' }} />
          <div className="h-10 w-full rounded-xl" style={{ backgroundColor: '#1f2937' }} />
        </div>
      </div>
    </main>
  )
}
