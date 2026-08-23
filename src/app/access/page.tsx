'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AccessPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/access/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Code invalide.')
      setLoading(false)
      return
    }

    router.push('/fr/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <Link
          href="/fr/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-cr-text-secondary hover:text-cr-text transition-colors mb-6"
        >
          ← Retour à mon espace
        </Link>

        <div className="mb-8">
          <h1
            className="text-2xl font-bold text-cr-text"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            Plan B Rentable
          </h1>
          <p className="text-sm text-cr-text-secondary mt-1">
            Saisis le code reçu après ton achat pour accéder au parcours.
          </p>
        </div>

        <div className="bg-surface rounded-xl border border-cr-border p-8 space-y-4">
          <h2 className="text-lg font-semibold text-cr-text">Activer l&apos;accès</h2>

          <form onSubmit={handleRedeem} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              placeholder="Ex : PLANB-XXXX-XXXX"
              className="w-full rounded-lg border border-cr-border bg-background px-4 py-3 text-sm tracking-widest text-center font-mono text-cr-text placeholder:text-cr-text-muted focus:outline-none focus:ring-1 focus:ring-cr-accent"
            />

            {error && (
              <p className="text-sm text-center text-error">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 4}
              className="w-full rounded-lg py-3 text-sm font-semibold bg-cr-accent text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {loading ? 'Vérification...' : 'Activer mon accès'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
