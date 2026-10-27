// ============================================================
// MFR V1 — Démarrage et terminaison d'une rédaction — T-MFR.5A
// ============================================================
// Même posture que T-MFR.4A/4B : acteur CoachRedo/service_role
// exclusivement, aucun `auth.uid()`, aucun chemin utilisateur final.
// Toutes les fonctions ci-dessous sont appelées avec le même client
// `service_role` (jamais le client authentifié) — EXECUTE des RPC (025
// pour demarrer/finir, 026 pour la reprise) réservé à `service_role`.
// Validation stricte du payload RPC dès la conception (même discipline
// durcie que `retenue.ts`/`curation.ts` après l'audit T-MFR.4A) —
// jamais un payload absent/malformé interprété comme un succès.
//
// Reprise explicite après ÉCHEC (T-MFR.5A, migration 026, exact pendant
// de `relancerAnalyseApresEchec`/019) : `relancerRedactionApresEchec()`
// — même curation officielle inchangée, jamais une nouvelle décision
// humaine pour réparer un échec technique.

import type { createServiceClient } from '@/lib/supabase/server'

type SupabaseServiceClient = ReturnType<typeof createServiceClient>

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type DemarrerRedactionResultat =
  | { readonly ok: true; readonly redactionId: string; readonly created: boolean }
  | { readonly error: string }

export async function demarrerRedaction(
  service: SupabaseServiceClient,
  cycleId: string,
  analyseId: string,
  curationId: string,
  metadata: { readonly provider: string; readonly model: string; readonly promptVersion: string; readonly schemaVersion: string }
): Promise<DemarrerRedactionResultat> {
  if (!UUID_REGEX.test(cycleId) || !UUID_REGEX.test(analyseId) || !UUID_REGEX.test(curationId)) {
    return { error: 'identifiant_invalide' }
  }

  const { data, error } = await service.rpc('mfr_demarrer_redaction', {
    p_cycle_id: cycleId,
    p_analyse_id: analyseId,
    p_curation_id: curationId,
    p_provider: metadata.provider,
    p_model: metadata.model,
    p_prompt_version: metadata.promptVersion,
    p_schema_version: metadata.schemaVersion,
  })

  if (error) return { error: 'Erreur lors du démarrage de la rédaction.' }
  if (typeof data !== 'object' || data === null) return { error: 'reponse_rpc_invalide' }

  const payload = data as Record<string, unknown>
  if (typeof payload.error === 'string' && payload.error.length > 0) return { error: payload.error }

  if (payload.success === true && typeof payload.redaction_id === 'string' && UUID_REGEX.test(payload.redaction_id) && typeof payload.created === 'boolean') {
    return { ok: true, redactionId: payload.redaction_id, created: payload.created }
  }
  return { error: 'reponse_rpc_invalide' }
}

export async function relancerRedactionApresEchec(
  service: SupabaseServiceClient,
  cycleId: string,
  analyseId: string,
  curationId: string,
  metadata: { readonly provider: string; readonly model: string; readonly promptVersion: string; readonly schemaVersion: string }
): Promise<DemarrerRedactionResultat> {
  if (!UUID_REGEX.test(cycleId) || !UUID_REGEX.test(analyseId) || !UUID_REGEX.test(curationId)) {
    return { error: 'identifiant_invalide' }
  }

  const { data, error } = await service.rpc('mfr_relancer_redaction_apres_echec', {
    p_cycle_id: cycleId,
    p_analyse_id: analyseId,
    p_curation_id: curationId,
    p_provider: metadata.provider,
    p_model: metadata.model,
    p_prompt_version: metadata.promptVersion,
    p_schema_version: metadata.schemaVersion,
  })

  if (error) return { error: 'Erreur lors de la reprise de la rédaction.' }
  if (typeof data !== 'object' || data === null) return { error: 'reponse_rpc_invalide' }

  const payload = data as Record<string, unknown>
  if (typeof payload.error === 'string' && payload.error.length > 0) return { error: payload.error }

  if (payload.success === true && typeof payload.redaction_id === 'string' && UUID_REGEX.test(payload.redaction_id) && typeof payload.created === 'boolean') {
    return { ok: true, redactionId: payload.redaction_id, created: payload.created }
  }
  return { error: 'reponse_rpc_invalide' }
}

export type FinirRedactionResultat =
  | { readonly ok: true; readonly alreadyTerminal: boolean }
  | { readonly error: string }

export async function finirRedactionEchec(
  service: SupabaseServiceClient,
  redactionId: string,
  erreur: string,
  outputBrut: unknown
): Promise<FinirRedactionResultat> {
  if (!UUID_REGEX.test(redactionId)) return { error: 'identifiant_invalide' }

  const { data, error } = await service.rpc('mfr_finir_redaction_echec', {
    p_redaction_id: redactionId,
    p_erreur: erreur,
    p_output_brut: outputBrut,
  })

  if (error) return { error: 'Erreur lors de la terminaison en échec de la rédaction.' }
  if (typeof data !== 'object' || data === null) return { error: 'reponse_rpc_invalide' }

  const payload = data as Record<string, unknown>
  if (typeof payload.error === 'string' && payload.error.length > 0) return { error: payload.error }

  if (payload.success === true && typeof payload.already_terminal === 'boolean') {
    return { ok: true, alreadyTerminal: payload.already_terminal }
  }
  return { error: 'reponse_rpc_invalide' }
}

export type FinirRedactionSuccesResultat =
  | { readonly ok: true; readonly alreadyTerminal: boolean; readonly versionId: string | null; readonly numeroVersion: number | null }
  | { readonly error: string }

export async function finirRedactionSucces(
  service: SupabaseServiceClient,
  redactionId: string,
  outputBrut: unknown,
  contenu: unknown
): Promise<FinirRedactionSuccesResultat> {
  if (!UUID_REGEX.test(redactionId)) return { error: 'identifiant_invalide' }

  const { data, error } = await service.rpc('mfr_finir_redaction_succes', {
    p_redaction_id: redactionId,
    p_output_brut: outputBrut,
    p_contenu: contenu,
  })

  if (error) return { error: 'Erreur lors de la terminaison en succès de la rédaction.' }
  if (typeof data !== 'object' || data === null) return { error: 'reponse_rpc_invalide' }

  const payload = data as Record<string, unknown>
  if (typeof payload.error === 'string' && payload.error.length > 0) return { error: payload.error }

  if (payload.success !== true || typeof payload.already_terminal !== 'boolean') {
    return { error: 'reponse_rpc_invalide' }
  }

  if (payload.already_terminal) {
    return { ok: true, alreadyTerminal: true, versionId: null, numeroVersion: null }
  }

  if (typeof payload.version_id === 'string' && UUID_REGEX.test(payload.version_id) && typeof payload.numero_version === 'number') {
    return { ok: true, alreadyTerminal: false, versionId: payload.version_id, numeroVersion: payload.numero_version }
  }
  return { error: 'reponse_rpc_invalide' }
}
