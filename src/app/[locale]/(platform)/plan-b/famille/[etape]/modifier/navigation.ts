'use server'

// ============================================================
// MPD V3 — État frais après sauvegarde ciblée — T7.8E
// ============================================================
// Remplace obtenirQuestionFamilleRelative (T7.8B, direction avant/
// apres) — devenue inutile : Retour redirige désormais toujours et
// uniquement vers /plan-b/famille/[etape] (GO QG T7.8E §11), sans
// navigation séquentielle arrière au sein de la famille. Reste une
// Server Action strictement en LECTURE, appelée uniquement après une
// sauvegarde réussie, pour déterminer — depuis l'état serveur frais,
// jamais une autorité côté client — si une intervention supplémentaire
// est réellement nécessaire (GO QG T7.8E §9/§10). Aucune duplication
// du moteur : réutilise exclusivement getFamilyStates et
// getApplicableQuestions déjà exportés.

import { createClient } from '@/lib/supabase/server'
import { MPD_CANON_V1, type Etape, type QuestionCanonique } from '@/lib/mpd/canon'
import { getApplicableQuestions } from '@/lib/mpd/engine/applicabilite'
import { getFamilyStates } from '@/lib/mpd/engine/progression'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'

export type ResultatApresSauvegarde =
  | { readonly ok: true; readonly termine: true }
  | {
      readonly ok: true
      readonly termine: false
      readonly question: QuestionCanonique
      readonly reponseExistante: ReponseCourante | null
    }
  | { readonly ok: false; readonly error: string }

/**
 * Appelée après chaque sauvegarde réussie en modification ciblée.
 * Si la famille est de nouveau/encore TERMINEE : plus rien à faire —
 * le client redirige vers la page famille. Sinon : la PREMIÈRE
 * question actuellement applicable de CETTE famille sans réponse
 * active, dans l'ordre canonique actuel — jamais "la question suivant
 * celle qui vient d'être modifiée" (GO QG T7.8E §9.B). Couvre
 * correctement une nouvelle conditionnelle révélée, quelle que soit
 * sa position canonique dans la famille.
 */
export async function obtenirEtatApresSauvegarde(
  dossierId: string,
  etape: Etape
): Promise<ResultatApresSauvegarde> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié.' }

  const { data: dossier } = await supabase
    .from('mpd_dossiers')
    .select('id')
    .eq('id', dossierId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!dossier) return { ok: false, error: 'Dossier introuvable.' }

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

  const etatFamille = getFamilyStates(MPD_CANON_V1, reponses).find(f => f.etape === etape)
  if (!etatFamille) return { ok: false, error: 'famille_introuvable' }

  if (etatFamille.statut === 'TERMINEE') return { ok: true, termine: true }

  const prochaine = getApplicableQuestions(MPD_CANON_V1, reponses)
    .filter(q => q.etape === etape)
    .find(q => !reponses.has(q.stableId))

  // Garde-fou défensif : statut !== TERMINEE implique par construction
  // au moins une question applicable sans réponse active dans cette
  // famille (sinon elle serait TERMINEE par définition) — ne devrait
  // jamais se produire.
  if (!prochaine) return { ok: true, termine: true }

  return {
    ok: true,
    termine: false,
    question: prochaine,
    reponseExistante: reponses.get(prochaine.stableId) ?? null,
  }
}
