import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getReadingProgress, REQUIRED_TOTAL } from '@/lib/reading-chapters'
import { lireDossierCourant } from '@/lib/mpd/server/dossier'
import { MPD_CANON_V1 } from '@/lib/mpd/canon'
import { getFamilyStates } from '@/lib/mpd/engine/progression'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'

interface DashboardPageProps {
  params: Promise<{ locale: string }>
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

  const [bookAccessResult, readingResult] = await Promise.all([
    supabase.from('book_access').select('has_access').eq('user_id', user.id).single(),
    supabase.from('reading_progress').select('chapter_id, chapter_order, completed_at').eq('user_id', user.id),
  ])

  // GO QG (garde onboarding centrale, correction) : ce contrôle vit
  // désormais exclusivement dans le middleware (src/proxy.ts), seule
  // garde centrale pour tout l'espace plateforme protégé — jamais
  // dupliqué ici, pour éviter toute dérive entre deux implémentations.
  const hasAccess = bookAccessResult.data?.has_access === true
  const reading = getReadingProgress(readingResult.data ?? [])

  // GO QG (T7.13) : activation et complétion du Livre sont deux
  // vérités distinctes — jamais l'une tenue comme preuve indirecte de
  // l'autre. Carte/MPD/MFR ne deviennent disponibles que si les DEUX
  // sont vraies — exactement la même condition que la garde /plan-b/**
  // (src/proxy.ts). Un accès révoqué après un Livre 7/7 historique ne
  // doit jamais afficher ces étapes comme disponibles ici non plus.
  const livreDebloquePourSuite = hasAccess && reading.fullyDone

  // Statuts parcours
  const livreStatus: ParcourStepStatus =
    !hasAccess ? 'locked' : reading.fullyDone ? 'done' : reading.startedCount > 0 ? 'partial' : 'empty'

  const livreDetail =
    reading.fullyDone ? `${REQUIRED_TOTAL}/${REQUIRED_TOTAL}` :
    reading.startedCount > 0 ? `${reading.completedCount}/${REQUIRED_TOTAL} ch.` :
    undefined

  // La Carte n'a jamais d'état « consulté » persisté (aucune donnée
  // carte_consultee) — seulement verrouillée ou disponible.
  const carteStatus: ParcourStepStatus = livreDebloquePourSuite ? 'empty' : 'locked'

  // Projection MPD — lecture strictement read-only (lireDossierCourant,
  // jamais getOuCreerDossierCourant) : la seule consultation de ce
  // tableau de bord ne doit jamais créer de dossier MPD. N'est même
  // interrogée que si le Livre débloque réellement la suite — aucune
  // requête MPD sinon. Réutilise exactement les primitives déjà
  // verrouillées du moteur (getFamilyStates, mpd_etats_logiques),
  // aucun second moteur de progression.
  type EtapeMpd = 'NON_COMMENCE' | 'EN_COURS' | 'COMPLET' | 'CONSOMME'
  let etapeMpd: EtapeMpd = 'NON_COMMENCE'

  if (livreDebloquePourSuite) {
    const dossier = await lireDossierCourant(supabase, user.id)

    if (dossier) {
      const [{ data: reponsesRows }, { data: etatLogique }] = await Promise.all([
        supabase.from('mpd_reponses_courantes').select('question_id, statut, payload').eq('dossier_id', dossier.dossierId),
        supabase.from('mpd_etats_logiques').select('id').eq('dossier_id', dossier.dossierId).limit(1).maybeSingle(),
      ])

      const reponses = new Map<string, ReponseCourante>(
        (reponsesRows ?? []).map(r => [
          r.question_id as string,
          { questionId: r.question_id as string, statut: r.statut as StatutReponse, payload: r.payload },
        ])
      )

      const toutesTerminees = getFamilyStates(MPD_CANON_V1, reponses).every(f => f.statut === 'TERMINEE')
      etapeMpd = etatLogique ? 'CONSOMME' : toutesTerminees ? 'COMPLET' : 'EN_COURS'
    }
  }

  const mpdStatus: ParcourStepStatus =
    !livreDebloquePourSuite ? 'locked' :
    etapeMpd === 'NON_COMMENCE' ? 'empty' :
    etapeMpd === 'EN_COURS' ? 'partial' :
    'done'

  // MFR n'est jamais présentée comme active pour un MPD COMPLET non
  // consommé — seule la consommation réelle (D-041) ouvre cette étape,
  // jamais le seul fait que sa route sache afficher un état A.
  const mfrDisponible = livreDebloquePourSuite && etapeMpd === 'CONSOMME'
  const mfrStatus: ParcourStepStatus = mfrDisponible ? 'empty' : 'locked'

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

      {/* Parcours — Livre → Carte → Mon Point de Départ → Ma Feuille
          de Route (D-045/T7.13). */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-3">
          Mon parcours
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <ParcourStep label="Livre" status={livreStatus} detail={livreDetail} />
          <ParcourStep label="Carte du parcours" status={carteStatus} />
          <ParcourStep label="Mon Point de Départ" status={mpdStatus} />
          <ParcourStep label="Ma Feuille de Route" status={mfrStatus} />
        </div>
      </section>

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

            {livreDebloquePourSuite && (
              <Link
                href="/synthese"
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-cr-border bg-surface text-cr-text text-sm font-medium hover:bg-background transition-colors"
              >
                <span>Carte du parcours</span>
                <span className="text-cr-text-muted">→</span>
              </Link>
            )}

            {livreDebloquePourSuite && (
              <Link
                href={`/${locale}/plan-b`}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-cr-border bg-surface text-cr-text text-sm font-medium hover:bg-background transition-colors"
              >
                <span>Mon Point de Départ</span>
                <span className="text-cr-text-muted">→</span>
              </Link>
            )}

            {mfrDisponible && (
              <Link
                href={`/${locale}/plan-b/feuille-de-route`}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-cr-border bg-surface text-cr-text text-sm font-medium hover:bg-background transition-colors"
              >
                <span>Ma Feuille de Route</span>
                <span className="text-cr-text-muted">→</span>
              </Link>
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
