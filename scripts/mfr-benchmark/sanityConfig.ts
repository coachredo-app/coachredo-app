// ============================================================
// BENCHMARK-MFR V1 — Constantes verrouillées des sanity calls — Phase 2B-PRE
// ============================================================
// Décisions QG verrouillées (GO CODE Phase 2B-PRE) — source UNIQUE de
// vérité pour éviter toute duplication/incohérence entre les 6
// adapters, les tests, et le futur runner réel (non construit ici).

import type { FixtureId } from './types'

/** Fixture synthétique unique, IDENTIQUE pour les 6 sanity calls —
 * aucune donnée utilisateur réelle (voir rapport B9/preflight 2B). */
export const FIXTURE_ID_SANITY: FixtureId = 'GROUNDING_CIBLE'

/** Plafond de sortie MAXIMUM, verrouillé par le QG — transmis
 * réellement à chacun des 6 providers selon sa syntaxe propre (jamais
 * une valeur illimitée, jamais une valeur non calibrée). */
export const MAX_OUTPUT_TOKENS_SANITY = 4096
