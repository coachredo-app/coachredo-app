'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const GOLD = '#c9a84c'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push('/resume')
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError('Erreur lors de l\'envoi. Vérifie ton email.')
      return
    }
    setResetSent(true)
  }

  if (resetSent) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}>
        <p className="text-base mb-2" style={{ color: '#e5e7eb' }}>Lien envoyé.</p>
        <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
          Vérifie ta boîte mail — le lien est valable 1 heure.
        </p>
        <button
          onClick={() => { setForgotMode(false); setResetSent(false) }}
          className="text-sm"
          style={{ color: GOLD }}
        >
          ← Retour à la connexion
        </button>
      </div>
    )
  }

  if (forgotMode) {
    return (
      <div className="rounded-xl p-8" style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}>
        <h2 className="text-xl font-semibold mb-2" style={{ color: '#e5e7eb' }}>
          Mot de passe oublié
        </h2>
        <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
          Entre ton email — on t&apos;envoie un lien pour le réinitialiser.
        </p>

        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="ton@email.com"
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
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <p className="text-center text-sm mt-6">
          <button onClick={() => setForgotMode(false)} className="text-sm" style={{ color: '#6b7280' }}>
            ← Retour à la connexion
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-8" style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}>
      <h2 className="text-xl font-semibold mb-6" style={{ color: '#e5e7eb' }}>
        Se connecter
      </h2>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="ton@email.com"
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{ backgroundColor: '#0a0d1a', border: '1px solid #1f2937', color: '#e5e7eb' }}
          />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••"
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{ backgroundColor: '#0a0d1a', border: '1px solid #1f2937', color: '#e5e7eb' }}
          />
          <div className="text-right mt-1">
            <button
              type="button"
              onClick={() => setForgotMode(true)}
              className="text-xs"
              style={{ color: '#4b5563' }}
            >
              Mot de passe oublié ?
            </button>
          </div>
        </div>

        {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: GOLD, color: '#0a0d1a' }}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: '#6b7280' }}>
        Pas encore de compte ?{' '}
        <Link href="/signup" className="font-medium" style={{ color: GOLD }}>
          Créer un compte
        </Link>
      </p>
    </div>
  )
}
