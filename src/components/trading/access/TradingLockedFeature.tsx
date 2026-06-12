import type { TraderMode } from '@/lib/trading-types'

const UNLOCK_PATH: Record<string, { label: string; path: string }> = {
  htf_analysis:    { label: 'Terminer les modules Academy HTF', path: '/trading/academy' },
  asia_range:      { label: 'Accéder au mode Analyste', path: '/trading/academy' },
  cmp_model_read:  { label: 'Accéder au mode Analyste', path: '/trading/academy' },
  cmp_score_full:  { label: 'Accéder au mode Trader Encadré', path: '/trading/academy' },
  trade_plan:      { label: 'Accéder au mode Trader Encadré', path: '/trading/academy' },
  anticipation:    { label: 'Atteindre 85 pts de discipline', path: '/trading/discipline' },
  sniper:          { label: 'Atteindre 85 pts de discipline', path: '/trading/discipline' },
  discipline_full: { label: 'Accéder au mode Trader Encadré', path: '/trading/academy' },
  edge_database:   { label: 'Accéder au mode Pro', path: '/trading/academy' },
  prop_firm:       { label: 'Accéder au mode Trader Encadré', path: '/trading/academy' },
  coach_ia:        { label: 'Accéder au mode Analyste', path: '/trading/academy' },
  academy_advanced:{ label: 'Compléter les modules Fondations', path: '/trading/academy' },
}

const MODE_LABELS: Record<TraderMode, string> = {
  ELEVE:           'Mode Élève',
  ANALYSTE:        'Mode Analyste',
  TRADER_ENCADRE:  'Mode Trader Encadré',
  PRO:             'Mode Pro',
}

interface TradingLockedFeatureProps {
  feature: string
  mode: TraderMode
}

export function TradingLockedFeature({ feature, mode }: TradingLockedFeatureProps) {
  const unlock = UNLOCK_PATH[feature]

  return (
    <div className="rounded-xl border border-cr-border bg-surface p-6 text-center space-y-3">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-background border border-cr-border">
        <svg className="w-5 h-5 text-cr-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-cr-text">Fonctionnalité verrouillée</p>
        <p className="text-xs text-cr-text-muted mt-1">
          Actuellement en {MODE_LABELS[mode]}
        </p>
      </div>
      {unlock && (
        <a
          href={unlock.path}
          className="inline-flex items-center gap-1.5 text-xs text-cr-accent hover:text-cr-accent-hover transition-colors"
        >
          {unlock.label} →
        </a>
      )}
    </div>
  )
}
