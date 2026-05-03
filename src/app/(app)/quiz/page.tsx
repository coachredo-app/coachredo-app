import Link from 'next/link'

// Quiz engine — Phase 5
// Access protected server-side by proxy.ts: requires completion_percentage = 100
export default function QuizPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#0a0d1a' }}
    >
      <div className="text-center max-w-sm">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: '#c9a84c' }}
        >
          Plan B Rentable
        </p>
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#f9fafb' }}>
          Quiz de validation
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: '#6b7280' }}>
          Tu as complété les 10 chapitres.
          <br />
          Le quiz arrive en Phase 5.
        </p>
        <Link
          href="/chapter/10"
          className="text-sm underline"
          style={{ color: '#c9a84c' }}
        >
          ← Retour au chapitre 10
        </Link>
      </div>
    </main>
  )
}
