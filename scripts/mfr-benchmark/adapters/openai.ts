// ============================================================
// BENCHMARK-MFR V1 — Adapter benchmark OpenAI — Phase 2A
// ============================================================
// Mirroir INDÉPENDANT de `src/lib/mfr/provider/openai.ts` (production)
// — jamais importé, jamais modifié. Réimplémenté ici via `fetch` brut
// (zéro dépendance au SDK `openai`, zéro nouveau package) pour rester
// strictement isolé de l'adapter de production, même famille d'API
// (Responses API + Structured Outputs strict, déjà vérifiée contre le
// SDK installé en T-MFR.3D) mais code entièrement distinct.
//
// `appellerOpenAiPourBenchmark` n'est appelée NULLE PART dans cette
// phase (ni par les tests, ni par aucun autre fichier) — code prêt,
// dormant, zéro appel réseau exécuté. Candidat QG : GPT-6.1 Sol,
// classification NATIF (schéma canonique envoyé sans transformation).
//
// Risque connu, NON résolu ici (voir matrice providers) : le support
// de `minItems` par Structured Outputs est documenté de façon
// contradictoire (historiquement non supporté, signaux communautaires
// récents non confirmés officiellement) — à vérifier au premier
// sanity call réel, pas ici.

import type { AppelAdapterParams, RequeteHttp, ResultatAdapterBenchmark } from './types'
import { fragmentDefensif } from './types'

export function construireRequete(params: AppelAdapterParams): RequeteHttp {
  return {
    url: 'https://api.openai.com/v1/responses',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: params.model,
      input: [
        { role: 'system', content: params.promptSysteme },
        { role: 'user', content: params.contexteSerialise },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: params.schemaName,
          strict: true,
          schema: params.schema,
        },
      },
    },
  }
}

interface ReponseOpenAi {
  readonly id?: string
  readonly model?: string
  readonly status?: 'completed' | 'incomplete' | 'failed'
  readonly incomplete_details?: { readonly reason?: string }
  readonly error?: { readonly code?: string; readonly message?: string }
  readonly output?: ReadonlyArray<{
    readonly type?: string
    readonly content?: ReadonlyArray<{ readonly type?: string; readonly text?: string }>
  }>
  readonly usage?: {
    readonly input_tokens?: number
    readonly output_tokens?: number
    readonly output_tokens_details?: { readonly reasoning_tokens?: number }
  }
}

export function parserReponse(statusHttp: number, body: unknown): ResultatAdapterBenchmark {
  const usageVide = { inputTokens: null, outputTokens: null, reasoningTokens: null, coutUsd: null }

  if (statusHttp >= 400) {
    const reponse = body as ReponseOpenAi
    return {
      statutTechnique: 'echec_provider',
      rawText: null,
      usage: usageVide,
      metadonnees: { responseId: reponse?.id ?? null, modelRetourne: reponse?.model ?? null, brut: reponse?.error ? { ...reponse.error } : { statusHttp } },
    }
  }

  const reponse = body as ReponseOpenAi
  const usage = {
    inputTokens: reponse.usage?.input_tokens ?? null,
    outputTokens: reponse.usage?.output_tokens ?? null,
    reasoningTokens: reponse.usage?.output_tokens_details?.reasoning_tokens ?? null,
    coutUsd: null,
  }
  const metadonnees = { responseId: reponse.id ?? null, modelRetourne: reponse.model ?? null }

  if (reponse.status === 'failed') {
    return { statutTechnique: 'echec_provider', rawText: null, usage, metadonnees: { ...metadonnees, brut: reponse.error ? { ...reponse.error } : undefined } }
  }

  const messageItem = reponse.output?.find(item => item.type === 'message')
  const refusalItem = messageItem?.content?.find(c => c.type === 'refusal')
  if (refusalItem) {
    return { statutTechnique: 'refusal', rawText: refusalItem.text ?? null, usage, metadonnees }
  }
  const texteItem = messageItem?.content?.find(c => c.type === 'output_text')

  if (reponse.status === 'incomplete') {
    return {
      statutTechnique: 'incomplete',
      rawText: fragmentDefensif(texteItem?.text ?? null),
      usage,
      metadonnees: { ...metadonnees, brut: { reason: reponse.incomplete_details?.reason ?? null } },
    }
  }

  if (!texteItem?.text) {
    return { statutTechnique: 'payload_absent', rawText: null, usage, metadonnees }
  }
  return { statutTechnique: 'succes', rawText: texteItem.text, usage, metadonnees }
}

/** Exécuteur réel — JAMAIS invoqué dans cette phase (aucun appel API
 * payant autorisé, GO Phase 2A). Code dormant, prêt pour un futur
 * sanity call explicitement autorisé. */
export async function appellerOpenAiPourBenchmark(params: AppelAdapterParams): Promise<ResultatAdapterBenchmark> {
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
