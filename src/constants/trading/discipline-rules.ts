// RÈGLE 6 — Trading Lock
export const LOSS_STREAK_LOCK_THRESHOLD = 3
export const LOSS_STREAK_UNLOCK_UTC_HOUR = 0  // 00:00 UTC = ouverture Asia

// RÈGLE 8 — Weekend Protection
export const WEEKEND_CLOSE_HOUR_UTC = 20       // Vendredi 20:00 UTC
export const WEEKEND_WARNING_HOUR_UTC = 19     // Vendredi 19:30 UTC (30min avant)
export const WEEKEND_VIOLATION_PENALTY = -20   // Points de discipline

export const NON_CRYPTO_ASSETS = [
  'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF',
  'NAS100', 'SPX500', 'DAX', 'US30', 'UK100', 'GER40',
] as const

// Score plancher
export const DISCIPLINE_SCORE_MIN = 0
export const DISCIPLINE_SCORE_MAX = 100
export const DISCIPLINE_SCORE_DEFAULT = 100

// Pénalités
export const DISCIPLINE_PENALTIES = {
  WEEKEND_VIOLATION: -20,
  LOSS_STREAK_LOCK: 0,        // pas de pénalité supplémentaire, le lock suffit
  NEWS_VIOLATION: -15,
  SESSION_EXIT_VIOLATION: -10,
} as const

// Seuil minimum pour accès Anticipation + Sniper (Mode Trader Encadré)
export const SNIPER_DISCIPLINE_THRESHOLD = 85
