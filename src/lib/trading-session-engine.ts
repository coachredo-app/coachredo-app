import type {
  ActiveSession,
  AsiaRangeValidation,
  LondonContext,
  TradingSessionRange,
} from './trading-types'
import { SESSION_TIMES, WEEKEND_CRYPTO_ALLOWED, getActiveSession } from '@/constants/trading/session-times'
import { WEEKEND_CLOSE_HOUR_UTC } from '@/constants/trading/discipline-rules'

// RÈGLE 1 — ASIA GATE (critique — garde-fou de toute la chaîne)
// validateAsiaRange(null) → { defined: false }
export function validateAsiaRange(
  range: Pick<TradingSessionRange, 'asiaHigh' | 'asiaLow' | 'asiaDefined'> | null | undefined
): AsiaRangeValidation {
  if (!range) {
    return { defined: false, reason: 'Aucune session Asia enregistrée pour aujourd\'hui.' }
  }

  if (!range.asiaDefined) {
    return { defined: false, reason: 'Asian Session Range non défini.' }
  }

  if (range.asiaHigh === null || range.asiaLow === null) {
    return { defined: false, reason: 'Niveaux Asia High/Low manquants.' }
  }

  if (range.asiaHigh <= range.asiaLow) {
    return { defined: false, reason: 'Asia High doit être supérieur à Asia Low.' }
  }

  const rangePips = Math.round((range.asiaHigh - range.asiaLow) * 10000)

  return {
    defined: true,
    high: range.asiaHigh,
    low: range.asiaLow,
    rangePips,
  }
}

// Session active selon l'heure UTC courante
export { getActiveSession }

// Contexte London — sweep Asia High/Low
export function classifyLondonActivity(
  range: Pick<TradingSessionRange, 'asiaHigh' | 'asiaLow' | 'londonHigh' | 'londonLow'> | null
): LondonContext {
  if (!range || range.londonHigh === null || range.londonLow === null) {
    return {
      londonActive: false,
      sweptAsiaHigh: false,
      sweptAsiaLow: false,
      londonHigh: null,
      londonLow: null,
      compressionScore: 0,
    }
  }

  const sweptAsiaHigh = range.asiaHigh !== null && range.londonHigh > range.asiaHigh
  const sweptAsiaLow  = range.asiaLow  !== null && range.londonLow  < range.asiaLow
  const compressionScore = calculateCompressionScore({
    asiaHigh: range.asiaHigh,
    asiaLow: range.asiaLow,
    londonHigh: range.londonHigh,
    londonLow: range.londonLow,
  })

  return {
    londonActive: true,
    sweptAsiaHigh,
    sweptAsiaLow,
    londonHigh: range.londonHigh,
    londonLow: range.londonLow,
    compressionScore,
  }
}

// Score de compression ARM (0.0 à 1.0)
export function calculateCompressionScore(data: {
  asiaHigh: number | null
  asiaLow: number | null
  londonHigh: number | null
  londonLow: number | null
}): number {
  if (
    data.asiaHigh === null || data.asiaLow === null ||
    data.londonHigh === null || data.londonLow === null
  ) return 0

  const asiaRange   = data.asiaHigh - data.asiaLow
  const londonRange = data.londonHigh - data.londonLow

  if (asiaRange <= 0) return 0

  const ratio = londonRange / asiaRange
  // Compression forte = London range proche de 0 par rapport Asia
  // Score 1.0 = London range = 0 (compression maximale)
  // Score 0.0 = London range ≥ Asia range (pas de compression)
  return Math.max(0, Math.min(1, 1 - ratio))
}

// RÈGLE 8 — Weekend Protection
export function isWeekendTradingAllowed(asset: string, now: Date): boolean {
  const day  = now.getUTCDay()   // 0=dimanche, 5=vendredi, 6=samedi
  const hour = now.getUTCHours()

  const isCrypto = (WEEKEND_CRYPTO_ALLOWED as readonly string[]).includes(asset.toUpperCase())

  // Dimanche toute la journée → seuls crypto autorisés
  if (day === 0) return isCrypto

  // Samedi toute la journée → seuls crypto autorisés
  if (day === 6) return isCrypto

  // Vendredi ≥ 20:00 UTC → seuls crypto autorisés
  if (day === 5 && hour >= WEEKEND_CLOSE_HOUR_UTC) return isCrypto

  return true
}

// Minuterie avant fermeture weekend (pour l'alerte 30min)
export function minutesUntilWeekendClose(now: Date): number | null {
  const day  = now.getUTCDay()
  const hour = now.getUTCHours()
  const min  = now.getUTCMinutes()

  if (day !== 5) return null  // Pas vendredi

  const minutesFromMidnight = hour * 60 + min
  const closeMinutes = WEEKEND_CLOSE_HOUR_UTC * 60

  if (minutesFromMidnight >= closeMinutes) return null  // Déjà fermé
  return closeMinutes - minutesFromMidnight
}
