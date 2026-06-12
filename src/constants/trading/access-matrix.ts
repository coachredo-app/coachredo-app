import type { TraderMode } from '@/lib/trading-types'

export type FeatureAccess = 'FULL' | 'READ_ONLY' | 'CONDITIONAL' | 'LOCKED'

export interface FeatureGate {
  access: FeatureAccess
  // Pour CONDITIONAL : condition supplémentaire à vérifier côté serveur
  condition?: string
}

export const ACCESS_MATRIX: Record<string, Record<TraderMode, FeatureGate>> = {
  // Sessions
  session_overview: {
    ELEVE:           { access: 'READ_ONLY' },  // Aperçu couleurs uniquement
    ANALYSTE:        { access: 'FULL' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },
  asia_range: {
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'FULL' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },

  // HTF Analysis
  htf_analysis: {
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'FULL' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },

  // CMP Engine
  cmp_model_read: {
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'READ_ONLY' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },
  cmp_score_full: {
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'LOCKED' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },

  // Trade Plan
  trade_plan: {
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'LOCKED' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },

  // Anticipation + Sniper — conditionnel Discipline ≥ 85
  anticipation: {
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'LOCKED' },
    TRADER_ENCADRE:  { access: 'CONDITIONAL', condition: 'discipline_score_gte_85' },
    PRO:             { access: 'FULL' },
  },
  sniper: {
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'LOCKED' },
    TRADER_ENCADRE:  { access: 'CONDITIONAL', condition: 'discipline_score_gte_85' },
    PRO:             { access: 'FULL' },
  },

  // Journal
  journal: {
    ELEVE:           { access: 'READ_ONLY' },  // Observation uniquement
    ANALYSTE:        { access: 'FULL' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },

  // News
  news_lock: {
    ELEVE:           { access: 'READ_ONLY' },  // Éducatif
    ANALYSTE:        { access: 'FULL' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },

  // Discipline
  discipline_full: {
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'LOCKED' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },

  // Prop Firm
  prop_firm: {
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'LOCKED' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },

  // Academy
  academy_fondations: {  // Modules 0-5
    ELEVE:           { access: 'FULL' },
    ANALYSTE:        { access: 'FULL' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },
  academy_advanced: {    // Modules 6-9
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'FULL' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },

  // Edge / Stats
  edge_database: {
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'LOCKED' },
    TRADER_ENCADRE:  { access: 'LOCKED' },
    PRO:             { access: 'FULL' },
  },

  // Coach IA
  coach_ia: {
    ELEVE:           { access: 'LOCKED' },
    ANALYSTE:        { access: 'FULL' },
    TRADER_ENCADRE:  { access: 'FULL' },
    PRO:             { access: 'FULL' },
  },
}

export function checkFeatureAccess(
  feature: string,
  mode: TraderMode,
  disciplineScore?: number
): FeatureAccess {
  const gate = ACCESS_MATRIX[feature]?.[mode]
  if (!gate) return 'LOCKED'

  if (gate.access === 'CONDITIONAL') {
    if (gate.condition === 'discipline_score_gte_85') {
      return (disciplineScore ?? 0) >= 85 ? 'FULL' : 'LOCKED'
    }
    return 'LOCKED'
  }

  return gate.access
}
