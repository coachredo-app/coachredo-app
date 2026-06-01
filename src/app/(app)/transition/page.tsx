import Link from 'next/link'

const GOLD = '#c9a84c'

export default function TransitionPage() {
  return (
    <main
      className="flex items-center justify-center px-4 sm:px-6 py-16 overflow-x-hidden"
      style={{ backgroundColor: '#0a0d1a', minHeight: '100dvh' }}
    >
      <div className="w-full max-w-sm">

        {/* Label */}
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-10 text-center"
          style={{ color: GOLD }}
        >
          Plan B Rentable
        </p>

        {/* Text */}
        <div className="space-y-5 mb-12">
          <p className="text-base leading-relaxed" style={{ color: '#d1d5db' }}>
            Ce livre s&apos;arrête ici.
          </p>
          <p className="text-base leading-relaxed" style={{ color: '#d1d5db' }}>
            Si ce que tu as lu a fait bouger quelque chose — même légèrement, même sans que tu saches encore quoi — il existe une étape pour continuer.
          </p>
          <p className="text-base leading-relaxed" style={{ color: '#d1d5db' }}>
            Le Bilan de clarté : quelques questions pour continuer ce que tu as commencé à voir sur toi-même.
          </p>
          <p className="text-base leading-relaxed" style={{ color: '#d1d5db' }}>
            Si tu veux aller plus loin dans ce que tu as commencé à construire, c&apos;est la prochaine étape.
          </p>
        </div>

        {/* Signature */}
        <p className="text-sm mb-10" style={{ color: '#6b7280' }}>
          Redouane Agaja · CoachRedo
        </p>

        {/* CTA */}
        <Link
          href="/bilan"
          className="block w-full py-4 rounded-2xl font-bold text-sm sm:text-base tracking-wide text-center transition-all active:scale-95"
          style={{
            backgroundColor: GOLD,
            color: '#0a0d1a',
            boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
          }}
        >
          Accéder au Bilan de clarté →
        </Link>

        {/* Back */}
        <div className="mt-6 text-center">
          <Link
            href="/chapter/7"
            className="text-sm transition-opacity"
            style={{ color: '#4b5563' }}
          >
            ← Relire le chapitre 7
          </Link>
        </div>

      </div>
    </main>
  )
}
