import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getReadingProgress, REQUIRED_TOTAL } from '@/lib/reading-chapters'
import { REQUIRED_QUESTION_IDS } from '@/lib/bilan-questions'

interface DashboardPageProps {
  params: Promise<{ locale: string }>
}

function fmt(d: string | null | undefined) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

type ParcourStepStatus = 'done' | 'partial' | 'empty' | 'locked'

function ParcourStep({
  label,
  detail,
  status,
}: {
  label: string
  detail?: string
  status: ParcourStepStatus
}) {
  const styles: Record<ParcourStepStatus, string> = {
    done:    'bg-green-50 border-green-200 text-green-700',
    partial: 'bg-amber-50  border-amber-200  text-amber-700',
    empty:   'bg-background border-cr-border text-cr-text-muted',
    locked:  'bg-background border-cr-border text-cr-text-muted opacity-40',
  }
  const icons: Record<ParcourStepStatus, string> = {
    done: '✓', partial: '◐', empty: '○', locked: '—',
  }

  return (
    <div className={`rounded-lg border p-3 text-center ${styles[status]}`}>
      <p className="text-xs font-medium mb-1">{label}</p>
      <p className="text-xs tabular-nums">{detail ?? icons[status]}</p>
    </div>
  )
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const [
    bookAccessResult,
    readingResult,
    profileResult,
    legacyV1Result,
    completedV2Result,
    activeSessionResult,
  ] = await Promise.all([
    supabase.from('book_access').select('has_access').eq('user_id', user.id).single(),
    supabase.from('reading_progress').select('chapter_id, chapter_order, completed_at').eq('user_id', user.id),
    supabase.from('profiles').select('bilan_completed_at').eq('id', user.id).single(),
    // Existence d'un Bilan V1 completed — détermine l'éligibilité legacy upgrade
    supabase
      .from('bilan_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('statut', 'completed')
      .is('bilan_version', null)
      .eq('session_type', 'standard')
      .limit(1)
      .maybeSingle(),
    // Session V2 completed la plus récente — pour bilanCompleted et date d'affichage
    supabase
      .from('bilan_sessions')
      .select('id, completed_at')
      .eq('user_id', user.id)
      .eq('statut', 'completed')
      .eq('bilan_version', 2)
      .order('session_num', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Session in_progress active — pour compteur de réponses
    supabase
      .from('bilan_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('statut', 'in_progress')
      .order('session_num', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const hasAccess = bookAccessResult.data?.has_access === true
  const reading = getReadingProgress(readingResult.data ?? [])

  // Règle métier Bilan
  const hasV1History = legacyV1Result.data !== null
  const hasCompletedV2 = completedV2Result.data !== null
  const needsUpgrade = hasV1History && !hasCompletedV2
  const bilanCompleted = hasCompletedV2

  const completedV2Session = completedV2Result.data ?? null
  const activeSession = activeSessionResult.data ?? null

  // Compteur de réponses — uniquement hors état upgrade requis
  let bilanAnswered = 0
  if (activeSession && !needsUpgrade) {
    const { data: countData } = await supabase
      .from('bilan_responses')
      .select('question_id')
      .eq('session_id', activeSession.id)
      .in('question_id', [...REQUIRED_QUESTION_IDS])
    bilanAnswered = countData?.length ?? 0
  }

  // Statuts parcours
  const livreStatus: ParcourStepStatus =
    reading.fullyDone ? 'done' : reading.startedCount > 0 ? 'partial' : hasAccess ? 'empty' : 'locked'
  const bilanStatus: ParcourStepStatus =
    !reading.fullyDone ? 'locked' :
    bilanCompleted ? 'done' :
    needsUpgrade ? 'partial' :
    bilanAnswered > 0 ? 'partial' :
    'empty'

  const livreDetail =
    reading.fullyDone ? `${REQUIRED_TOTAL}/${REQUIRED_TOTAL}` :
    reading.startedCount > 0 ? `${reading.completedCount}/${REQUIRED_TOTAL} ch.` :
    undefined

  const bilanDetail =
    bilanCompleted ? `Complété le ${fmt(completedV2Session?.completed_at ?? profileResult.data?.bilan_completed_at)}` :
    needsUpgrade ? 'À compléter pour ton Rapport' :
    bilanAnswered > 0 ? `${bilanAnswered}/13 réponses` :
    undefined

  // CTA Livre selon l'état de lecture
  const livreCta = reading.fullyDone
    ? { label: 'Relire le livre', href: '/intro' }
    : reading.startedCount > 0
    ? { label: 'Continuer le livre', href: '/resume' }
    : { label: 'Commencer le livre', href: '/intro' }

  return (
    <div className="space-y-8 max-w-2xl">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-cr-text">Mon espace</h1>
        <p className="text-cr-text-secondary mt-1 text-sm">{user.email}</p>
      </div>

      {/* Parcours */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-3">
          Mon parcours
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <ParcourStep label="Livre" status={livreStatus} detail={livreDetail} />
          <ParcourStep label="Bilan" status={bilanStatus} detail={bilanDetail} />
        </div>
      </section>

      {/* Bilan legacy — mise à niveau requise */}
      {needsUpgrade && reading.fullyDone && (
        <section>
          <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-4">
            <p className="text-cr-text font-medium text-sm">
              Complète ton Bilan pour préparer ton Rapport CoachRedo.
            </p>
            <p className="text-cr-text-secondary text-sm">
              Ton Bilan précédent est conservé. Quelques informations complémentaires
              sont nécessaires pour que ton Rapport personnalisé puisse être préparé.
            </p>
            <Link
              href="/bilan"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Compléter mon Bilan →
            </Link>
          </div>
        </section>
      )}

      {/* Bilan V2 validé — Rapport en préparation */}
      {bilanCompleted && hasAccess && (
        <section>
          <div className="bg-surface rounded-xl border border-cr-border p-6">
            <p className="text-cr-text font-medium text-sm">
              Ton Bilan de clarté est validé. Ton Rapport CoachRedo personnalisé est en cours de préparation.
            </p>
          </div>
        </section>
      )}

      {/* Accès au contenu */}
      {hasAccess && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-3">
            Mon programme
          </h2>
          <div className="space-y-2">
            <Link
              href={livreCta.href}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <span>{livreCta.label}</span>
              <span>→</span>
            </Link>

            {reading.fullyDone && (
              <Link
                href="/synthese"
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-cr-border bg-surface text-cr-text text-sm font-medium hover:bg-background transition-colors"
              >
                <span>Carte du parcours</span>
                <span className="text-cr-text-muted">→</span>
              </Link>
            )}

            {reading.fullyDone ? (
              <Link
                href="/bilan"
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-cr-border bg-surface text-cr-text text-sm font-medium hover:bg-background transition-colors"
              >
                <span>
                  Bilan de Clarté
                  {bilanCompleted && <span className="ml-2 text-xs text-success font-normal">✓ Complété</span>}
                  {needsUpgrade && <span className="ml-2 text-xs text-amber-600 font-normal">À mettre à jour</span>}
                  {!bilanCompleted && !needsUpgrade && bilanAnswered > 0 && (
                    <span className="ml-2 text-xs text-cr-text-muted font-normal">{bilanAnswered}/13</span>
                  )}
                </span>
                <span className="text-cr-text-muted">→</span>
              </Link>
            ) : (
              <div className="flex items-start justify-between px-4 py-3 rounded-lg border border-cr-border bg-background cursor-default">
                <span className="text-sm font-medium text-cr-text-muted">
                  🔒 Bilan de Clarté
                  <span className="block text-xs font-normal mt-0.5">
                    Disponible après avoir terminé le livre
                  </span>
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Pas d'accès */}
      {!hasAccess && (
        <section>
          <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-4">
            <p className="text-cr-text-secondary text-sm">
              Ton accès n&apos;est pas encore activé. Entre ton code pour déverrouiller le programme.
            </p>
            <Link
              href="/access"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Activer mon accès →
            </Link>
          </div>
        </section>
      )}

    </div>
  )
}
