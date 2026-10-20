// ============================================================
// BENCHMARK-MFR V1 — Types communs des adapters benchmark — Phase 2A
// ============================================================
// Hors `src/lib/mfr/` par construction. Signature d'entrée alignée sur
// la FORME de `AppelProviderFn` (production, `orchestration/
// lancerAnalyseMfr.ts`) — jamais un import de ce type (mirroir
// volontairement indépendant, même discipline que `../types.ts` pour
// `StatutTechniqueProvider`/`ResultatAppelProvider`). Chaque adapter
// (`openai.ts`, `gemini.ts`, `qwen.ts`, `kimi.ts`, `mistral.ts`,
// `anthropic.ts`) exporte EXACTEMENT 3 fonctions :
//   - `construireRequete(params)`  — PURE, construit {url, headers, body}
//   - `parserReponse(status, body)` — PURE, classe la réponse dans le
//     vocabulaire neutre `StatutTechniqueProvider` (../types.ts)
//   - `appellerXxxPourBenchmark(params)` — exécuteur réel (fetch), compose
//     les deux ci-dessus. JAMAIS invoqué dans cette phase (ni par les
//     tests offline, ni par aucun autre fichier) — code prêt, dormant.
//
// Aucune réparation/retry/coercion dans aucun `parserReponse` : une
// sortie invalide/tronquée/refusée reste telle quelle, reclassée
// honnêtement dans le vocabulaire neutre, jamais corrigée.

import type { StatutTechniqueProvider, UsageBenchmark } from '../types'

export interface AppelAdapterParams {
  readonly promptSysteme: string
  readonly contexteSerialise: string
  readonly schema: Record<string, unknown>
  readonly schemaName: string
  readonly model: string
  readonly apiKey: string
  readonly timeoutMs: number
  /** Plafond de sortie RÉELLEMENT transmis au provider (jamais une
   * valeur illimitée) — verrouillé à 4096 pour les sanity calls, voir
   * `../sanityConfig.ts` (`MAX_OUTPUT_TOKENS_SANITY`). Chaque adapter
   * le câble vers le champ exact de son API (nom de champ différent
   * par provider — voir chaque `construireRequete`). */
  readonly maxOutputTokens: number
}

/**
 * Paramètres spécifiques à l'adapter Qwen (Alibaba) — EN PLUS de
 * `AppelAdapterParams`. `endpointUrl` est OBLIGATOIRE et ne porte
 * AUCUNE valeur par défaut : le point d'accès DashScope dépend du
 * Workspace/région du compte réel (consigne QG, Phase 2B-PRE) —
 * jamais un fallback silencieux vers une région supposée, jamais une
 * URL inventée. L'appelant (futur runner réel) doit la fournir
 * explicitement.
 */
export interface AppelQwenAdapterParams extends AppelAdapterParams {
  readonly endpointUrl: string
}

export interface RequeteHttp {
  readonly url: string
  readonly method: 'POST'
  readonly headers: Readonly<Record<string, string>>
  readonly body: unknown
}

export interface MetadonneesAdapterBenchmark {
  readonly responseId: string | null
  readonly modelRetourne: string | null
  /** Métadonnées brutes propres au provider, jamais forcées dans la
   * forme normalisée (ex. `cachedTokens`, raison exacte de troncature
   * dans le vocabulaire natif du provider) — conservées séparément,
   * jamais comparées entre providers (B6, arbitrage QG précédent). */
  readonly brut?: Readonly<Record<string, unknown>>
}

export interface ResultatAdapterBenchmark {
  readonly statutTechnique: StatutTechniqueProvider
  readonly rawText: string | null
  readonly usage: UsageBenchmark
  readonly metadonnees: MetadonneesAdapterBenchmark
}

/** Fragment défensif en cas de troncature — JAMAIS une tentative de
 * réparation, uniquement conservé pour l'audit (même discipline que
 * `provider/openai.ts` production, `extraireFragmentDefensif`). */
export function fragmentDefensif(texte: string | null | undefined, maxCaracteres = 2000): string | null {
  if (!texte) return null
  return texte.length > maxCaracteres ? texte.slice(0, maxCaracteres) : texte
}
