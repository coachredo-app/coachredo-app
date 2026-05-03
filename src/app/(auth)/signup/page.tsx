'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/access')
  }

  return (
    <div className="rounded-xl p-8" style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}>
      <h2 className="text-xl font-semibold mb-6" style={{ color: '#e5e7eb' }}>
        Créer un compte
      </h2>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>
            Prénom
          </label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            placeholder="Ton prénom"
            className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
            style={{
              backgroundColor: '#0a0d1a',
              border: '1px solid #1f2937',
              color: '#e5e7eb',
            }}
          />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="ton@email.com"
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{
              backgroundColor: '#0a0d1a',
              border: '1px solid #1f2937',
              color: '#e5e7eb',
            }}
          />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: '#6b7280' }}>
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Minimum 6 caractères"
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{
              backgroundColor: '#0a0d1a',
              border: '1px solid #1f2937',
              color: '#e5e7eb',
            }}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#c9a84c', color: '#0a0d1a' }}
        >
          {loading ? 'Création...' : 'Créer mon compte'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: '#6b7280' }}>
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium" style={{ color: '#c9a84c' }}>
          Se connecter
        </Link>
      </p>
    </div>
  )
}
