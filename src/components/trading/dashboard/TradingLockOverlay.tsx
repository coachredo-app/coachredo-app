'use client'

import type { TradingLock } from '@/lib/trading-types'

const LOCK_LABELS: Record<string, { title: string; icon: string }> = {
  LossStreak:   { title: 'TRADING LOCK — 3 pertes consécutives', icon: '🔒' },
  NewsLock:     { title: 'NEWS LOCK — Actualité critique', icon: '📰' },
  SessionExit:  { title: 'SESSION FERMÉE', icon: '🌙' },
  ManualLock:   { title: 'TRADING SUSPENDU', icon: '⚠️' },
}

interface TradingLockOverlayProps {
  lock: TradingLock
}

function fmt(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
}

export function TradingLockOverlay({ lock }: TradingLockOverlayProps) {
  const info = LOCK_LABELS[lock.lockType] ?? { title: 'TRADING VERROUILLÉ', icon: '🔒' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="mx-4 max-w-md w-full rounded-2xl p-8 text-center space-y-4"
        style={{ backgroundColor: 'var(--color-trading-locked)', color: '#fff' }}
      >
        <div className="text-4xl">{info.icon}</div>
        <h2 className="text-xl font-bold tracking-tight">{info.title}</h2>

        {lock.lockType === 'LossStreak' && (
          <p className="text-sm opacity-80 leading-relaxed">
            Après 3 pertes consécutives, le trading est automatiquement suspendu.
            <br />
            La protection de ton capital prime sur l&apos;opportunité.
          </p>
        )}

        {lock.lockType === 'NewsLock' && (
          <p className="text-sm opacity-80 leading-relaxed">
            Un événement macro critique est en cours.
            Le marché est imprévisible dans cette fenêtre.
          </p>
        )}

        {lock.unlockAt && (
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-xs opacity-70 mb-1">Déverrouillage prévu</p>
            <p className="font-semibold">{fmt(lock.unlockAt)}</p>
          </div>
        )}

        {lock.lockType === 'LossStreak' && !lock.unlockAt && (
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-xs opacity-70">
              Déverrouillage automatique à la prochaine ouverture Asia (00:00 UTC)
            </p>
          </div>
        )}

        <p className="text-xs opacity-50 pt-2">
          Ce lock ne peut pas être ignoré. Profites-en pour réviser ton journal.
        </p>
      </div>
    </div>
  )
}
