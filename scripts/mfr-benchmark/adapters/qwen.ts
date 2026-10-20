// ============================================================
// BENCHMARK-MFR V1 — Adapter benchmark Alibaba Qwen — Phase 2A
// ============================================================
// Candidat QG : Qwen 3.7 Plus, classification NATIF (Alibaba Cloud
// Model Studio documente nommément le support JSON Schema pour cette
// série de modèles — voir rapport matrice providers 2026-10-17).
//
// ENDPOINT PARAMÉTRABLE (consigne QG, Phase 2B-PRE) : le point d'accès
// DashScope dépend du Workspace/région du compte réel — AUCUNE valeur
// par défaut, AUCUN fallback silencieux, AUCUN endpoint inventé ici.
// `construireRequete` EXIGE `params.endpointUrl` (`AppelQwenAdapterParams`,
// voir `./types.ts`) — fourni explicitement par le futur runner réel
// (non construit dans cette phase), jamais une URL figée dans ce fichier.
//
// Détail exact des keywords JSON Schema supportés (additionalProperties,
// $ref, minItems) NON VÉRIFIÉ au-delà de l'existence confirmée du mode
// `json_schema`+`strict:true` — schéma canonique envoyé sans
// transformation (NATIF), à confronter à un vrai appel plus tard.
//
// `appellerQwenPourBenchmark` n'est appelée NULLE PART dans cette
// phase — code prêt, dormant, zéro appel réseau exécuté.

import type { AppelQwenAdapterParams, RequeteHttp, ResultatAdapterBenchmark } from './types'
import { parserReponseChatCompletionsCompatible } from './chatCompletionsCompatible'

export function construireRequete(params: AppelQwenAdapterParams): RequeteHttp {
  if (!params.endpointUrl) {
    throw new Error('Qwen : endpointUrl est obligatoire (dépend du Workspace/région du compte) — aucun fallback silencieux, aucune valeur par défaut.')
  }
  return {
    url: params.endpointUrl,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: params.model,
      // `max_tokens` est deprecated par Alibaba pour les nouvelles
      // intégrations (Qwen Plus 3.5+) — `max_completion_tokens` limite
      // la sortie complète, raisonnement inclus (consigne QG,
      // micro-correctif Phase 2B-PRE, doc officielle vérifiée).
      max_completion_tokens: params.maxOutputTokens,
      messages: [
        { role: 'system', content: params.promptSysteme },
        { role: 'user', content: params.contexteSerialise },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: params.schemaName, strict: true, schema: params.schema },
      },
    },
  }
}

export function parserReponse(statusHttp: number, body: unknown): ResultatAdapterBenchmark {
  return parserReponseChatCompletionsCompatible(statusHttp, body)
}

/** Exécuteur réel — JAMAIS invoqué dans cette phase. */
export async function appellerQwenPourBenchmark(params: AppelQwenAdapterParams): Promise<ResultatAdapterBenchmark> {
  const requete = construireRequete(params)
  const controleur = new AbortController()
  const timeout = setTimeout(() => controleur.abort(), params.timeoutMs)
  try {
    const reponseHttp = await fetch(requete.url, {
      method: requete.method,
      headers: requete.headers,
      body: JSON.stringify(requete.body),
      signal: controleur.signal,
    })
    const corpsJson = await reponseHttp.json()
    return parserReponse(reponseHttp.status, corpsJson)
  } catch (erreur) {
    return {
      statutTechnique: 'erreur_reseau',
      rawText: null,
      usage: { inputTokens: null, outputTokens: null, reasoningTokens: null, coutUsd: null },
      metadonnees: { responseId: null, modelRetourne: null, brut: { erreur: erreur instanceof Error ? erreur.message : String(erreur) } },
    }
  } finally {
    clearTimeout(timeout)
  }
}
