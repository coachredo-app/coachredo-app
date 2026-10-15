// ============================================================
// MFR V1 — Lancement et terminaison d'une tentative d'analyse — T-MFR.3A
// ============================================================
// Séparation stricte des clients, jamais interchangée :
//   - demarrerPremiereAnalyse() : client authentifié (JWT utilisateur,
//     auth.uid() interne à la RPC) — c'est le seul lancement que
//     l'utilisateur ordinaire déclenche (D-051 §B).
//   - finirAnalyseEchec() / finirAnalyseSucces() : service_role
//     exclusivement (createServiceClient()) — ces deux capacités ne
//     sont jamais accordées à authenticated/anon (EXECUTE révoqué,
//     migration 017), donc jamais atteignables depuis le navigateur.
//     auth.uid() n'y joue aucun rôle d'autorisation — la défense en
//     profondeur contre une erreur de l'orchestrateur serveur vit dans
//     la RPC elle-même (verrou + ré-vérifications), pas ici.
//
// Régénération / nouvelle tentative privilégiée après ÉCHEC,
// SELECT RETAINED : explicitement hors périmètre T-MFR.3A, non
// implémentés dans ce module.

import type { createClient, createServiceClient } from '@/lib/supabase/server'
import type { AnalyseGrapheResolu, AnalyseMetadata } from './types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
type SupabaseServiceClient = ReturnType<typeof createServiceClient>

export type DemarrerPremiereAnalyseResultat =
  | { readonly analyseId: string; readonly created: boolean }
  | {
      readonly error:
        | 'cycle_introuvable'
        | 'cycle_publie'
        | 'premiere_analyse_deja_tentee'
        | 'Non authentifié'
        | 'erreur'
    }

export async function demarrerPremiereAnalyse(
  supabase: SupabaseServerClient,
  cycleId: string,
  metadata: AnalyseMetadata
): Promise<DemarrerPremiereAnalyseResultat> {
  const { data, error } = await supabase.rpc('mfr_demarrer_premiere_analyse', {
    p_cycle_id: cycleId,
    p_provider: metadata.provider,
    p_model: metadata.model,
    p_prompt_version: metadata.promptVersion,
    p_schema_version: metadata.schemaVersion,
    p_catalogue_version: metadata.catalogueVersion,
  })

  if (error) return { error: 'erreur' }
  if (!data) return { error: 'erreur' }
  if (data?.error) {
    return {
      error: data.error as 'cycle_introuvable' | 'cycle_publie' | 'premiere_analyse_deja_tentee' | 'Non authentifié',
    }
  }

  return { analyseId: data.analyse_id as string, created: Boolean(data.created) }
}

export type FinirAnalyseEchecResultat =
  | { readonly ok: true; readonly alreadyTerminal: boolean }
  | { readonly error: 'analyse_introuvable' | 'erreur' }

export async function finirAnalyseEchec(
  service: SupabaseServiceClient,
  analyseId: string,
  erreur: string
): Promise<FinirAnalyseEchecResultat> {
  const { data, error } = await service.rpc('mfr_finir_analyse_echec', {
    p_analyse_id: analyseId,
    p_erreur: erreur,
  })

  if (error) return { error: 'erreur' }
  if (!data) return { error: 'erreur' }
  if (data?.error) return { error: data.error as 'analyse_introuvable' }

  return { ok: true, alreadyTerminal: Boolean(data.already_terminal) }
}

export type FinirAnalyseSuccesResultat =
  | { readonly ok: true; readonly alreadyTerminal: boolean }
  | { readonly error: 'analyse_introuvable' | 'cycle_publie' | 'erreur' }

export async function finirAnalyseSucces(
  service: SupabaseServiceClient,
  analyseId: string,
  outputBrut: unknown,
  graphe: AnalyseGrapheResolu
): Promise<FinirAnalyseSuccesResultat> {
  const { data, error } = await service.rpc('mfr_finir_analyse_succes', {
    p_analyse_id: analyseId,
    p_output_brut: outputBrut,
    p_graphe: graphe,
  })

  if (error) return { error: 'erreur' }
  if (!data) return { error: 'erreur' }
  if (data?.error) return { error: data.error as 'analyse_introuvable' | 'cycle_publie' }

  return { ok: true, alreadyTerminal: Boolean(data.already_terminal) }
}
