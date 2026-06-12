import type { ActiveSession } from '@/lib/trading-types'

// Heures UTC — Source : TradeMentor PRO MASTER_FINAL (immuables)
export const SESSION_TIMES = {
  ASIA: { open: 0, close: 9 },         // 00:00 – 09:00 UTC
  LONDON: { open: 7, close: 16 },      // 07:00 – 16:00 UTC
  NEWYORK: { open: 12, close: 21 },    // 12:00 – 21:00 UTC
  OVERLAP: { open: 13, close: 16 },    // London/NY overlap
} as const

export const WEEKEND_CRYPTO_ALLOWED = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD'] as const

export const ASIA_GATE_MESSAGE = 'NO CMP ANALYSIS — Asian Session Range requis'

export function getActiveSession(now: Date): ActiveSession {
  const hour = now.getUTCHours()
  const inLondon = hour >= SESSION_TIMES.LONDON.open && hour < SESSION_TIMES.LONDON.close
  const inNewYork = hour >= SESSION_TIMES.NEWYORK.open && hour < SESSION_TIMES.NEWYORK.close
  const inAsia = hour >= SESSION_TIMES.ASIA.open && hour < SESSION_TIMES.ASIA.close

  if (inLondon && inNewYork) return 'LondonNYOverlap'
  if (inLondon) return 'London'
  if (inNewYork) return 'NewYork'
  if (inAsia) return 'Asia'
  return 'Off'
}
