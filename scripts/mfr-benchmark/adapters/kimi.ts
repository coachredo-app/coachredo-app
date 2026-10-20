// ============================================================
// BENCHMARK-MFR V1 — Adapter benchmark Moonshot Kimi — Phase 2A
// ============================================================
// Candidat QG : Kimi K3, classification HANDICAP SCHEMA (aucune
// garantie closed-world native suffisamment établie dans la
// documentation trouvée — voir rapport matrice providers 2026-10-17).
//
// DOCTRINE VERROUILLÉE (QG, Phase 2B-PRE) : seul le mode OFFICIELLEMENT
// GARANTI est utilisé — JSON Mode (`response_format:{type:'json_object'}`).
// Le schéma canonique N'EST PAS transmis comme `json_schema strict:true`
// (support non établi, jamais simulé artificiellement). Le schéma
// canonique n'est pas non plus injecté dans le texte du prompt dans
// cette passe (la consigne QG le permettait « si l'architecture
// actuelle le permet proprement » — non appliqué ici pour rester
// strictement chirurgical ; `promptSysteme`/`contexteSerialise`
// transmis tels quels, identiques aux 5 autres providers). Le pipeline
// reste : provider → texte → `JSON.parse` → ENGINE validator — AUCUN
// repair, AUCUN retry, AUCUNE coercion, AUCUNE correction de SRC,
// AUCUNE tentative de rendre Kimi artificiellement équivalent à un
// provider à Structured Output strict. Si le JSON retourné ne
// respecte pas notre contrat, il FAIL/NON_EVALUE selon le point exact
// d'échec — ce handicap fait partie du benchmark, pas une anomalie à
// corriger.
//
// Kimi n'émet jamais un tableau JSON au niveau racine — notre schéma
// canonique a déjà un OBJET à la racine, cohérent avec JSON Mode.
//
// K3 reste en thinking mode selon son comportement API réel. K3
// supporte désormais `reasoning_effort: low|high|max` (défaut `max`)
// — DÉCISION QG (micro-correctif Phase 2B-PRE) : ce paramètre n'est
// PAS ajouté dans ce patch, pour ne pas introduire une variable
// supplémentaire dans le protocole avant le premier sanity ; le
// comportement par défaut du provider (`max`) est conservé tel quel.
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
      // `max_tokens` est deprecated par Moonshot — `max_completion_tokens`
      // est le champ actuel (consigne QG, micro-correctif Phase 2B-PRE,
      // doc officielle vérifiée).
      max_completion_tokens: params.maxOutputTokens,
      messages: [
        { role: 'system', content: params.promptSysteme },
        { role: 'user', content: params.contexteSerialise },
      ],
      // JSON Mode uniquement — seul mode officiellement garanti pour
      // K3 (consigne QG) — jamais `json_schema`/`strict:true`.
      response_format: { type: 'json_object' },
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
