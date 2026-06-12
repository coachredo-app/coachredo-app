import { getTradingAdminData } from '@/lib/trading-access'
import type { TraderMode, TradingLock, AccessTier } from '@/lib/trading-types'

interface TradingAdminBlocProps {
  userId: string
}

const MODE_LABELS: Record<TraderMode, string> = {
  ELEVE:           'Élève (Observer)',
  ANALYSTE:        'Analyste (Apprenti)',
  TRADER_ENCADRE:  'Trader Encadré (Exécutant)',
  PRO:             'Pro (Discipliné+)',
}

const TIER_LABELS: Record<AccessTier, string> = {
  free:    'Gratuit',
  academy: 'Academy',
  pro:     'Pro',
  vip:     'VIP',
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function LockBadge({ lock }: { lock: TradingLock }) {
  const labels: Record<string, string> = {
    LossStreak:  'Perte ×3',
    NewsLock:    'News Lock',
    SessionExit: 'Session fermée',
    ManualLock:  'Lock manuel',
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: 'var(--color-trading-locked)', color: '#fff', opacity: 0.9 }}
    >
      🔒 {labels[lock.lockType] ?? lock.lockType}
    </span>
  )
}

export async function TradingAdminBloc({ userId }: TradingAdminBlocProps) {
  let data

  try {
    data = await getTradingAdminData(userId)
  } catch {
    // La table trading_access n'existe pas encore (avant migration)
    return (
      <div className="bg-surface rounded-xl border border-cr-border p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-3">
          CoachRedo Trading
        </h2>
        <p className="text-sm text-cr-text-muted italic">
          Module Trading non activé — migration SQL à appliquer.
        </p>
      </div>
    )
  }

  if (!data.hasAccess) {
    return (
      <div className="bg-surface rounded-xl border border-cr-border p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-3">
          CoachRedo Trading
        </h2>
        <p className="text-sm text-cr-text-muted italic">Aucun accès Trading activé.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-xl border border-cr-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-cr-accent">
          CoachRedo Trading
        </h2>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          ✓ Accès actif
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Row label="Tier" value={data.accessTier ? TIER_LABELS[data.accessTier] : '—'} />
        <Row
          label="Mode"
          value={data.tradingMode ? MODE_LABELS[data.tradingMode] : 'Non défini'}
        />
        <Row
          label="Discipline Score"
          value={
            data.disciplineScore !== null
              ? <span className={data.disciplineScore >= 85 ? 'text-success font-semibold' : data.disciplineScore < 60 ? 'text-error font-semibold' : ''}>
                  {data.disciplineScore}/100
                </span>
              : '—'
          }
        />
        <Row label="Trades ce mois" value={String(data.tradesThisMonth)} />
        <Row label="Dernière activité" value={fmt(data.lastActiveAt)} />
        <Row
          label="Locks actifs"
          value={
            data.activeLocks.length === 0
              ? <span className="text-success text-xs">Aucun</span>
              : <div className="flex flex-wrap gap-1">
                  {data.activeLocks.map(l => <LockBadge key={l.id} lock={l} />)}
                </div>
          }
        />
      </dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-cr-text-muted mb-0.5">{label}</dt>
      <dd className="text-sm text-cr-text">{value}</dd>
    </div>
  )
}
