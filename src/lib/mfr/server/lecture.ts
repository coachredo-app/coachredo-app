// ============================================================
// MFR — Lecture authentifiée de la version publiée (T-MFR.5B-3)
// ============================================================
// Client authentifié exclusivement (JWT utilisateur, `auth.uid()`
// interne à la RPC) — jamais `service_role`, même discipline que
// `obtenirOuCreerCycle` (cycle.ts, T-MFR.3A). Appelle la RPC candidate
// `mfr_lire_version_publiee` (supabase/migrations_candidates/, numéro
// réel en attente) — AUCUNE lecture directe de `mfr_versions`/
// `mfr_publications` depuis une page utilisateur, ces tables restant
// RLS fermée sans policy (016/027, inchangé).

import type { createClient } from '@/lib/supabase/server'
import type { ContenuVersion } from '@/lib/mfr/contenu'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type LireVersionPublieeResultat =
  | { readonly statut: 'PUBLIEE'; readonly numeroVersion: number; readonly contenu: ContenuVersion; readonly publieLe: string }
  | { readonly statut: 'AUCUNE_PUBLICATION' }
  | { readonly statut: 'ERREUR'; readonly erreur: string }

/**
 * `aucune_publication` est un état attendu et fréquent (cycle créé,
 * jamais encore publié) — jamais confondu avec une erreur technique.
 * Toute autre réponse de la RPC (non_authentifie, cycle_introuvable,
 * acces_refuse, incoherence_version_publication) ne devrait
 * structurellement jamais survenir en usage normal (la page n'appelle
 * jamais cette fonction avec un autre cycle que celui de l'utilisateur
 * authentifié) — remontée en ERREUR générique, jamais masquée ni
 * réinterprétée côté appelant.
 */
export async function lireVersionPublieeMfr(
  supabase: SupabaseServerClient,
  cycleId: string
): Promise<LireVersionPublieeResultat> {
  const { data, error } = await supabase.rpc('mfr_lire_version_publiee', {
    p_cycle_id: cycleId,
  })

  // Tant que la RPC candidate n'est pas appliquée en base, PostgREST
  // renvoie ici une erreur de fonction introuvable (ex. PGRST202) — ce
  // chemin, jamais `data`, donc jamais confondu avec `aucune_publication`
  // (vérifié explicitement, lecture.test.ts cas 0). La page affiche
  // alors l'état ERREUR, jamais un faux « aucune publication encore ».
  if (error) return { statut: 'ERREUR', erreur: 'Erreur lors de la lecture de la Feuille de Route.' }
  if (!data) return { statut: 'ERREUR', erreur: 'Erreur lors de la lecture de la Feuille de Route.' }

  if (data.error === 'aucune_publication') return { statut: 'AUCUNE_PUBLICATION' }
  if (data.error) return { statut: 'ERREUR', erreur: data.error as string }

  return {
    statut: 'PUBLIEE',
    numeroVersion: data.numeroVersion as number,
    contenu: data.contenu as ContenuVersion,
    publieLe: data.publieLe as string,
  }
}
