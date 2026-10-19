// ============================================================
// BENCHMARK-MFR V1 — Adapter benchmark Alibaba Qwen — Phase 2A
// ============================================================
// Candidat QG : Qwen 3.7 Plus, classification NATIF (Alibaba Cloud
// Model Studio documente nommément le support JSON Schema pour cette
// série de modèles — voir rapport matrice providers 2026-10-17). Point
// d'accès « compatible-mode » OpenAI-compatible — endpoint
// international choisi par défaut (NON VÉRIFIÉ : l'endpoint mainland
// `dashscope.aliyuncs.com` existe aussi, à confirmer lequel est
// pertinent selon la région du compte avant tout sanity call réel).
//
// Détail exact des keywords JSON Schema supportés (additionalProperties,
// $ref, minItems) NON VÉRIFIÉ au-delà de l'existence confirmée du mode
// `json_schema`+`strict:true` — schéma canonique envoyé sans
// transformation (NATIF), à confronter à un vrai appel plus tard.
//
// `appellerQwenPourBenchmark` n'est appelée NULLE PART dans cette
// phase — code prêt, dormant, zéro appel réseau exécuté.

import type { AppelAdapterParams, RequeteHttp, ResultatAdapterBenchmark } from './types'
import { parserReponseChatCompletionsCompatible } from './chatCompletionsCompatible'

export function construireRequete(params: AppelAdapterParams): RequeteHttp {
  return {
    url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: params.model,
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
export async function appellerQwenPourBenchmark(params: AppelAdapterParams): Promise<ResultatAdapterBenchmark> {
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
