// ============================================================
// Mini-onboarding profil — pays de résidence
// ============================================================
// GO QG : Auth OTP → vérification → mini-onboarding profil →
// dashboard. Revérifie elle-même auth + état du profil (jamais une
// confiance héritée de la redirection qui amène ici) — un utilisateur
// dont le pays est déjà enregistré est renvoyé directement vers le
// dashboard, sans jamais recréer de boucle.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from './OnboardingForm'

interface OnboardingPageProps {
  params: Promise<{ locale: string }>
}

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const { data: profil } = await supabase.from('profiles').select('country').eq('id', user.id).maybeSingle()
  if (profil?.country) redirect(`/${locale}/dashboard`)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="font-serif text-3xl text-cr-accent" style={{ fontFamily: 'var(--font-dm-serif)' }}>
            CoachRedo
          </span>
        </div>

        <div className="bg-surface rounded-xl border border-cr-border p-8 shadow-md space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-cr-text">Dans quel pays résides-tu ?</h1>
            <p className="text-cr-text-secondary text-sm mt-1">
              Cette information nous permet de mieux adapter certaines parties de ton expérience CoachRedo.
            </p>
          </div>
          <OnboardingForm locale={locale} />
        </div>
      </div>
    </div>
  )
}
