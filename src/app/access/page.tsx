'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

    router.push('/intro')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0d1a' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#c9a84c' }}>Plan B Rentable</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>par Coach Redouane</p>
        </div>

        <div className="rounded-xl p-8" style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#e5e7eb' }}>
            Activer l&apos;accès
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
            Saisis le code reçu après ton achat pour accéder au parcours.
          </p>

          <form onSubmit={handleRedeem} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              placeholder="Ex : PLANB-XXXX-XXXX"
              className="w-full rounded-lg px-4 py-3 text-sm outline-none tracking-widest text-center font-mono"
              style={{
                backgroundColor: '#0a0d1a',
                border: '1px solid #1f2937',
                color: '#e5e7eb',
              }}
            />

            {error && (
              <p className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 4}
              className="w-full rounded-lg py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
              style={{ backgroundColor: '#c9a84c', color: '#0a0d1a' }}
            >
              {loading ? 'Vérification...' : 'Activer mon accès'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
