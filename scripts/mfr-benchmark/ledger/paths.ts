// ============================================================
// BENCHMARK-MFR V1 — Chemins du ledger — Phase 2A
// ============================================================
// Dossier dédié, gitignored (`.gitignore` : `scripts/mfr-benchmark/.ledger/`).
// Jamais Supabase, jamais versionné — état d'exécution local uniquement.

import { join } from 'path'

export interface CheminsLedger {
  readonly dossier: string
  readonly principal: string
  readonly sauvegarde: string
  readonly sentinelle: string
}

export function cheminsLedgerParDefaut(dossierBenchmark: string): CheminsLedger {
  const dossier = join(dossierBenchmark, '.ledger')
  return {
    dossier,
    principal: join(dossier, 'budget-ledger.json'),
    sauvegarde: join(dossier, 'budget-ledger.backup.json'),
    sentinelle: join(dossier, '.initialized'),
  }
}
