// ============================================================
// MPD V3 — Create/resume dossier courant — T7.4B
// ============================================================
// Client authentifié exclusivement (JWT utilisateur, RLS) — jamais
// service_role. SELECT d'abord (gratuit, ne duplique aucune garantie
// DB), RPC mpd_creer_dossier() uniquement si aucun dossier courant
// n'existe déjà. L'atomicité « au plus un dossier courant » reste
// entièrement portée par l'index unique partiel de la migration 013 —
// jamais recréée côté TypeScript (T7.4A §C).

import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type DossierCourant =
  | { readonly dossierId: string; readonly revision: number }
  | { readonly error: string }

export async function getOuCreerDossierCourant(
  supabase: SupabaseServerClient,
  userId: string
): Promise<DossierCourant> {
  const { data: existant, error: erreurSelect } = await supabase
    .from('mpd_dossiers')
    .select('id, revision')
    .eq('user_id', userId)
    .eq('est_courant', true)
    .maybeSingle()

  if (erreurSelect) return { error: 'Erreur lors de la lecture du dossier.' }
  if (existant) return { dossierId: existant.id as string, revision: existant.revision as number }

  const { data, error } = await supabase.rpc('mpd_creer_dossier')
  if (error) return { error: 'Erreur lors de la création du dossier.' }

  if (data?.error === 'dossier_courant_deja_existant') {
    const { data: course, error: erreurCourse } = await supabase
      .from('mpd_dossiers')
      .select('id, revision')
      .eq('user_id', userId)
      .eq('est_courant', true)
      .maybeSingle()

    if (erreurCourse || !course) return { error: 'Dossier introuvable après conflit de création.' }
    return { dossierId: course.id as string, revision: course.revision as number }
  }

  if (data?.error) return { error: 'Erreur lors de la création du dossier.' }

  return { dossierId: data.dossier_id as string, revision: 0 }
}

/** Lecture seule du dossier courant — T7.13. Ne crée JAMAIS de
 * dossier, n'appelle JAMAIS mpd_creer_dossier(), aucun effet de bord.
 * Réservée aux projections d'affichage (ex. dashboard) qui ne doivent
 * jamais produire un dossier MPD par la seule consultation d'un
 * écran. `getOuCreerDossierCourant` ci-dessus reste l'unique autorité
 * pour tout parcours réellement engagé dans /plan-b/** — cette
 * fonction ne la remplace jamais, elle répond à un besoin de lecture
 * distinct et n'est pas partagée avec elle dans cette tranche. */
export async function lireDossierCourant(
  supabase: SupabaseServerClient,
  userId: string
): Promise<{ readonly dossierId: string; readonly revision: number } | null> {
  const { data } = await supabase
    .from('mpd_dossiers')
    .select('id, revision')
    .eq('user_id', userId)
    .eq('est_courant', true)
    .maybeSingle()

  if (!data) return null
  return { dossierId: data.id as string, revision: data.revision as number }
}
