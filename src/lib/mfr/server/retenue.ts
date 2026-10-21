// ============================================================
// MFR V1 — SELECT RETAINED — T-MFR.4A
// ============================================================
// Verrouillage humain de l'analyse officielle d'un cycle (D-051 §SELECT
// RETAINED) — jamais une étape automatique, jamais déclenchée par
// l'utilisateur final. L'appelant DOIT déjà détenir un client
// `service_role` obtenu via `requireAdminService()` (ou un mécanisme
// équivalent) : cette fonction ne vérifie ni ne peut vérifier l'identité
// de l'humain CoachRedo agissant — l'autorisation « acteur privilégié »
// est entièrement de la responsabilité de l'appelant, avant d'obtenir ce
// client. Côté DB, la frontière est portée par les grants (`EXECUTE`
// réservé à `service_role` — migration 023), jamais par un `auth.uid()`
// côté RPC.

import type { createServiceClient } from '@/lib/supabase/server'

type SupabaseServiceClient = ReturnType<typeof createServiceClient>

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type RetenirAnalyseResultat =
  | { readonly ok: true; readonly cycleId: string; readonly analyseRetenueId: string }
  | { readonly error: string }

export async function retenirAnalyseSucces(
  serviceClient: SupabaseServiceClient,
  cycleId: string,
  analyseId: string
): Promise<RetenirAnalyseResultat> {
  if (!UUID_REGEX.test(cycleId) || !UUID_REGEX.test(analyseId)) {
    return { error: 'identifiant_invalide' }
  }

  const { data, error } = await serviceClient.rpc('mfr_retenir_analyse', {
    p_cycle_id: cycleId,
    p_analyse_id: analyseId,
  })

  if (error) return { error: 'Erreur lors du verrouillage de l’analyse retenue.' }

  if (typeof data !== 'object' || data === null) {
    return { error: 'reponse_rpc_invalide' }
  }

  const payload = data as Record<string, unknown>

  if (typeof payload.error === 'string' && payload.error.length > 0) {
    return { error: payload.error }
  }

  // Forme de succès attendue validée explicitement — jamais déduite de
  // la seule absence d'un champ `error` (un payload absent, malformé ou
  // incomplet ne doit jamais devenir un faux succès). Aucune
  // coercition/réparation : une forme inattendue est toujours une
  // erreur, jamais une tentative de l'interpréter au mieux.
  if (
    payload.success === true &&
    typeof payload.cycle_id === 'string' &&
    UUID_REGEX.test(payload.cycle_id) &&
    typeof payload.analyse_retenue_id === 'string' &&
    UUID_REGEX.test(payload.analyse_retenue_id)
  ) {
    return {
      ok: true,
      cycleId: payload.cycle_id,
      analyseRetenueId: payload.analyse_retenue_id,
    }
  }

  return { error: 'reponse_rpc_invalide' }
}
