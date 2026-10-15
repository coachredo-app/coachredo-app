// ============================================================
// MFR V1 — Get-or-create cycle — T-MFR.3A
// ============================================================
// Client authentifié exclusivement (JWT utilisateur, auth.uid()
// interne à la RPC) — jamais service_role. Lazy get-or-create au
// premier accès MFR après consommation du snapshot MPD (D-051 §A) —
// jamais appelée avant que l'état « consommé » soit confirmé par
// l'appelant. L'unicité de mfr_cycles.etat_logique_id (016) garantit
// que deux requêtes concurrentes convergent vers le même cycle.

import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type ObtenirOuCreerCycleResultat =
  | { readonly cycleId: string; readonly created: boolean }
  | { readonly error: string }

export async function obtenirOuCreerCycle(
  supabase: SupabaseServerClient,
  etatLogiqueId: string
): Promise<ObtenirOuCreerCycleResultat> {
  const { data, error } = await supabase.rpc('mfr_obtenir_ou_creer_cycle', {
    p_etat_logique_id: etatLogiqueId,
  })

  if (error) return { error: 'Erreur lors de la création du cycle MFR.' }
  if (!data) return { error: 'Erreur lors de la création du cycle MFR.' }
  if (data?.error) return { error: data.error as string }

  return { cycleId: data.cycle_id as string, created: Boolean(data.created) }
}
