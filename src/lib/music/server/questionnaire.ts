// ============================================================
// Music V0 — accès serveur aux RPC du questionnaire (LOT 2, D-058)
// ============================================================
// Seules capacités exposées à la route /api/music/questionnaire : les trois
// RPC du questionnaire, appelées avec l'EMPREINTE du jeton (jamais le jeton
// en clair). Aucun client Supabase générique n'est exporté ; service_role
// n'a aucun privilège direct sur les tables Music (migrations 020, 021).

import { createServiceClient } from '@/lib/supabase/server'
import type { Reponses } from '../questionnaire'
import type { ResultatRpc } from '../questionnaireApi'

async function appeler(nom: string, params: Record<string, unknown>): Promise<ResultatRpc> {
  const { data, error } = await createServiceClient().rpc(nom, params)
  if (error) return { erreur: 'RPC_' + (error.code ?? 'INCONNUE') }
  const r = data as Record<string, unknown> | null
  if (!r || typeof r !== 'object') return { erreur: 'REPONSE_INATTENDUE' }
  if (typeof r.error === 'string') return { erreur: r.error }
  return { data: r }
}

export const chargerQuestionnaire = (empreinte: string) =>
  appeler('music_questionnaire_charger', { p_empreinte: empreinte })

export const enregistrerBrouillon = (empreinte: string, reponses: Reponses) =>
  appeler('music_questionnaire_brouillon', { p_empreinte: empreinte, p_responses: reponses })

export const envoyerQuestionnaire = (empreinte: string, reponses: Reponses, consentVersion: string) =>
  appeler('music_questionnaire_envoyer', { p_empreinte: empreinte, p_responses: reponses, p_consent_version: consentVersion })
