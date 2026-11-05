// ============================================================
// MFR — Gestion des comptes testeurs (fermeture par défaut avant ouverture publique)
// ============================================================
// GO QG APP 2026-11-05. Server-only, appelé exclusivement depuis des
// Server Actions admin déjà gardées par `requireAdminServiceWithUser()`
// (jamais un accès direct depuis une page/route grand public — même
// discipline que `retenue.ts`/`curation.ts`). `service_role`
// exclusivement : les deux RPC d'écriture (034) ne sont jamais
// accordées à `authenticated`. Source d'autorité UNIQUE dans Postgres
// (`mfr_testeurs_evenements`, append-only) — ce module ne fait que
// traduire des réponses RPC déjà décidées par la base, jamais une
// seconde logique de statut dupliquée côté TypeScript.

import type { createServiceClient } from '@/lib/supabase/server'

type SupabaseServiceClient = ReturnType<typeof createServiceClient>

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type DecisionTesteurResultat =
  | { readonly ok: true; readonly evenementId: number }
  | { readonly error: string }

async function appellerDecisionTesteur(
  nomRpc: 'mfr_autoriser_testeur' | 'mfr_retirer_testeur',
  service: SupabaseServiceClient,
  userId: string,
  operateurId: string,
  commentaire: string | null
): Promise<DecisionTesteurResultat> {
  if (!UUID_REGEX.test(userId) || !UUID_REGEX.test(operateurId)) {
    return { error: 'identifiant_invalide' }
  }

  const { data, error } = await service.rpc(nomRpc, {
    p_user_id: userId,
    p_operateur_id: operateurId,
    p_commentaire: commentaire,
  })

  if (error) return { error: 'Erreur lors de la mise à jour de l’autorisation testeur.' }

  if (typeof data !== 'object' || data === null) {
    return { error: 'reponse_rpc_invalide' }
  }

  const payload = data as Record<string, unknown>

  if (typeof payload.error === 'string' && payload.error.length > 0) {
    return { error: payload.error }
  }

  // Jamais un faux succès déduit de la seule absence d'un champ
  // `error` — même discipline que `retenirAnalyseSucces` (retenue.ts).
  if (payload.success === true && typeof payload.evenementId === 'number') {
    return { ok: true, evenementId: payload.evenementId }
  }

  return { error: 'reponse_rpc_invalide' }
}

export async function autoriserTesteur(
  service: SupabaseServiceClient,
  userId: string,
  operateurId: string,
  commentaire: string | null
): Promise<DecisionTesteurResultat> {
  return appellerDecisionTesteur('mfr_autoriser_testeur', service, userId, operateurId, commentaire)
}

export async function retirerTesteur(
  service: SupabaseServiceClient,
  userId: string,
  operateurId: string,
  commentaire: string | null
): Promise<DecisionTesteurResultat> {
  return appellerDecisionTesteur('mfr_retirer_testeur', service, userId, operateurId, commentaire)
}

export interface StatutTesteurCourant {
  readonly userId: string
  readonly autorise: boolean
  readonly dernierEvenementLe: string
  readonly dernierActeurAdminId: string
  readonly commentaire: string | null
}

interface LigneEvenementBrute {
  readonly user_id: string
  readonly action: string
  readonly cree_le: string
  readonly acteur_admin_id: string
  readonly commentaire: string | null
}

/**
 * Lecture directe de la table (service_role bypass RLS par
 * construction, zéro policy — même discipline que les autres tables
 * MFR déjà lues ainsi par l'admin, ex. mfr_versions/mfr_publications
 * dans `admin/app/mfr/page.tsx`). Le statut courant par utilisateur est
 * calculé ici en TypeScript par simple parcours ordonné (le tri par
 * `id` croissant est délégué à la requête elle-même, jamais recalculé
 * côté client) — PAS une seconde autorité : cette fonction ne fait que
 * refléter, pour l'affichage admin, exactement ce que `034` a déjà
 * décidé ; `mfr_lire_version_publiee` (033) reste l'unique autorité qui
 * conditionne réellement l'accès.
 */
export async function listerStatutsTesteurs(service: SupabaseServiceClient): Promise<readonly StatutTesteurCourant[]> {
  const { data, error } = await service
    .from('mfr_testeurs_evenements')
    .select('user_id, action, cree_le, acteur_admin_id, commentaire')
    .order('id', { ascending: true })

  if (error || !data) return []

  const dernierParUtilisateur = new Map<string, LigneEvenementBrute>()
  for (const ligne of data as readonly LigneEvenementBrute[]) {
    // Parcours en ordre croissant : chaque nouvelle ligne pour un même
    // user_id écrase la précédente — la dernière écriture gagnante est
    // donc toujours, par construction, l'événement le plus récent.
    dernierParUtilisateur.set(ligne.user_id, ligne)
  }

  return Array.from(dernierParUtilisateur.values())
    .filter(ligne => ligne.action === 'AUTORISE')
    .map(ligne => ({
      userId: ligne.user_id,
      autorise: true,
      dernierEvenementLe: ligne.cree_le,
      dernierActeurAdminId: ligne.acteur_admin_id,
      commentaire: ligne.commentaire,
    }))
}
