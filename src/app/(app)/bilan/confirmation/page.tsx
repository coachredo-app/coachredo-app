import Link from 'next/link'

const GOLD = '#c9a84c'

export default function BilanConfirmationPage() {
  return (
    <main
      className="flex items-center justify-center px-4 sm:px-6 py-16 overflow-x-hidden"
      style={{ backgroundColor: '#0a0d1a', minHeight: '100dvh' }}
    >
      <div className="w-full max-w-sm text-center">

        <p
          className="text-xs font-semibold uppercase tracking-widest mb-10"
          style={{ color: GOLD }}
        >
          Plan B Rentable
        </p>

        <h1 className="text-xl font-bold mb-6" style={{ color: '#f9fafb' }}>
          Ton Bilan de clarté est validé.
        </h1>

        <div className="space-y-4 mb-10 text-left">
          <p className="text-base leading-relaxed" style={{ color: '#d1d5db' }}>
            Ton Rapport CoachRedo personnalisé sera préparé à partir de tes réponses, puis relu et validé par le coach avant d&apos;être mis à ta disposition dans ton espace CoachRedo.
          </p>
        </div>

        <Link
          href="/fr/dashboard"
          className="inline-block w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-95 text-center"
          style={{
            backgroundColor: GOLD,
            color: '#0a0d1a',
            boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
          }}
        >
          Retourner sur mon espace →
        </Link>

        <div className="mt-6">
          <Link
            href="/intro"
            className="text-sm transition-opacity"
            style={{ color: '#4b5563' }}
          >
            ← Relire le livre depuis le début
          </Link>
        </div>

      </div>
    </main>
  )
}
