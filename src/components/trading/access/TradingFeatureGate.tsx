'use client'

import type { TraderMode } from '@/lib/trading-types'
import { checkFeatureAccess } from '@/constants/trading/access-matrix'
import { TradingLockedFeature } from './TradingLockedFeature'

interface TradingFeatureGateProps {
  feature: string
  traderMode: TraderMode | null
  disciplineScore?: number
  children: React.ReactNode
  fallback?: React.ReactNode
  showLocked?: boolean  // affiche le message de verrouillage au lieu de rien
}

export function TradingFeatureGate({
  feature,
  traderMode,
  disciplineScore,
  children,
  fallback,
  showLocked = false,
}: TradingFeatureGateProps) {
  const mode = traderMode ?? 'ELEVE'
  const access = checkFeatureAccess(feature, mode, disciplineScore)

  if (access === 'LOCKED') {
    if (fallback) return <>{fallback}</>
    if (showLocked) return <TradingLockedFeature feature={feature} mode={mode} />
    return null
  }

  // READ_ONLY et FULL : affiche les enfants
  // La restriction READ_ONLY est gérée dans les composants enfants eux-mêmes
  return <>{children}</>
}
