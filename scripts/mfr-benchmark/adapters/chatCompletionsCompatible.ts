// ============================================================
// BENCHMARK-MFR V1 — Parsing partagé « chat completions » — Phase 2A
// ============================================================
// Alibaba (Qwen), Moonshot (Kimi) et Mistral exposent tous les trois,
// d'après leur documentation officielle respective (voir rapport
// matrice providers, 2026-10-17), un point d'accès de forme
// `chat.completions` compatible OpenAI : `{choices:[{message:{content},
// finish_reason}], usage:{prompt_tokens, completion_tokens}}`. Ce fichier
// factorise UNIQUEMENT ce parsing commun — chaque adapter garde sa
// propre construction de requête (URL/headers/model), jamais partagée.
//
// NON VÉRIFIÉ explicite : aucun de ces 3 adapters n'a jamais été
// exercé contre une vraie réponse (aucun appel réel autorisé, GO
// Phase 2A). La forme exacte ci-dessous est déduite de la
// documentation publique trouvée, pas d'une réponse réelle observée —
// à confirmer au premier sanity call réel (hors périmètre de cette
// phase).
//
// Aucune réparation/retry/coercion : un payload absent/tronqué/refusé
// reste classé comme tel, jamais corrigé ni complété.

import type { ResultatAdapterBenchmark } from './types'
import { fragmentDefensif } from './types'

export interface ReponseChatCompletionsCompatible {
  readonly id?: string
  readonly model?: string
  readonly choices?: ReadonlyArray<{
    readonly message?: {
      readonly content?: string | null
      readonly refusal?: string | null
    }
    readonly finish_reason?: string | null
  }>
  readonly usage?: {
    readonly prompt_tokens?: number
    readonly completion_tokens?: number
    readonly total_tokens?: number
    /** Champ spéculatif (nom exact NON VÉRIFIÉ pour ces 3 providers) —
     * lu de façon défensive, jamais supposé présent. */
    readonly completion_tokens_details?: { readonly reasoning_tokens?: number }
  }
  readonly error?: { readonly message?: string; readonly code?: string | number; readonly type?: string }
}

export function parserReponseChatCompletionsCompatible(statusHttp: number, body: unknown): ResultatAdapterBenchmark {
  const usageVide = { inputTokens: null, outputTokens: null, reasoningTokens: null, coutUsd: null }

  if (statusHttp >= 400) {
    const erreur = (body as ReponseChatCompletionsCompatible)?.error
    return {
      statutTechnique: 'echec_provider',
      rawText: null,
      usage: usageVide,
      metadonnees: { responseId: null, modelRetourne: null, brut: erreur ? { ...erreur } : { statusHttp } },
    }
  }

  const reponse = body as ReponseChatCompletionsCompatible
  const usage = {
    inputTokens: reponse.usage?.prompt_tokens ?? null,
    outputTokens: reponse.usage?.completion_tokens ?? null,
    reasoningTokens: reponse.usage?.completion_tokens_details?.reasoning_tokens ?? null,
    coutUsd: null,
  }
  const metadonnees = { responseId: reponse.id ?? null, modelRetourne: reponse.model ?? null }

  const choix = reponse.choices?.[0]
  if (!choix) {
    return { statutTechnique: 'payload_absent', rawText: null, usage, metadonnees }
  }
  if (choix.message?.refusal) {
    return { statutTechnique: 'refusal', rawText: choix.message.refusal, usage, metadonnees }
  }
  if (choix.finish_reason === 'length') {
    return { statutTechnique: 'incomplete', rawText: fragmentDefensif(choix.message?.content ?? null), usage, metadonnees }
  }
  const contenu = choix.message?.content
  if (contenu === null || contenu === undefined) {
    return { statutTechnique: 'payload_absent', rawText: null, usage, metadonnees }
  }
  return { statutTechnique: 'succes', rawText: contenu, usage, metadonnees }
}
