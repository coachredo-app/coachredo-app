import { createClient } from '@/lib/supabase/server'
import { getTradingMode } from '@/lib/trading-access'
import { TradingLockOverlay } from '@/components/trading/dashboard/TradingLockOverlay'

interface DashboardPageProps {
  params: Promise<{ locale: string }>
}

export default async function TradingDashboardPage({ params }: DashboardPageProps) {
  await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Mode et lock actif
  const [tradingMode, locksResult] = await Promise.all([
    getTradingMode(user.id),
    supabase
      .from('trading_trading_locks')
      .select('id, lock_type, is_active, locked_at, unlock_at, unlocked_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ])

  const activeLock = locksResult.data
    ? {
        id: locksResult.data.id,
        userId: user.id,
        lockType: locksResult.data.lock_type as 'LossStreak' | 'NewsLock' | 'SessionExit' | 'ManualLock',
        isActive: locksResult.data.is_active,
        lockedAt: locksResult.data.locked_at,
        unlockAt: locksResult.data.unlock_at,
        unlockedAt: locksResult.data.unlocked_at,
      }
    : null

  const modeLabel: Record<string, string> = {
    ELEVE:           'Mode Élève — Observer',
    ANALYSTE:        'Mode Analyste — Apprenti',
    TRADER_ENCADRE:  'Mode Trader Encadré — Exécutant',
    PRO:             'Mode Pro — Discipliné+',
  }

  return (
    <>
      {activeLock && <TradingLockOverlay lock={activeLock} />}

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-cr-text">TradeMentor Pro</h1>
          <p className="text-sm text-cr-text-secondary mt-1">
            {tradingMode ? modeLabel[tradingMode] : 'Bienvenue dans CoachRedo Trading'}
          </p>
        </div>

        {/* Asia Gate Banner */}
        <div
          className="rounded-xl border px-5 py-4 flex items-center gap-3"
          style={{ borderColor: 'var(--color-trading-asia)', backgroundColor: 'rgba(245,158,11,0.08)' }}
        >
          <span className="text-lg">🌏</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-trading-asia)' }}>
              NO CMP ANALYSIS — Asian Session Range requis
            </p>
            <p className="text-xs text-cr-text-muted mt-0.5">
              Saisir le range Asia avant toute analyse CMP
            </p>
          </div>
        </div>

        {/* Cards placeholder — P1/P2 viendront compléter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard
            href="sessions"
            title="Sessions"
            description="Asia · London · New York"
            colorVar="--color-trading-asia"
            locked={!tradingMode || tradingMode === 'ELEVE'}
          />
          <DashboardCard
            href="cmp"
            title="Analyse CMP"
            description="Score · Moteur · Workflow 10 étapes"
            colorVar="--color-trading-london"
            locked={!tradingMode || tradingMode === 'ELEVE'}
          />
          <DashboardCard
            href="discipline"
            title="Discipline"
            description="Score · Locks · Règles"
            colorVar="--color-trading-ready"
            locked={false}
          />
          <DashboardCard
            href="journal"
            title="Journal"
            description="Trades · Analyse · Émotions"
            colorVar="--color-trading-watching"
            locked={false}
          />
          <DashboardCard
            href="academy"
            title="Academy"
            description="Modules de formation"
            colorVar="--color-cr-accent"
            locked={false}
          />
          <DashboardCard
            href="coach"
            title="Coach IA"
            description="Analyse · Questions · Apprentissage"
            colorVar="--color-cr-accent"
            locked={tradingMode === 'ELEVE' || !tradingMode}
          />
        </div>

        {/* Philosophie */}
        <div className="rounded-xl border border-cr-border bg-surface px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-cr-accent mb-2">
            Philosophie CoachRedo Trading
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-cr-text-secondary">
            <span>Processus &gt; Résultat</span>
            <span>Discipline &gt; Profit</span>
            <span>Compréhension &gt; Technique</span>
            <span>Protection &gt; Opportunité</span>
          </div>
        </div>
      </div>
    </>
  )
}

function DashboardCard({
  href,
  title,
  description,
  colorVar,
  locked,
}: {
  href: string
  title: string
  description: string
  colorVar: string
  locked: boolean
}) {
  return (
    <a
      href={locked ? '#' : href}
      className={`block rounded-xl border bg-surface p-5 transition-all ${
        locked
          ? 'opacity-40 cursor-not-allowed border-cr-border'
          : 'border-cr-border hover:border-current hover:shadow-sm'
      }`}
      style={locked ? {} : { borderColor: `var(${colorVar})` }}
      aria-disabled={locked}
    >
      <p className="text-sm font-semibold text-cr-text">{title}</p>
      <p className="text-xs text-cr-text-muted mt-1">{description}</p>
      {locked && (
        <span className="mt-2 inline-flex items-center text-xs text-cr-text-muted">
          🔒 Verrouillé
        </span>
      )}
    </a>
  )
}
