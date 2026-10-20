// ============================================================
// BENCHMARK-MFR V1 — Tarifs conservateurs + estimation pré-call — Phase 2B-PRE
// ============================================================
// Tarifs verrouillés par le QG (GO CODE Phase 2B-PRE, 2026-10-19) —
// AUCUN tarif inventé ici. Mistral : tarif NORMAL conservateur
// (explicitement PAS la promotion temporaire). Kimi : tarif input
// NON-CACHÉ (aucun crédit de cache dans l'estimation, conservateur par
// construction). Fonction pure, zéro dépendance réseau — destinée à
// être appelée par le FUTUR runner de sanity calls réels (non
// construit dans cette passe) pour calculer `estimatedCostUsd` AVANT
// tout appel, puis le faire réserver par `Ledger.reserverPending()`.

export type ProviderId = 'openai' | 'gemini' | 'qwen' | 'anthropic' | 'mistral' | 'kimi'

export interface TarifProvider {
  readonly inputUsdPerMillion: number
  readonly outputUsdPerMillion: number
}

export const TARIFS_CONSERVATEURS: Readonly<Record<ProviderId, TarifProvider>> = {
  openai: { inputUsdPerMillion: 2.0, outputUsdPerMillion: 10.0 },
  gemini: { inputUsdPerMillion: 0.75, outputUsdPerMillion: 3.75 },
  qwen: { inputUsdPerMillion: 0.4, outputUsdPerMillion: 1.6 },
  anthropic: { inputUsdPerMillion: 2.0, outputUsdPerMillion: 10.0 },
  // Tarif NORMAL conservateur — PAS la promotion temporaire (consigne QG explicite).
  mistral: { inputUsdPerMillion: 1.36, outputUsdPerMillion: 4.18 },
  // Input NON-CACHÉ — aucun crédit de cache credité dans l'estimation (consigne QG explicite).
  kimi: { inputUsdPerMillion: 3.0, outputUsdPerMillion: 15.0 },
}

/**
 * Estimation CONSERVATRICE du coût d'un appel, à calculer AVANT tout
 * appel réel : `inputTokensEstimes` doit être une estimation par
 * excès (jamais optimiste), `maxOutputTokensConfigure` doit être le
 * plafond RÉELLEMENT transmis au provider (jamais une moyenne
 * attendue) — le pire cas, pas le cas typique. Fonction pure, ne
 * déclenche jamais d'appel, ne lit aucune donnée réseau.
 */
export function estimerCoutConservateurUsd(provider: ProviderId, inputTokensEstimes: number, maxOutputTokensConfigure: number): number {
  const tarif = TARIFS_CONSERVATEURS[provider]
  const coutInput = (inputTokensEstimes / 1_000_000) * tarif.inputUsdPerMillion
  const coutOutput = (maxOutputTokensConfigure / 1_000_000) * tarif.outputUsdPerMillion
  return coutInput + coutOutput
}
