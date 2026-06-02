'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) ?? 'fr'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const appUrl = window.location.origin
    const next = new URLSearchParams(window.location.search).get('next') ?? `/${locale}/dashboard`
    const emailRedirectTo = `${appUrl}/${locale}/auth/callback?next=${encodeURIComponent(next)}`

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    router.push(`/${locale}/auth/verify`)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="font-serif text-3xl text-cr-accent"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            CoachRedo
          </span>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-xl border border-cr-border p-8 shadow-md">
          <h1 className="text-2xl font-bold text-cr-text mb-2">
            {t('loginTitle')}
          </h1>
          <p className="text-cr-text-secondary text-sm mb-6">
            {t('loginSubtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-cr-text mb-1.5"
              >
                {t('emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-lg border text-cr-text',
                  'bg-surface placeholder:text-cr-text-muted text-sm',
                  'border-cr-border focus:outline-none focus:border-cr-accent',
                  'transition-colors duration-150'
                )}
              />
            </div>

            {error && (
              <p className="text-sm text-error bg-cr-accent-subtle rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className={cn(
                'w-full py-2.5 px-4 rounded-lg font-semibold text-sm',
                'bg-cr-accent text-cr-text-inverse',
                'hover:bg-cr-accent-hover transition-colors duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading ? t('loading') : t('submitButton')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
