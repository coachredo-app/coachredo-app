'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { MPD_CANON_V1, MPD_CANON_PAR_ID } from '@/lib/mpd/canon'
import { getApplicableQuestions, getNextQuestion } from '@/lib/mpd/engine/applicabilite'
import { validateMpdAnswer } from '@/lib/mpd/engine/validation'
import { getFamilyStates, verifierSequentialite } from '@/lib/mpd/engine/progression'
import { prepareAttestationEcriture } from '@/lib/mpd/server/attestation'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'

export type SoumettreReponseResult = { readonly success: true; readonly revision: number } | { readonly error: string }

/**
 * Séquence exacte (T7.4B §10, étendue T7.6C-B §6) : auth → relecture
 * dossier/ownership → dossier consommé ? (T7.6C-B) → expected_revision
 * → résolution canon → validation → réponses courantes → dérivation des
 * états de famille (T7.6B) → applicabilité actuelle → garde de
 * séquentialité (T7.6C-B : modification rétroactive si réponse active
 * existante, sinon position exacte dans l'ordre canonique) →
 * applicabilité prospective → questions_a_desactiver → attestation
 * privilégiée → RPC mpd_ecrire_reponse sous JWT utilisateur → revalidation
 * du hub et du questionnaire actif (T7.7B : deux routes distinctes).
 * Le client n'envoie jamais la définition de la question — uniquement
 * questionId + statut + payload ; le serveur recharge toujours la
 * définition depuis le canon (jamais confiance au client).
 */
export async function soumettreReponse(
  locale: string,
  dossierId: string,
  expectedRevision: number,
  questionId: string,
  statut: StatutReponse,
  payload: unknown
): Promise<SoumettreReponseResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { data: dossier, error: erreurDossier } = await supabase
    .from('mpd_dossiers')
    .select('id, revision')
    .eq('id', dossierId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (erreurDossier || !dossier) return { error: 'Dossier introuvable.' }

  // T7.6C-B §5 : garde explicite côté Server Action — ne jamais se
  // reposer uniquement sur page.tsx. Un dossier consommé (état logique
  // existant) interdit toute écriture, quelle que soit la question.
  const { data: etatLogique, error: erreurEtatLogique } = await supabase
    .from('mpd_etats_logiques')
    .select('id')
    .eq('dossier_id', dossierId)
    .limit(1)
    .maybeSingle()

  if (erreurEtatLogique) return { error: 'Erreur lors de la vérification de la consommation.' }
  if (etatLogique) return { error: 'dossier_consomme' }

  if (dossier.revision !== expectedRevision) {
    return { error: `revision_conflict:${dossier.revision}` }
  }

  const question = MPD_CANON_PAR_ID.get(questionId)
  if (!question) return { error: 'question_inconnue' }

  const validation = validateMpdAnswer(question, statut, payload)
  if (!validation.ok) return { error: validation.error }

  const { data: reponsesRows, error: erreurReponses } = await supabase
    .from('mpd_reponses_courantes')
    .select('question_id, statut, payload')
    .eq('dossier_id', dossierId)

  if (erreurReponses) return { error: 'Erreur lors de la lecture des réponses.' }

  const reponsesActuelles = new Map<string, ReponseCourante>(
    (reponsesRows ?? []).map(r => [
      r.question_id as string,
      { questionId: r.question_id as string, statut: r.statut as StatutReponse, payload: r.payload },
    ])
  )

  const familyStates = getFamilyStates(MPD_CANON_V1, reponsesActuelles)

  const applicablesActuelles = getApplicableQuestions(MPD_CANON_V1, reponsesActuelles)
  if (!applicablesActuelles.some(q => q.stableId === questionId)) {
    return { error: 'question_non_applicable' }
  }

  // T7.6C-B §1/§2 — garde de séquentialité (D-019, arbitrage G14) :
  // CAS A (modification) si une réponse active existe déjà pour cette
  // question — autorisée tant que sa famille reste modifiable ; CAS B
  // (nouvelle réponse, y compris une conditionnelle réactivée, D-029)
  // — autorisée uniquement si sa famille est atteignable ET que la
  // question est exactement la prochaine question applicable non
  // répondue de l'ordre canonique global.
  const aUneReponseActive = reponsesActuelles.has(questionId)
  const prochaineQuestionLegitimeId = getNextQuestion(MPD_CANON_V1, reponsesActuelles)?.stableId ?? null
  const sequentialite = verifierSequentialite(familyStates, question, aUneReponseActive, prochaineQuestionLegitimeId)
  if (!sequentialite.ok) return { error: sequentialite.error }

  const reponsesProspectives = new Map(reponsesActuelles)
  reponsesProspectives.set(questionId, { questionId, statut, payload })

  const idsApplicablesProspectifs = new Set(
    getApplicableQuestions(MPD_CANON_V1, reponsesProspectives).map(q => q.stableId)
  )

  // Arbitrage QG T7.4B §1 : jamais un diff abstrait ancien/nouvel
  // ensemble applicable — uniquement les réponses ACTIVEMENT présentes en
  // DB qui sortent de l'ensemble applicable prospectif. La question
  // qu'on vient de répondre est toujours exclue (elle vient d'être
  // validée comme applicable et ne doit jamais s'auto-désactiver).
  const questionsADesactiver = [...reponsesActuelles.keys()].filter(
    id => id !== questionId && !idsApplicablesProspectifs.has(id)
  )

  const attestation = await prepareAttestationEcriture({
    userId: user.id,
    dossierId,
    revision: expectedRevision,
    questionId,
    statutAttendu: statut,
    payloadAttendu: payload,
    versionDefinition: String(question.versionCanonique),
    questionsADesactiver,
  })

  if (!attestation.ok) return { error: attestation.error }

  const { data: rpcData, error: erreurRpc } = await supabase.rpc('mpd_ecrire_reponse', {
    p_dossier_id: dossierId,
    p_expected_revision: expectedRevision,
    p_question_id: questionId,
    p_statut: statut,
    p_payload: payload,
  })

  if (erreurRpc) return { error: 'Erreur lors de l’écriture de la réponse.' }
  if (rpcData?.error) {
    if (rpcData.error === 'revision_conflict') {
      return { error: `revision_conflict:${rpcData.revision_actuelle}` }
    }
    return { error: rpcData.error as string }
  }

  // T7.7B : le hub (/plan-b) et le questionnaire actif (/plan-b/parcours)
  // sont désormais deux routes distinctes — les deux doivent refléter
  // l'état serveur courant après une écriture réussie.
  revalidatePath(`/${locale}/plan-b`)
  revalidatePath(`/${locale}/plan-b/parcours`)
  return { success: true, revision: rpcData.revision as number }
}
