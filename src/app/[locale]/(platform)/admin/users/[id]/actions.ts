'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Non autorisé')
  }
  return createServiceClient()
}

function revalidateFiche(locale: string, userId: string) {
  revalidatePath(`/${locale}/admin/users/${userId}`)
}

export async function addSignal(
  userId: string,
  locale: string,
  data: { categorie: string; signal: string; intensite: string; coach_note?: string }
) {
  const service = await checkAdmin()
  const { error } = await service.from('user_signals').insert({
    user_id: userId,
    categorie: data.categorie,
    signal: data.signal,
    intensite: data.intensite,
    coach_note: data.coach_note || null,
  })
  if (error) throw new Error(error.message)
  revalidateFiche(locale, userId)
}

export async function addJournalEntry(
  userId: string,
  locale: string,
  data: { type: string; contenu: string; resultat?: string }
) {
  const service = await checkAdmin()
  const { error } = await service.from('coach_journal').insert({
    user_id: userId,
    type: data.type,
    contenu: data.contenu,
    resultat: data.resultat || null,
  })
  if (error) throw new Error(error.message)
  revalidateFiche(locale, userId)
}

export async function addMission(
  userId: string,
  locale: string,
  data: { mission: string; coach_note?: string }
) {
  const service = await checkAdmin()
  const { error } = await service.from('user_missions').insert({
    user_id: userId,
    mission: data.mission,
    statut: 'en_cours',
    coach_note: data.coach_note || null,
  })
  if (error) throw new Error(error.message)
  revalidateFiche(locale, userId)
}

export async function updateMissionStatus(
  missionId: string,
  statut: 'en_cours' | 'terminée' | 'abandonnée',
  userId: string,
  locale: string
) {
  const service = await checkAdmin()
  const update: Record<string, unknown> = { statut }
  if (statut === 'terminée') update.completed_at = new Date().toISOString()
  if (statut === 'en_cours') update.completed_at = null
  const { error } = await service.from('user_missions').update(update).eq('id', missionId)
  if (error) throw new Error(error.message)
  revalidateFiche(locale, userId)
}
