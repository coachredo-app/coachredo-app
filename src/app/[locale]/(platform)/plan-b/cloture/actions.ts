'use server'

// ============================================================
// MPD V3 — Consommation du dossier depuis la clôture — T7.11C
// ============================================================
// Ordre exact validé par le QG : auth → ownership/revision → garde
// consommation (idempotent) → réponses fraîches → complétude →
// comparaison expected_revision → (si incomplet) /parcours → ensemble
// applicable → libellés historiques (déterministe, GO QG T7.11C) →
// attestation CONSOMMATION (service_role) → RPC mpd_consommer_dossier
// (JWT utilisateur) → mapping résultat → revalidation → redirect.
//
// `expectedRevision` n'est jamais une autorité métier : un écart ne
// déclenche jamais de consommation sur la base de l'ancien écran —
// uniquement une redirection vers l'état réel recalculé (/cloture si
// à nouveau complet, /parcours sinon), jamais une poursuite aveugle.
// Le contrat SQL de mpd_consommer_dossier (D-031/D-032, migration 013)
// n'est ni modifié ni affaibli — cette Server Action ne fait que lui
// fournir, via l'attestation, les décisions canoniques déjà prises
// côté TypeScript.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CANON_VERSION, MPD_CANON_PAR_ID, MPD_CANON_V1 } from '@/lib/mpd/canon'
import { getApplicableQuestions, getNextQuestion } from '@/lib/mpd/engine/applicabilite'
import { extraireLibellesChoixHistoriques, prepareAttestationConsommation } from '@/lib/mpd/server/attestation'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'

export interface ResultatCloture {
  readonly error: string
}

const MESSAGE_GENERIQUE = 'Une erreur est survenue. Réessaie.'

export async function preparerMaFeuilleDeRoute(
  locale: string,
  dossierId: string,
  expectedRevision: number
): Promise<ResultatCloture | undefined> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const { data: dossier, error: erreurDossier } = await supabase
    .from('mpd_dossiers')
    .select('id, revision')
    .eq('id', dossierId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (erreurDossier || !dossier) return { error: 'Dossier introuvable.' }

  // Garde consommation (idempotente) — avant toute autre vérification,
  // même logique de priorité que la RPC elle-même.
  const { data: etatLogique, error: erreurEtatLogique } = await supabase
    .from('mpd_etats_logiques')
    .select('id')
    .eq('dossier_id', dossierId)
    .limit(1)
    .maybeSingle()

  if (erreurEtatLogique) return { error: MESSAGE_GENERIQUE }
  if (etatLogique) redirect(`/${locale}/plan-b/feuille-de-route`)

  const { data: reponsesRows } = await supabase
    .from('mpd_reponses_courantes')
    .select('question_id, statut, payload')
    .eq('dossier_id', dossierId)

  const reponses = new Map<string, ReponseCourante>(
    (reponsesRows ?? []).map(r => [
      r.question_id as string,
      { questionId: r.question_id as string, statut: r.statut as StatutReponse, payload: r.payload },
    ])
  )

  const complet = getNextQuestion(MPD_CANON_V1, reponses) === null

  // expected_revision : jamais une autorité — un écart redirige
  // toujours vers l'état réel recalculé, ne consomme jamais sur la
  // base de l'ancien écran (GO QG T7.11B §E, confirmé T7.11C).
  if (dossier.revision !== expectedRevision) {
    redirect(complet ? `/${locale}/plan-b/cloture` : `/${locale}/plan-b/parcours`)
  }

  if (!complet) redirect(`/${locale}/plan-b/parcours`)

  const questionsApplicables = getApplicableQuestions(MPD_CANON_V1, reponses)
    .map(q => q.stableId)
    .sort()

  const resultatLibelles = extraireLibellesChoixHistoriques(MPD_CANON_PAR_ID, reponses, questionsApplicables)
  if (!resultatLibelles.ok) {
    // GO QG T7.11C : échec déterministe propre, jamais un snapshot
    // historique dégradé en silence — anomalie réelle canon/validation,
    // jamais un cas attendu en usage normal.
    return { error: MESSAGE_GENERIQUE }
  }

  const attestation = await prepareAttestationConsommation({
    userId: user.id,
    dossierId,
    revision: dossier.revision,
    versionCanonique: String(CANON_VERSION),
    questionsApplicables,
    libellesHistoriques: resultatLibelles.libelles,
  })

  if (!attestation.ok) {
    if (attestation.error === 'attestation_deja_consommee') redirect(`/${locale}/plan-b/feuille-de-route`)
    return { error: MESSAGE_GENERIQUE }
  }

  const { data: rpcData, error: erreurRpc } = await supabase.rpc('mpd_consommer_dossier', {
    p_dossier_id: dossierId,
  })

  if (erreurRpc) return { error: MESSAGE_GENERIQUE }

  if (rpcData?.error) {
    if (rpcData.error === 'attestation_introuvable') redirect(`/${locale}/plan-b/cloture`)
    if (rpcData.error === 'dossier_incomplet') redirect(`/${locale}/plan-b/parcours`)
    if (rpcData.error === 'Non authentifié') redirect(`/${locale}/auth/login`)
    if (rpcData.error === 'Dossier introuvable') redirect(`/${locale}/plan-b`)
    return { error: MESSAGE_GENERIQUE }
  }

  revalidatePath(`/${locale}/plan-b`)
  revalidatePath(`/${locale}/plan-b/parcours`)
  revalidatePath(`/${locale}/plan-b/feuille-de-route`)
  revalidatePath(`/${locale}/plan-b/cloture`)

  redirect(`/${locale}/plan-b/feuille-de-route`)
}
