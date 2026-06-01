import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { BookOpen, Lock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardPageProps {
  params: Promise<{ locale: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const t = await getTranslations('dashboard')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/auth/login`)
  }

  // Vérifier l'accès livre via book_access
  const { data: bookAccess } = await supabase
    .from('book_access')
    .select('has_access')
    .eq('user_id', user.id)
    .single()

  const hasAccess = bookAccess?.has_access === true

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-cr-text">{t('title')}</h1>
        <p className="text-cr-text-secondary mt-1">
          {t('subtitle')},{' '}
          <span className="text-cr-text font-medium">{user.email}</span>
        </p>
      </div>

      {/* Mes parcours */}
      <section>
        <h2 className="text-lg font-semibold text-cr-text mb-4">
          {t('myProducts')}
        </h2>

        {/* Carte Plan B Rentable */}
        <div className="bg-surface rounded-xl border border-cr-border shadow-md p-6 max-w-2xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-cr-accent-subtle flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-cr-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-cr-text text-lg">
                {t('planBTitle')}
              </h3>
              <p className="text-cr-text-secondary text-sm mt-0.5">
                {t('planBDesc')}
              </p>

              <div className="mt-4 space-y-2">
                {hasAccess ? (
                  <>
                    {/* Lire le livre */}
                    <Link
                      href="/resume"
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-lg',
                        'bg-cr-accent text-cr-text-inverse',
                        'hover:bg-cr-accent-hover transition-colors',
                        'font-medium text-sm'
                      )}
                    >
                      <span>{t('accessBook')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    {/* Bilan — futur */}
                    <div
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-lg',
                        'border border-cr-border text-cr-text-muted',
                        'cursor-not-allowed',
                        'text-sm'
                      )}
                    >
                      <span>{t('accessBilan')}</span>
                      <Lock className="w-4 h-4" />
                    </div>

                    {/* Programme — futur */}
                    <div
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-lg',
                        'border border-cr-border text-cr-text-muted',
                        'cursor-not-allowed',
                        'text-sm'
                      )}
                    >
                      <span>{t('accessProgramme')}</span>
                      <Lock className="w-4 h-4" />
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg bg-cr-accent-subtle border border-cr-border p-4">
                    <p className="text-cr-text-secondary text-sm mb-3">
                      Accès non activé. Utilise un code d&apos;accès pour
                      déverrouiller ton contenu.
                    </p>
                    <Link
                      href="/access"
                      className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                        'bg-cr-accent text-cr-text-inverse',
                        'hover:bg-cr-accent-hover transition-colors',
                        'font-medium text-sm'
                      )}
                    >
                      Activer un code d&apos;accès
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
