// ============================================================
// BENCHMARK-MFR V1 — Adapter benchmark Moonshot Kimi — Phase 2A
// ============================================================
// Candidat QG : Kimi K3, classification HANDICAP SCHEMA (aucune
// garantie closed-world native suffisamment établie dans la
// documentation trouvée — voir rapport matrice providers 2026-10-17).
// Point d'accès « chat completions » OpenAI-compatible, mode
// `response_format:{type:'json_schema', strict:true}` documenté
// (`platform.kimi.ai`/`platform.moonshot.ai` — NON VÉRIFIÉ lequel des
// deux domaines est le point d'accès de production actuel, les deux
// apparaissent dans la documentation trouvée).
//
// Contrainte positive déjà satisfaite sans aucune transformation :
// Kimi n'émet jamais un tableau JSON au niveau racine — notre schéma
// canonique a déjà un OBJET à la racine (jamais un tableau), donc
// AUCUNE adaptation n'est nécessaire sur ce point précis.
//
// « Handicap schéma » signifie ici une GARANTIE plus faible, pas une
// incompatibilité syntaxique confirmée : le schéma canonique est donc
// envoyé SANS transformation (aucune suppression de contrainte
// proposée). Si Kimi ignore silencieusement `additionalProperties:false`
// ou `required`, ceci ne constitue PAS un affaiblissement de notre
// contrat métier réel : `validerEtResoudreSortieBrute` (ENGINE,
// production, non touché ici) revalide intégralement et
// indépendamment tout payload reçu, quelle que soit la garantie
// réellement appliquée côté provider (principe transversal, rapport
// matrice providers §C). Le risque réel ici est un taux de FAIL ENGINE
// plus élevé pour ce candidat, jamais une sortie invalide acceptée à
// tort.
//
// `appellerKimiPourBenchmark` n'est appelée NULLE PART dans cette
// phase — code prêt, dormant, zéro appel réseau exécuté.

import type { AppelAdapterParams, RequeteHttp, ResultatAdapterBenchmark } from './types'
import { parserReponseChatCompletionsCompatible } from './chatCompletionsCompatible'

export function construireRequete(params: AppelAdapterParams): RequeteHttp {
  return {
    url: 'https://api.moonshot.ai/v1/chat/completions',
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
export async function appellerKimiPourBenchmark(params: AppelAdapterParams): Promise<ResultatAdapterBenchmark> {
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
