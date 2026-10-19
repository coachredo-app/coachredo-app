// ============================================================
// BENCHMARK-MFR V1 — Adapter benchmark Google Gemini — Phase 2A
// ============================================================
// Candidat QG : Gemini 3.8 Flash, classification NATIF (schéma
// canonique envoyé sans transformation — documentation officielle
// trouvée liste `$id/$defs/$ref/additionalProperties/minItems/maxItems`
// comme supportés, voir rapport matrice providers 2026-10-17). Seul
// point gris documenté : la syntaxe exacte de nullabilité
// (`type:['string','null']`, utilisée par notre schéma canonique, vs
// `nullable:true` séparé historiquement utilisé par Gemini) — envoyée
// ICI sans transformation (NATIF), le point reste à vérifier au
// premier sanity call réel, pas ici.
//
// `appellerGeminiPourBenchmark` n'est appelée NULLE PART dans cette
// phase — code prêt, dormant, zéro appel réseau exécuté.

import type { AppelAdapterParams, RequeteHttp, ResultatAdapterBenchmark } from './types'
import { fragmentDefensif } from './types'

export function construireRequete(params: AppelAdapterParams): RequeteHttp {
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent`,
    method: 'POST',
    headers: {
      'x-goog-api-key': params.apiKey,
      'Content-Type': 'application/json',
    },
    body: {
      systemInstruction: { parts: [{ text: params.promptSysteme }] },
      contents: [{ role: 'user', parts: [{ text: params.contexteSerialise }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: params.schema,
      },
    },
  }
}

interface ReponseGemini {
  readonly error?: { readonly message?: string; readonly code?: number; readonly status?: string }
  readonly candidates?: ReadonlyArray<{
    readonly finishReason?: string
    readonly content?: { readonly parts?: ReadonlyArray<{ readonly text?: string }> }
  }>
  readonly usageMetadata?: {
    readonly promptTokenCount?: number
    readonly candidatesTokenCount?: number
    readonly totalTokenCount?: number
  }
}

export function parserReponse(statusHttp: number, body: unknown): ResultatAdapterBenchmark {
  const usageVide = { inputTokens: null, outputTokens: null, reasoningTokens: null, coutUsd: null }
  const reponse = body as ReponseGemini

  if (statusHttp >= 400) {
    return {
      statutTechnique: 'echec_provider',
      rawText: null,
      usage: usageVide,
      metadonnees: { responseId: null, modelRetourne: null, brut: reponse?.error ? { ...reponse.error } : { statusHttp } },
    }
  }

  const usage = {
    inputTokens: reponse.usageMetadata?.promptTokenCount ?? null,
    outputTokens: reponse.usageMetadata?.candidatesTokenCount ?? null,
    // Gemini ne documente pas de champ "reasoning tokens" distinct dans
    // les sources trouvées — NON VÉRIFIÉ, jamais inventé à 0.
    reasoningTokens: null,
    coutUsd: null,
  }
  // Gemini ne renvoie pas d'identifiant de réponse ni le modèle exact
  // dans le corps de cette API (NON VÉRIFIÉ au-delà de la doc trouvée).
  const metadonnees = { responseId: null, modelRetourne: null }

  const candidat = reponse.candidates?.[0]
  if (!candidat) {
    return { statutTechnique: 'payload_absent', rawText: null, usage, metadonnees }
  }

  const texte = candidat.content?.parts?.map(p => p.text ?? '').join('') ?? ''

  if (candidat.finishReason === 'MAX_TOKENS') {
    return { statutTechnique: 'incomplete', rawText: fragmentDefensif(texte || null), usage, metadonnees }
  }
  // SAFETY/RECITATION/OTHER : traités comme l'équivalent fonctionnel
  // d'un refus de contenu — mapping interprétatif explicite, PAS une
  // garantie sémantique identique à un `refusal` natif OpenAI (à
  // documenter comme tel si un vrai cas survient).
  if (candidat.finishReason === 'SAFETY' || candidat.finishReason === 'RECITATION' || candidat.finishReason === 'OTHER') {
    return { statutTechnique: 'refusal', rawText: null, usage, metadonnees: { ...metadonnees, brut: { finishReason: candidat.finishReason } } }
  }
  if (!texte) {
    return { statutTechnique: 'payload_absent', rawText: null, usage, metadonnees }
  }
  return { statutTechnique: 'succes', rawText: texte, usage, metadonnees }
}

/** Exécuteur réel — JAMAIS invoqué dans cette phase. */
export async function appellerGeminiPourBenchmark(params: AppelAdapterParams): Promise<ResultatAdapterBenchmark> {
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
