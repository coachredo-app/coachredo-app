export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { MailCheck } from 'lucide-react'

interface VerifyPageProps {
  params: Promise<{ locale: string }>
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { locale } = await params
  const t = await getTranslations('auth')

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
        <div className="bg-surface rounded-xl border border-cr-border p-8 shadow-md text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-cr-accent-subtle flex items-center justify-center">
              <MailCheck className="w-7 h-7 text-cr-accent" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-cr-text mb-3">
            {t('verifyTitle')}
          </h1>
          <p className="text-cr-text-secondary text-sm mb-2">
            {t('verifyMessage')}
          </p>
          <p className="text-cr-text-muted text-xs mb-6">{t('verifyNote')}</p>

          <Link
            href={`/${locale}/auth/login`}
            className="text-sm text-cr-accent hover:text-cr-accent-hover font-medium transition-colors"
          >
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}
