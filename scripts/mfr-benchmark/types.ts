// ============================================================
// BENCHMARK-MFR V1 — Types du harness (hors production) — Phase 1
// ============================================================
// Hors de `src/lib/mfr/` par construction. N'importe AUCUN module
// susceptible d'ouvrir un chemin d'écriture Supabase : zéro
// `createServiceClient`, zéro `obtenirOuCreerCycle`/`demarrerPremiereAnalyse`/
// `finirAnalyseEchec`/`finirAnalyseSucces`/`lancerAnalyseMfr`, directement
// ou indirectement (vérifié, voir rapport §I).
//
// Vocabulaire de statut provider VOLONTAIREMENT INDÉPENDANT de
// `ResultatAppelProvider` (provider/openai.ts, production) — le
// benchmark Phase 1 ne câble aucun provider réel, il ne doit donc
// dépendre d'aucun type spécifique à un adapter de production.

import type { Diagnostic } from '../../src/lib/mfr/analysis/types'

export type FixtureId = 'RICHE' | 'PAUVRE' | 'CONTRADICTOIRE' | 'AMBIGU' | 'GROUNDING_CIBLE'

export const FIXTURE_IDS: readonly FixtureId[] = ['RICHE', 'PAUVRE', 'CONTRADICTOIRE', 'AMBIGU', 'GROUNDING_CIBLE']

/**
 * Statut technique neutre d'une tentative d'appel — mirroir conceptuel
 * (pas un import) de la forme déjà éprouvée par `ResultatAppelProvider`
 * (production, D-054/T-MFR.3D), généralisée pour rester provider-neutre.
 */
export type StatutTechniqueProvider =
  | 'succes'
  | 'refusal'
  | 'incomplete'
  | 'echec_provider'
  | 'payload_non_json'
  | 'payload_absent'
  | 'erreur_reseau'

export type StatutEngine = 'PASS' | 'FAIL' | 'NON_EVALUE'

export interface UsageBenchmark {
  readonly inputTokens: number | null
  readonly outputTokens: number | null
  readonly reasoningTokens: number | null
  /** Coût réel en USD — jamais déduit de tokens bruts comparés entre
   * providers (biais identifié, archéologie précédente) ; toujours
   * calculé depuis une configuration tarifaire explicite et déclarée. */
  readonly coutUsd: number | null
}

/**
 * Un run — unité atomique du benchmark. Jamais d'`analyseId`/`cycleId`/
 * `userId` réel : `fixtureId` est le seul identifiant d'input, purement
 * synthétique.
 */
export interface BenchmarkRun {
  readonly runId: string
  readonly fixtureId: FixtureId
  readonly providerAlias: string
  readonly modelAlias: string
  readonly repetition: number
  readonly startedAt: string
  readonly finishedAt: string
  readonly latencyMs: number
  readonly input: {
    readonly promptVersion: string
    readonly promptHash: string
    readonly fixtureId: FixtureId
    readonly sourceCount: number
  }
  readonly output: {
    readonly statutTechnique: StatutTechniqueProvider
    readonly rawText: string | null
    readonly parsedPayload: unknown
  }
  readonly engine: {
    readonly statut: StatutEngine
    readonly diagnostics: readonly Diagnostic[]
    /** Présent uniquement si `statut === 'PASS'`. `unknown` ici —
     * jamais réimporté comme `AnalyseGrapheResolu` pour ne pas coupler
     * ce fichier à `server/types.ts` au-delà du strict nécessaire ;
     * le runner, lui, le type correctement à la construction. */
    readonly graphe?: unknown
  }
  readonly usage: UsageBenchmark
}

/**
 * Vue strictement anonymisée d'un run — JAMAIS provider/model/responseId/
 * usage/latence (la latence et le coût ont une signature propre à
 * chaque provider, donc potentiellement identifiante — exclus de la vue
 * aveugle par précaution, jamais montrés à l'évaluateur qualitatif).
 * Ne porte jamais le texte brut (`rawText`) — seul le graphe (si PASS)
 * ou les diagnostics (si FAIL) sont montrés, jamais la formulation
 * brute du provider qui pourrait trahir son identité par son style.
 */
export interface BlindRunView {
  readonly alias: string
  readonly fixtureId: FixtureId
  readonly engine: BenchmarkRun['engine']
}
