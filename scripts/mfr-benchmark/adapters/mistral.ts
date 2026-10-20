// ============================================================
// BENCHMARK-MFR V1 — Adapter benchmark Mistral — Phase 2A
// ============================================================
// Candidat QG : Mistral Large 4, classification À VÉRIFIER
// EXPÉRIMENTALEMENT (Structured Outputs `json_schema`+`strict:true`
// documenté « sur tous les modèles de La Plateforme », mais le modèle
// Large 4 précis est encore en Research Public Preview au 2026-10-06,
// poids non distribués au moment du rapport — voir rapport matrice
// providers 2026-10-17). Schéma canonique envoyé SANS transformation
// (aucune incompatibilité confirmée justifiant une adaptation) —
// seule la STABILITÉ de l'API en période de preview reste un risque
// non-schéma, à vérifier au premier sanity call réel, pas ici.
//
// `appellerMistralPourBenchmark` n'est appelée NULLE PART dans cette
// phase — code prêt, dormant, zéro appel réseau exécuté.

import type { AppelAdapterParams, RequeteHttp, ResultatAdapterBenchmark } from './types'
import { parserReponseChatCompletionsCompatible } from './chatCompletionsCompatible'

export function construireRequete(params: AppelAdapterParams): RequeteHttp {
  return {
    url: 'https://api.mistral.ai/v1/chat/completions',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: params.model,
      max_tokens: params.maxOutputTokens,
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
export async function appellerMistralPourBenchmark(params: AppelAdapterParams): Promise<ResultatAdapterBenchmark> {
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
