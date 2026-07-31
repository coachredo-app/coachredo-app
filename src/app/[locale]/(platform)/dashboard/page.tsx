import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getReadingProgress, REQUIRED_TOTAL } from '@/lib/reading-chapters'
import { MissionCard } from './MissionCard'

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

  // Toutes les données en parallèle — client utilisateur (RLS appliqué)
  const [
    bookAccessResult,
    readingResult,
    profileResult,
    bilanResult,
    missionResult,
  ] = await Promise.all([
    supabase.from('book_access').select('has_access').eq('user_id', user.id).single(),
    supabase.from('reading_progress').select('chapter_id, chapter_order, completed_at').eq('user_id', user.id),
    supabase.from('profiles').select('bilan_completed_at').eq('id', user.id).single(),
    supabase.from('bilan_responses').select('question_id').eq('user_id', user.id),
    supabase
      .from('user_missions')
      .select('id, mission, coach_note, assigned_at, user_response, responded_at')
      .eq('user_id', user.id)
      .eq('statut', 'en_cours')
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const hasAccess = bookAccessResult.data?.has_access === true
  const reading = getReadingProgress(readingResult.data ?? [])
  const bilanCompleted = !!profileResult.data?.bilan_completed_at
  const bilanAnswered = bilanResult.data?.length ?? 0
  const activeMission = missionResult.data ?? null

  // Statuts parcours
  const livreStatus: ParcourStepStatus =
    reading.fullyDone ? 'done' : reading.startedCount > 0 ? 'partial' : hasAccess ? 'empty' : 'locked'
  const bilanStatus: ParcourStepStatus =
    bilanCompleted ? 'done' : bilanAnswered > 0 ? 'partial' : hasAccess ? 'empty' : 'locked'
  const missionStatus: ParcourStepStatus =
    activeMission?.user_response ? 'done' :
    activeMission ? 'partial' :
    'empty'

  const livreDetail =
    reading.fullyDone ? `${REQUIRED_TOTAL}/${REQUIRED_TOTAL}` :
    reading.startedCount > 0 ? `${reading.completedCount}/${REQUIRED_TOTAL} ch.` :
    undefined

  const bilanDetail =
    bilanCompleted ? `Complété le ${fmt(profileResult.data?.bilan_completed_at)}` :
    bilanAnswered > 0 ? `${bilanAnswered}/13 réponses` :
    undefined

  const missionDetail =
    activeMission?.user_response ? 'Réponse envoyée' :
    activeMission ? 'En cours' :
    undefined

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
        <div className="grid grid-cols-3 gap-3">
          <ParcourStep label="Livre" status={livreStatus} detail={livreDetail} />
          <ParcourStep label="Bilan" status={bilanStatus} detail={bilanDetail} />
          <ParcourStep label="Mission" status={missionStatus} detail={missionDetail} />
        </div>
      </section>

      {/* Mission active */}
      {activeMission && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-3">
            {activeMission.user_response ? 'Ta dernière mission' : 'Ta mission'}
          </h2>
          <MissionCard mission={activeMission} locale={locale} />
        </section>
      )}

      {/* Pas encore de mission */}
      {!activeMission && hasAccess && (
        <section>
          <div className="bg-surface rounded-xl border border-cr-border p-6 text-center space-y-2">
            <p className="text-cr-text font-medium text-sm">Ton coach prépare ta prochaine étape</p>
            <p className="text-cr-text-muted text-xs">
              Tu seras notifié dès qu&apos;une mission est disponible.
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
              href="/resume"
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <span>Continuer le livre</span>
              <span>→</span>
            </Link>

            <Link
              href="/bilan"
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-cr-border bg-surface text-cr-text text-sm font-medium hover:bg-background transition-colors"
            >
              <span>
                Bilan de Clarté
                {bilanCompleted && <span className="ml-2 text-xs text-success font-normal">✓ Complété</span>}
                {!bilanCompleted && bilanAnswered > 0 && (
                  <span className="ml-2 text-xs text-cr-text-muted font-normal">{bilanAnswered}/13</span>
                )}
              </span>
              <span className="text-cr-text-muted">→</span>
            </Link>
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
