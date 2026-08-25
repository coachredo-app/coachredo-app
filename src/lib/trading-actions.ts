'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkTradingAccess } from './trading-access'
import { requireAdminService } from '@/lib/admin'
import type { TraderMode } from './trading-types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireTradingUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const hasAccess = await checkTradingAccess(user.id)
  if (!hasAccess) throw new Error('Accès CoachRedo Trading requis')
  return { supabase, user }
}

// ─── Activation accès trading ─────────────────────────────────────────────────

export async function activateTradingAccess(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data, error } = await supabase.rpc('redeem_trading_code', { p_code: code })
  if (error) throw new Error('Erreur serveur.')

  const result = data as { success?: boolean; error?: string } | null
  if (result?.error) throw new Error(result.error)

  revalidatePath('/trading')
  return { success: true }
}

// ─── Mise à jour mode trading (admin) ─────────────────────────────────────────

export async function adminSetTradingMode(userId: string, mode: TraderMode) {
  const service = await requireAdminService()

  const { error } = await service
    .from('profiles')
    .update({ trading_mode: mode })
    .eq('id', userId)
  if (error) throw error

  revalidatePath(`/admin/users/${userId}`)
  return { success: true }
}

// ─── Lock manuel (admin) ──────────────────────────────────────────────────────

export async function adminCreateTradingLock(
  userId: string,
  lockType: 'LossStreak' | 'NewsLock' | 'SessionExit' | 'ManualLock',
  unlockAt?: string
) {
  const service = await requireAdminService()

  const { error } = await service.from('trading_trading_locks').insert({
    user_id: userId,
    lock_type: lockType,
    is_active: true,
    unlock_at: unlockAt ?? null,
  })
  if (error) throw error

  revalidatePath(`/admin/users/${userId}`)
  return { success: true }
}

// ─── Déverrouillage manuel (admin) ────────────────────────────────────────────

export async function adminReleaseTradingLock(lockId: string, userId: string) {
  const service = await requireAdminService()

  const { error } = await service
    .from('trading_trading_locks')
    .update({ is_active: false, unlocked_at: new Date().toISOString() })
    .eq('id', lockId)
  if (error) throw error

  revalidatePath(`/admin/users/${userId}`)
  return { success: true }
}

// ─── Mise à jour activité trading ─────────────────────────────────────────────

export async function updateTradingLastActive() {
  const { supabase, user } = await requireTradingUser()

  const { error } = await supabase
    .from('profiles')
    .update({ trading_last_active_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) throw error
}
