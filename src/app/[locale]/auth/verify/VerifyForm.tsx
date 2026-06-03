'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { MailCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  email: string
  next: string
  locale: string
}

export default function VerifyForm({ email, next, locale }: Props) {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type: 'email',
    })

    setLoading(false)

    if (verifyError) {
      setError('Code invalide ou expiré. Vérifie le code dans ton email.')
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span
            className="font-serif text-3xl text-cr-accent"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            CoachRedo
          </span>
        </div>

        <div className="bg-surface rounded-xl border border-cr-border p-8 shadow-md">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-cr-accent-subtle flex items-center justify-center">
              <MailCheck className="w-7 h-7 text-cr-accent" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-cr-text mb-2 text-center">
            Vérifie ton email
          </h1>

          {email ? (
            <>
              <p className="text-cr-text-secondary text-sm mb-1 text-center">
                Un email a été envoyé à <span className="font-medium text-cr-text">{email}</span>
              </p>
              <p className="text-cr-text-muted text-xs mb-6 text-center">
                Clique sur le lien dans l'email, ou entre le code à 6 chiffres ci-dessous.
              </p>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label
                    htmlFor="token"
                    className="block text-sm font-medium text-cr-text mb-1.5"
                  >
                    Code de vérification
                  </label>
                  <input
                    id="token"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                    className={cn(
                      'w-full px-3.5 py-3 rounded-lg border text-cr-text text-center text-2xl tracking-[0.5em] font-mono',
                      'bg-surface placeholder:text-cr-text-muted',
                      'border-cr-border focus:outline-none focus:border-cr-accent',
                      'transition-colors duration-150'
                    )}
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-error bg-cr-accent-subtle rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || token.length < 6}
                  className={cn(
                    'w-full py-2.5 px-4 rounded-lg font-semibold text-sm',
                    'bg-cr-accent text-cr-text-inverse',
                    'hover:bg-cr-accent-hover transition-colors duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {loading ? 'Vérification...' : 'Se connecter'}
                </button>
              </form>
            </>
          ) : (
            <p className="text-cr-text-secondary text-sm mb-6 text-center">
              Consulte ta boîte mail et clique sur le lien de connexion.
            </p>
          )}

          <div className="mt-6 text-center">
            <Link
              href={`/${locale}/auth/login`}
              className="text-sm text-cr-accent hover:text-cr-accent-hover font-medium transition-colors"
            >
              ← Retour
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
