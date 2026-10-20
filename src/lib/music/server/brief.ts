// ============================================================
// Music V0 — accès serveur aux RPC client du brief (LOT 3, D-058)
// ============================================================
// Seules capacités exposées à la route /api/music/resume : lire, demander
// une correction, valider — toujours avec l'EMPREINTE du jeton. Les RPC
// d'administration (music_admin_*) ne sont appelées que par la commande
// locale scripts/music-v0/admin.mjs, jamais par une route.

import { createServiceClient } from '@/lib/supabase/server'
import type { ResultatRpc } from '../questionnaireApi'

async function appeler(nom: string, params: Record<string, unknown>): Promise<ResultatRpc> {
  const { data, error } = await createServiceClient().rpc(nom, params)
  if (error) return { erreur: 'RPC_' + (error.code ?? 'INCONNUE') }
  const r = data as Record<string, unknown> | null
  if (!r || typeof r !== 'object') return { erreur: 'REPONSE_INATTENDUE' }
  if (typeof r.error === 'string') return { erreur: r.error }
  return { data: r }
}

export const chargerBrief = (empreinte: string) =>
  appeler('music_brief_charger', { p_empreinte: empreinte })

export const corrigerBrief = (empreinte: string, version: number, correction: string) =>
  appeler('music_brief_corriger', { p_empreinte: empreinte, p_version: version, p_feedback: correction })

export const validerBrief = (empreinte: string, version: number, consentVersion: string) =>
  appeler('music_brief_valider', { p_empreinte: empreinte, p_version: version, p_consent_version: consentVersion })
