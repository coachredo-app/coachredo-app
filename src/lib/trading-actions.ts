'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkTradingAccess } from './trading-access'
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

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Accès admin requis')
  }
  return createServiceClient()
}

// ─── Activation accès trading ─────────────────────────────────────────────────

export async function activateTradingAccess(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: accessCode, error: codeError } = await supabase
    .from('access_codes')
    .select('code, access_type, used_by')
    .eq('code', code.trim().toUpperCase())
    .eq('access_type', 'trading')
    .single()

  if (codeError || !accessCode) throw new Error('Code invalide ou introuvable')
  if (accessCode.used_by) throw new Error('Ce code a déjà été utilisé')

  const [updateCode] = await Promise.all([
    supabase.from('access_codes').update({
      used_by: user.id,
      used_at: new Date().toISOString(),
    }).eq('code', code),
  ])
  if (updateCode.error) throw updateCode.error

  const { error: accessError } = await supabase
    .from('trading_access')
    .upsert({
      user_id: user.id,
      has_access: true,
      access_tier: 'academy',
      access_granted_at: new Date().toISOString(),
    })
  if (accessError) throw accessError

  revalidatePath('/trading')
  return { success: true }
}

// ─── Mise à jour mode trading (admin) ─────────────────────────────────────────

export async function adminSetTradingMode(userId: string, mode: TraderMode) {
  const service = await requireAdmin()

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
  const service = await requireAdmin()

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
  const service = await requireAdmin()

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
