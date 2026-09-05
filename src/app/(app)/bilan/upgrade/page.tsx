import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createUpgradeSession } from '../actions'

export default async function BilanUpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/fr/auth/login')

  // Vérifier l'éligibilité côté serveur avant d'afficher la page
  const { data: sessions } = await supabase
    .from('bilan_sessions')
    .select('id, statut, bilan_version, session_type')
    .eq('user_id', user.id)
    .order('session_num', { ascending: false })
    .limit(20)

  // Session upgrade in_progress déjà existante → l'utilisateur reprend en /bilan
  const upgradeActive = sessions?.find(
    s => s.statut === 'in_progress' && s.session_type === 'upgrade'
  ) ?? null
  if (upgradeActive) redirect('/bilan')

  // Éligibilité : au moins une session V1 completed ou superseded
  // (même définition que page.tsx — Cas B refusé, accès manuel bloqué)
  const hasV1History = (sessions ?? []).some(s =>
    (s.statut === 'completed' || s.statut === 'superseded') &&
    s.bilan_version === null &&
    s.session_type === 'standard'
  )
  if (!hasV1History) redirect('/bilan')

  async function startUpgrade() {
    'use server'
    const result = await createUpgradeSession()
    if ('error' in result) redirect('/bilan')
    redirect('/bilan')
  }

  const GOLD = '#c9a84c'

  return (
    <div className="reader-fixed" style={{ backgroundColor: '#0a0d1a' }}>
      <div className="flex-none flex items-center justify-between px-5 pt-5 pb-3">
        <div />
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: GOLD }}
        >
          Bilan de clarté
        </span>
        <div />
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-12"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="w-full max-w-lg mx-auto min-w-0">
          <p
            className="text-xl sm:text-2xl font-semibold leading-snug mb-8"
            style={{ color: '#f3f4f6' }}
          >
            Complète ton Bilan pour préparer ton Rapport
          </p>

          <p className="text-sm leading-relaxed mb-4" style={{ color: '#9ca3af' }}>
            Ton Bilan de clarté a été réalisé avant que le parcours soit complet.
            Pour que ton Rapport CoachRedo puisse être préparé, quelques informations
            complémentaires sont nécessaires.
          </p>

          <p className="text-sm leading-relaxed mb-10" style={{ color: '#9ca3af' }}>
            Toutes tes réponses ont été conservées. Prends le temps de les relire et
            de les ajuster si ta situation a changé avant de valider définitivement
            ton Bilan. Elles constitueront la base de ton Rapport.
          </p>

          <div className="mb-10 space-y-3">
            {[
              'Deux informations rapides sur ta situation',
              'Tes réponses précédentes à relire et, si nécessaire, ajuster',
              'Une information sur ce que tu as déjà tenté',
            ].map(item => (
              <div key={item} className="flex items-start gap-3">
                <span style={{ color: GOLD, flexShrink: 0 }}>—</span>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex-none px-4 sm:px-6 pt-3"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
      >
        <form action={startUpgrade}>
          <button
            type="submit"
            className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all active:scale-95"
            style={{
              backgroundColor: GOLD,
              color: '#0a0d1a',
              boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
            }}
          >
            Compléter mon Bilan →
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/fr/dashboard" className="text-sm" style={{ color: '#6b7280' }}>
            ← Retourner sur mon espace
          </Link>
        </div>
      </div>
    </div>
  )
}
