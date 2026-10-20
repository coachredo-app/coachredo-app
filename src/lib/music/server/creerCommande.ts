// ============================================================
// Music V0 — accès serveur à la RPC de création (LOT 1, D-058)
// ============================================================
// Seule capacité exposée à la route publique : appeler
// `music_creer_commande`. Aucun client Supabase générique n'est exporté ;
// côté base, service_role n'a de toute façon aucun privilège direct sur
// les tables Music (migration 020) — uniquement l'exécution des RPC.

import { createServiceClient } from '@/lib/supabase/server'
import type { CommandeValidee } from '../commande'
import type { ResultatRpcCreation } from '../creationCommande'

export async function creerCommandeMusic(c: CommandeValidee): Promise<ResultatRpcCreation> {
  const { data, error } = await createServiceClient().rpc('music_creer_commande', {
    p_cle_idempotence: c.cleIdempotence,
    p_prenom: c.prenom,
    p_email: c.email,
    p_whatsapp: c.whatsapp,
    p_relation: c.relation,
    p_relation_autre: c.relationAutre,
    p_beneficiaire_prenom: c.beneficiairePrenom,
    p_occasion: c.occasion,
    p_date_souhaitee: c.dateSouhaitee,
  })
  if (error) return { erreur: 'RPC_' + (error.code ?? 'INCONNUE') }

  const r = data as { reference?: unknown; existante?: unknown; error?: unknown } | null
  if (r && typeof r.error === 'string') return { erreur: r.error }
  if (r && typeof r.reference === 'string') return { reference: r.reference, existante: r.existante === true }
  return { erreur: 'REPONSE_INATTENDUE' }
}
