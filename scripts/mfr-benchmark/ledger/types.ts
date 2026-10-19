// ============================================================
// BENCHMARK-MFR V1 — Ledger budgétaire persistant — Phase 2A
// ============================================================
// Types purs, zéro dépendance réseau/DB. Hors `src/lib/mfr/` par
// construction (même discipline que le reste de `scripts/mfr-benchmark/`,
// voir `../types.ts`). Jamais de clé API ni de contenu MPD stocké ici —
// uniquement des métadonnées de coût/traçabilité (arbitrage QG,
// BENCHMARK-MFR V1 Phase 2 — spécification B8).

/**
 * `pending` : appel réservé/en cours, coût réel non encore confirmé —
 * son `estimatedCostUsd` compte dans le cumul réservé tant qu'il reste
 * à cet état (discipline anti-dépassement : jamais remis à zéro
 * automatiquement, voir `ledger.ts`).
 * `completed` : coût réel connu et renseigné (`actualCostUsd`).
 * `failed_unknown_cost` : résolution manuelle explicite d'un `pending`
 * orphelin dont le coût réel n'a jamais pu être confirmé — JAMAIS posé
 * automatiquement par ce module, uniquement par une intervention humaine
 * explicite (voir `Ledger.resoudreManuellement`).
 */
export type LedgerEntryStatus = 'pending' | 'completed' | 'failed_unknown_cost'

export interface LedgerEntry {
  readonly entryId: string
  status: LedgerEntryStatus
  readonly timestamp: string
  readonly provider: string
  readonly model: string
  readonly fixtureId: string
  readonly repetition: number
  readonly estimatedCostUsd: number
  inputTokens: number | null
  outputTokens: number | null
  actualCostUsd: number | null
  /** Cumul dépensé (entrées `completed` uniquement) immédiatement après
   * cette entrée — dérivé, recalculé à chaque écriture, jamais une
   * valeur de confiance isolée (protection anti-corruption, voir
   * `Ledger.recalculerCumuls`). */
  cumulativeSpentAfterUsd: number | null
  /** Cumul réservé (entrées `pending` incluses) immédiatement après
   * cette entrée — même discipline de recalcul que ci-dessus. */
  cumulativeReservedAfterUsd: number | null
  statutTechnique: string | null
}

export interface LedgerFile {
  readonly schemaVersion: 1
  readonly hardCapUsd: number
  readonly createdAt: string
  readonly entries: LedgerEntry[]
}

/** Paramètres d'une réservation `pending` — fournis par l'appelant
 * avant tout appel réel futur (jamais exécuté dans cette phase). */
export interface ReservationParams {
  readonly provider: string
  readonly model: string
  readonly fixtureId: string
  readonly repetition: number
  readonly estimatedCostUsd: number
}

/** Résultat réel connu, fourni après un appel réellement exécuté
 * (jamais dans cette phase — module testé uniquement avec des valeurs
 * fictives). */
export interface ResolutionCompleteeParams {
  readonly actualCostUsd: number
  readonly inputTokens: number | null
  readonly outputTokens: number | null
  readonly statutTechnique: string
}
