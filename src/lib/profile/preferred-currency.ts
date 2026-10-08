// ============================================================
// Lecture de profiles.preferred_currency — gestion d'erreur explicite
// ============================================================
// GO QG (validation fonctionnelle post-migrations 014/015) :
// profiles.country et profiles.preferred_currency existent désormais
// réellement (migrations 014/015 exécutées et vérifiées) — le
// traitement transitoire qui distinguait l'erreur Postgres 42703
// (colonne absente, attendue avant migration) de toute autre anomalie
// a été retiré : ce carve-out n'a plus de raison d'être. Toute erreur
// de cette lecture est désormais une anomalie réelle, systématiquement
// journalisée (console.error) — jamais silencieuse. `null` (préférence
// absente) reste un état métier normal et n'est jamais une erreur :
// il n'entre jamais dans cette branche.

import type { createClient } from '@/lib/supabase/server'

export async function lirePreferredCurrency(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from('profiles')
    .select('preferred_currency')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[profile] Lecture preferred_currency inattendue :', error.code, error.message)
    return undefined
  }

  return (data as { preferred_currency?: string } | null)?.preferred_currency ?? undefined
}
