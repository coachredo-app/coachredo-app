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
