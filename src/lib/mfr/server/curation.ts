// ============================================================
// MFR V1 — Curation humaine — T-MFR.4B
// ============================================================
// Sélection humaine (0 à 3 directions parmi les `PRESENTER_MAINTENANT`
// de l'analyse retenue) + confirmation/retrait de la recommandation
// proposée par l'IA/ENGINE — jamais une étape automatique, jamais
// déclenchée par l'utilisateur final. Même frontière d'autorisation que
// T-MFR.4A (`retenue.ts`) : l'appelant DOIT déjà détenir un client
// `service_role` obtenu via `requireAdminService()` (ou un mécanisme
// équivalent) — cette fonction ne vérifie ni ne peut vérifier l'identité
// de l'humain CoachRedo agissant. Côté DB, la frontière est portée par
// les grants (`EXECUTE` réservé à `service_role` sur la RPC ; `INSERT`/
// `UPDATE`/`DELETE` révoqués même à `service_role` directement sur les
// deux tables — seule la RPC, via son propriétaire, peut écrire —
// migration 024), jamais par un `auth.uid()` côté RPC.
//
// Un seul appel = une décision humaine complète (0 à 3 directions +
// confirmation de recommandation), jamais un CRUD incrémental. Validation
// du payload RPC strictement explicite avant tout succès — jamais un
// payload absent/malformé/incomplet interprété comme un succès (même
// discipline durcie que `retenue.ts` après l'audit T-MFR.4A).

import type { createServiceClient } from '@/lib/supabase/server'

type SupabaseServiceClient = ReturnType<typeof createServiceClient>

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type CreerCurationResultat =
  | { readonly ok: true; readonly curationId: string; readonly cycleId: string; readonly analyseId: string }
  | { readonly error: string }

export async function creerCuration(
  serviceClient: SupabaseServiceClient,
  cycleId: string,
  analyseId: string,
  hypotheseIds: readonly string[],
  recommandationConfirmee: boolean
): Promise<CreerCurationResultat> {
  if (!UUID_REGEX.test(cycleId) || !UUID_REGEX.test(analyseId)) {
    return { error: 'identifiant_invalide' }
  }

  if (hypotheseIds.length > 3) {
    return { error: 'trop_de_directions' }
  }

  if (hypotheseIds.some(id => !UUID_REGEX.test(id))) {
    return { error: 'identifiant_invalide' }
  }

  if (new Set(hypotheseIds).size !== hypotheseIds.length) {
    return { error: 'doublon_direction' }
  }

  const { data, error } = await serviceClient.rpc('mfr_creer_curation', {
    p_cycle_id: cycleId,
    p_analyse_id: analyseId,
    p_hypothese_ids: hypotheseIds,
    p_recommandation_confirmee: recommandationConfirmee,
  })

  if (error) return { error: 'Erreur lors de la création de la curation.' }

  if (typeof data !== 'object' || data === null) {
    return { error: 'reponse_rpc_invalide' }
  }

  const payload = data as Record<string, unknown>

  if (typeof payload.error === 'string' && payload.error.length > 0) {
    return { error: payload.error }
  }

  // Forme de succès attendue validée explicitement — jamais déduite de
  // la seule absence d'un champ `error`. Aucune coercition/réparation.
  if (
    payload.success === true &&
    typeof payload.curation_id === 'string' &&
    UUID_REGEX.test(payload.curation_id) &&
    typeof payload.cycle_id === 'string' &&
    UUID_REGEX.test(payload.cycle_id) &&
    typeof payload.analyse_id === 'string' &&
    UUID_REGEX.test(payload.analyse_id)
  ) {
    return {
      ok: true,
      curationId: payload.curation_id,
      cycleId: payload.cycle_id,
      analyseId: payload.analyse_id,
    }
  }

  return { error: 'reponse_rpc_invalide' }
}
