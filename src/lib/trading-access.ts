import { createClient } from '@/lib/supabase/server'
import type { AccessTier, TraderMode, TradingAdminData } from './trading-types'
import { createServiceClient } from '@/lib/supabase/server'

export async function checkTradingAccess(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('trading_access')
    .select('has_access')
    .eq('user_id', userId)
    .single()
  return data?.has_access === true
}

export async function getTradingAccessTier(userId: string): Promise<AccessTier> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('trading_access')
    .select('access_tier')
    .eq('user_id', userId)
    .single()
  return (data?.access_tier as AccessTier) ?? 'free'
}

export async function getTradingMode(userId: string): Promise<TraderMode | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('trading_mode')
    .eq('id', userId)
    .single()
  return (data?.trading_mode as TraderMode) ?? null
}

// Admin uniquement — utilise le service client
export async function getTradingAdminData(userId: string): Promise<TradingAdminData> {
  const service = createServiceClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [accessResult, profileResult, disciplineResult, tradesResult, locksResult] =
    await Promise.all([
      service
        .from('trading_access')
        .select('has_access, access_tier, access_granted_at')
        .eq('user_id', userId)
        .maybeSingle(),
      service
        .from('profiles')
        .select('trading_mode, trading_level, trading_last_active_at')
        .eq('id', userId)
        .maybeSingle(),
      service
        .from('trading_discipline_scores')
        .select('score')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      service
        .from('trading_trades')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('opened_at', firstOfMonth),
      service
        .from('trading_trading_locks')
        .select('id, lock_type, is_active, locked_at, unlock_at, unlocked_at')
        .eq('user_id', userId)
        .eq('is_active', true),
    ])

  return {
    hasAccess: accessResult.data?.has_access ?? false,
    accessTier: (accessResult.data?.access_tier as AccessTier) ?? null,
    tradingMode: (profileResult.data?.trading_mode as TraderMode) ?? null,
    tradingLevel: profileResult.data?.trading_level ?? null,
    disciplineScore: disciplineResult.data?.score ?? null,
    tradesThisMonth: tradesResult.count ?? 0,
    activeLocks: (locksResult.data ?? []).map(l => ({
      id: l.id,
      userId,
      lockType: l.lock_type as 'LossStreak' | 'NewsLock' | 'SessionExit' | 'ManualLock',
      isActive: l.is_active,
      lockedAt: l.locked_at,
      unlockAt: l.unlock_at,
      unlockedAt: l.unlocked_at,
    })),
    lastActiveAt: profileResult.data?.trading_last_active_at ?? null,
  }
}
