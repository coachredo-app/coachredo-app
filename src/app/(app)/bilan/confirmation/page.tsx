import Link from 'next/link'

const GOLD = '#c9a84c'

export default function BilanConfirmationPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: '#0a0d1a' }}
    >
      <div className="w-full max-w-sm text-center">

        <p
          className="text-xs font-semibold uppercase tracking-widest mb-10"
          style={{ color: GOLD }}
        >
          Plan B Rentable
        </p>

        <h1 className="text-xl font-bold mb-6" style={{ color: '#f9fafb' }}>
          Tu as terminé le livre.
        </h1>

        <div className="space-y-4 mb-10 text-left">
          <p className="text-base leading-relaxed" style={{ color: '#d1d5db' }}>
            Ce que tu as lu, ce que tu as regardé en toi — ça ne disparaît pas.
          </p>
          <p className="text-base leading-relaxed" style={{ color: '#d1d5db' }}>
            La prochaine étape est le Programme 90 jours. Il arrive bientôt.
          </p>
        </div>

        <Link
          href="/intro"
          className="text-sm transition-opacity"
          style={{ color: '#4b5563' }}
        >
          ← Relire depuis le début
        </Link>

      </div>
    </main>
  )
}
