// ============================================================
// Ma Feuille de Route — page dédiée — T7.7E
// ============================================================
// Autonome, fonctionne directement au refresh (T7.7E §4). Vérifie
// elle-même auth/dossier/consommation depuis le serveur — jamais un
// paramètre client pour déterminer si le MPD est finalisé. Aucune
// écriture, aucune consommation, aucun appel à mpd_consommer_dossier :
// cette page affiche un état honnête, elle ne déclenche rien.
//
// Aucun statut « En préparation »/« Prête » n'existe techniquement à ce
// jour (aucun mécanisme réel de génération MFR) — ne pas les inventer.
//
// T7.11 (dernière correction) : distingue 3 états — MPD incomplet,
// MPD complet non consommé, MPD consommé. « Complet » est dérivé de
// la MÊME autorité que partout ailleurs (getFamilyStates, D-037) —
// aucune seconde définition, aucun flag mémorisé côté client.
// « Consommé » reste déterminé séparément par mpd_etats_logiques.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOuCreerDossierCourant } from '@/lib/mpd/server/dossier'
import { MPD_CANON_V1 } from '@/lib/mpd/canon'
import { getFamilyStates } from '@/lib/mpd/engine/progression'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'
import { PlanBNavigation } from '../PlanBNavigation'

interface FeuilleDeRoutePageProps {
  params: Promise<{ locale: string }>
}

export default async function FeuilleDeRoutePage({ params }: FeuilleDeRoutePageProps) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const dossier = await getOuCreerDossierCourant(supabase, user.id)

  if ('error' in dossier) {
    return (
      <div className="max-w-4xl space-y-6">
        <PlanBNavigation locale={locale} actif="mfr" />
        <p className="text-sm text-red-600">{dossier.error}</p>
      </div>
    )
  }

  const { data: etatLogique } = await supabase
    .from('mpd_etats_logiques')
    .select('id')
    .eq('dossier_id', dossier.dossierId)
    .limit(1)
    .maybeSingle()

  const consomme = Boolean(etatLogique)

  const { data: reponsesRows } = await supabase
    .from('mpd_reponses_courantes')
    .select('question_id, statut, payload')
    .eq('dossier_id', dossier.dossierId)

  const reponses = new Map<string, ReponseCourante>(
    (reponsesRows ?? []).map(r => [
      r.question_id as string,
      { questionId: r.question_id as string, statut: r.statut as StatutReponse, payload: r.payload },
    ])
  )

  const mpdComplet = getFamilyStates(MPD_CANON_V1, reponses).every(f => f.statut === 'TERMINEE')

  return (
    <div className="max-w-4xl space-y-6">
      <PlanBNavigation locale={locale} actif="mfr" />

      <h1 className="text-2xl font-bold text-cr-text">Ma Feuille de Route</h1>

      <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-4">
        {consomme ? (
          // État C — MPD consommé : comportement T7.11 inchangé, aucune
          // fausse MFR, aucun statut inventé.
          <>
            <p className="text-sm text-cr-text-secondary">Ton Point de Départ est finalisé.</p>
            <p className="text-sm text-cr-text-secondary">
              Tes réponses vont maintenant nous permettre de construire Ta Feuille de Route, adaptée à ta situation.
            </p>
          </>
        ) : mpdComplet ? (
          // État B — MPD complet, non consommé : ce CTA n'est qu'un
          // lien vers /cloture, il ne consomme rien — la consommation
          // reste exclusivement déclenchée depuis cette page par
          // « Préparer ma Feuille de Route ».
          <>
            <p className="text-sm text-cr-text-secondary">Ton Point de Départ est terminé.</p>
            <p className="text-sm text-cr-text-secondary">
              Finalise cette étape pour pouvoir préparer Ta Feuille de Route.
            </p>
            <Link
              href={`/${locale}/plan-b/cloture`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Finaliser Mon Point de Départ →
            </Link>
          </>
        ) : (
          // État A — MPD incomplet : comportement strictement inchangé.
          <>
            <p className="text-sm text-cr-text-secondary">
              Ta Feuille de Route sera préparée après la finalisation de ton Point de Départ.
            </p>
            <p className="text-sm text-cr-text-secondary">
              Tu peux continuer ton Point de Départ dès maintenant.
            </p>
            <Link
              href={`/${locale}/plan-b`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Continuer Mon Point de Départ →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
