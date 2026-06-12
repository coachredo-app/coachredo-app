import type { MaturityState, TradeType, CMPScore } from '@/lib/trading-types'

// RÈGLE 3 — Scoring max par composant
export const SCORE_WEIGHTS: Record<keyof Omit<CMPScore, 'total'>, number> = {
  htf: 20,
  session: 15,
  cmp: 20,
  nyBias: 15,
  m5: 15,
  m3: 15,
} as const

// RÈGLE 4 — Seuils d'état CMP
export const MATURITY_THRESHOLDS: Array<{ min: number; max: number; state: MaturityState }> = [
  { min: 0,  max: 19,  state: 'IDLE' },
  { min: 20, max: 39,  state: 'WATCHING' },
  { min: 40, max: 49,  state: 'PRESSURE_BUILDING' },
  { min: 50, max: 59,  state: 'EXPANSION_RISK' },
  { min: 60, max: 69,  state: 'EARLY_READY' },
  { min: 70, max: 79,  state: 'READY' },
  { min: 80, max: 100, state: 'EXECUTION' },
]

// RÈGLE 5 — Messages par état (jamais null)
export const ENGINE_MESSAGES: Record<MaturityState, string> = {
  IDLE:              'Attente. Le marché ne présente pas de conditions exploitables.',
  WATCHING:          'Structure en formation. Surveiller sans intervenir.',
  PRESSURE_BUILDING: 'Pression en construction. Les conditions commencent à s\'aligner.',
  EXPANSION_RISK:    'Risque d\'expansion. Attendre confirmation avant tout engagement.',
  EARLY_READY:       'Setup potentiel. Validation M5/M3 requise avant entrée.',
  READY:             'Setup validé. Conditions favorables — plan d\'entrée en cours.',
  EXECUTION:         'Fenêtre d\'exécution ouverte. Tous les critères sont réunis.',
}

// RÈGLE 9 — CT Scalp
export const CT_SCALP_RULES = {
  maxQuality: 'B' as const,
  riskModifier: 0.5,
  blockedIfHtfExpansion: true,
}

export const ALLOWED_TRADE_TYPES: TradeType[] = [
  'HTF_CONTINUATION',
  'PULLBACK',
  'COUNTERTREND_SCALP',
  'CORRECTIVE_BOUNCE',
]

// RÈGLE 10 — Disclaimer anticipation (non masquable)
export const ANTICIPATION_DISCLAIMER =
  'ANTICIPATION ≠ CONFIRMATION — Ce plan est conditionnel. Aucune entrée sans confirmation confirmée.'

export function getMaturityState(totalScore: number): MaturityState {
  const threshold = MATURITY_THRESHOLDS.find(
    t => totalScore >= t.min && totalScore <= t.max
  )
  return threshold?.state ?? 'IDLE'
}

export function getEngineMessage(state: MaturityState): string {
  return ENGINE_MESSAGES[state]
}
