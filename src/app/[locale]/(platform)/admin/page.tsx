import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// Accueil central CoachRedo — hub sobre, évolutif. Les fonctions
// administratives réelles vivent dans des espaces séparés (/admin/app,
// /admin/music, ...), jamais ici (GO QG — nouvelle architecture admin).
interface AdminHubPageProps {
  params: Promise<{ locale: string }>
}

export default async function AdminHubPage({ params }: AdminHubPageProps) {
  const { locale } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect(`/${locale}/dashboard`)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-cr-text">Administration CoachRedo</h1>
        <p className="text-cr-text-secondary mt-1 text-sm">Choisis un espace</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/${locale}/admin/app`}
          className="bg-surface rounded-xl border border-cr-border p-6 hover:border-cr-accent transition-colors"
        >
          <h2 className="font-semibold text-cr-text text-lg">CoachRedo APP</h2>
          <p className="text-cr-text-secondary text-sm mt-1">
            Utilisateurs, codes d&apos;accès, Bilan, Trading, MFR
          </p>
        </Link>

        <div className="bg-surface rounded-xl border border-cr-border p-6 opacity-60 cursor-not-allowed">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-cr-text text-lg">CoachRedo Music</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cr-accent-subtle text-cr-text-muted border border-cr-border">
              Bientôt disponible
            </span>
          </div>
          <p className="text-cr-text-secondary text-sm mt-1">Espace administré séparément</p>
        </div>
      </div>
    </div>
  )
}
