// ============================================================
// Ma Feuille de Route — page dédiée — T7.7E / T-MFR.5B-3
// ============================================================
// Autonome, fonctionne directement au refresh (T7.7E §4). Vérifie
// elle-même auth/dossier/consommation depuis le serveur — jamais un
// paramètre client pour déterminer si le MPD est finalisé. Aucune
// écriture, aucune consommation, aucun appel à mpd_consommer_dossier :
// cette page affiche un état honnête, elle ne déclenche rien.
//
// T-MFR.5B-3 : le contenu réel d'une MFR publiée est désormais affiché
// (états D/E ci-dessous) — lu exclusivement via la RPC authentifiée
// `mfr_lire_version_publiee` (`auth.uid()` interne, jamais service_role
// dans cette page, jamais une lecture directe de `mfr_versions`/
// `mfr_publications`, RLS fermée sans policy, inchangée). Aucun bouton
// de validation/publication ici — cette page ne fait que lire.
//
// T7.11 : distingue 3 états originaux — MPD incomplet, MPD complet non
// consommé, MPD consommé. « Complet » est dérivé de la MÊME autorité
// que partout ailleurs (getFamilyStates, D-037) — aucune seconde
// définition, aucun flag mémorisé côté client. « Consommé » reste
// déterminé séparément par mpd_etats_logiques. Les états A/B restent
// strictement inchangés ; l'état C (consommé) se subdivise désormais en
// C (aucune publication, texte honnête inchangé), D (publiée, contenu
// réel) et E (erreur de lecture) — jamais un statut inventé.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOuCreerDossierCourant } from '@/lib/mpd/server/dossier'
import { MPD_CANON_V1 } from '@/lib/mpd/canon'
import { getFamilyStates } from '@/lib/mpd/engine/progression'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'
import { obtenirOuCreerCycle } from '@/lib/mfr/server/cycle'
import { lireVersionPublieeMfr } from '@/lib/mfr/server/lecture'
import { ContenuVersionAffichage } from '@/components/mfr/ContenuVersionAffichage'
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

  // Lecture de la publication réelle — uniquement si le MPD est
  // consommé (jamais avant, aucune raison d'avoir un cycle MFR sinon).
  // `obtenirOuCreerCycle` est idempotent (unicité DB sur
  // etat_logique_id, T-MFR.2A) — aucun risque de doublon même appelée à
  // chaque chargement de cette page.
  let lecture: Awaited<ReturnType<typeof lireVersionPublieeMfr>> | null = null
  if (consomme && etatLogique) {
    const resultatCycle = await obtenirOuCreerCycle(supabase, etatLogique.id as string)
    lecture = 'error' in resultatCycle
      ? { statut: 'ERREUR', erreur: resultatCycle.error }
      : await lireVersionPublieeMfr(supabase, resultatCycle.cycleId)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PlanBNavigation locale={locale} actif="mfr" />

      <h1 className="text-2xl font-bold text-cr-text">Ma Feuille de Route</h1>

      {lecture?.statut === 'PUBLIEE' ? (
        // État D — publication réelle disponible : rendu identique à
        // l'admin (ContenuVersionAffichage partagé), jamais une
        // seconde implémentation divergente. Toutes les directions
        // publiées sont affichées, sans tri ni masquage (D-048 §AE).
        <>
          <p className="text-sm text-cr-text-secondary">
            Version n°{lecture.numeroVersion} — publiée le{' '}
            {new Date(lecture.publieLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
          <ContenuVersionAffichage contenu={lecture.contenu} />
        </>
      ) : (
        <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-4">
          {consomme ? (
            lecture?.statut === 'ERREUR' ? (
              // État E — erreur de lecture : jamais un statut inventé,
              // jamais confondu avec « aucune publication encore ».
              <p className="text-sm text-error">{lecture.erreur}</p>
            ) : lecture?.statut === 'ACCES_RESTREINT' ? (
              // État F (GO QG APP 2026-11-05) — MFR fermé par défaut :
              // message d'attente honnête, jamais confondu avec l'état
              // C (aucune publication) ni avec une erreur technique.
              // Le Livre, la Carte de parcours et le MPD restent
              // strictement inchangés — ce message n'apparaît qu'ici.
              <>
                <p className="text-sm text-cr-text-secondary">Ton Point de Départ est finalisé.</p>
                <p className="text-sm text-cr-text-secondary">
                  Ta Feuille de Route est en cours de finalisation avant son ouverture. Reviens consulter cette page un peu plus tard.
                </p>
              </>
            ) : (
              // État C — MPD consommé, aucune publication encore :
              // comportement T7.11 inchangé, aucune fausse MFR.
              <>
                <p className="text-sm text-cr-text-secondary">Ton Point de Départ est finalisé.</p>
                <p className="text-sm text-cr-text-secondary">
                  Tes réponses vont maintenant nous permettre de construire Ta Feuille de Route, adaptée à ta situation.
                </p>
              </>
            )
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
      )}
    </div>
  )
}
