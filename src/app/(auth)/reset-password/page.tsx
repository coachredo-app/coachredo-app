'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const GOLD = '#c9a84c'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase injecte le token dans le hash — on attend que la session soit établie
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Erreur lors de la mise à jour. Réessaie.')
      setLoading(false)
      return
    }

    router.push('/resume')
  }

  if (!ready) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}>
        <p className="text-sm" style={{ color: '#6b7280' }}>Vérification du lien...</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-8" style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}>
      <h2 className="text-xl font-semibold mb-2" style={{ color: '#e5e7eb' }}>
        Nouveau mot de passe
      </h2>
      <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
        Choisis un nouveau mot de passe pour ton compte.
      </p>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Nouveau mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••"
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{ backgroundColor: '#0a0d1a', border: '1px solid #1f2937', color: '#e5e7eb' }}
          />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Confirmer le mot de passe</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            placeholder="••••••"
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{ backgroundColor: '#0a0d1a', border: '1px solid #1f2937', color: '#e5e7eb' }}
          />
        </div>

        {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: GOLD, color: '#0a0d1a' }}
        >
          {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
        </button>
      </form>
    </div>
  )
}
