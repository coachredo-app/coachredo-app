// ============================================================
// MFR — Validation et publication (T-MFR.5B-4)
// ============================================================
// Client `service_role` exclusivement (migration 027 : `EXECUTE`
// révoqué pour `anon`/`authenticated`/`public`, accordé uniquement à
// `service_role`) — jamais depuis une page utilisateur, jamais sans
// passer par `requireAdminServiceWithUser()` côté appelant pour obtenir
// `p_operateur_id` (le vrai `auth.users.id` de l'admin authentifié,
// jamais une valeur transmise par le navigateur).
//
// Ces deux fonctions ne font QUE transmettre les codes retournés par
// les RPC (027) — elles ne réinterprètent, ne devinent et ne
// réparent jamais un cas non prévu. L'idempotence (already_valide/
// already_publiee) est déjà entièrement gérée côté moteur (027) :
// cette couche la relaie fidèlement, jamais une seconde logique
// d'idempotence dupliquée ici.

import type { createServiceClient } from '@/lib/supabase/server'

type SupabaseServiceClient = ReturnType<typeof createServiceClient>

/**
 * Verrou serveur additif, indépendant du déploiement du code — les
 * actions de validation/publication restent désactivées tant que cette
 * variable d'environnement n'est pas exactement `'true'`. Fail-closed
 * par défaut : absente, vide, `'false'`, ou toute autre valeur (y
 * compris une casse différente type `'TRUE'`) => désactivé. N'affecte
 * ni les RPC 027 ni la lecture client (033) — un verrou purement
 * applicatif, sans effet sur la base en cas de retour arrière (il
 * suffit de retirer l'appel à `actionsMfrAdminActivees()` ci-dessous).
 */
export function actionsMfrAdminActivees(): boolean {
  return process.env.MFR_ADMIN_ACTIONS_ENABLED === 'true'
}

export type ValiderVersionResultat =
  | { readonly statut: 'OK'; readonly dejaValidee: boolean; readonly valideLe: string }
  | { readonly statut: 'ERREUR'; readonly code: string }

export async function validerVersionMfr(
  service: SupabaseServiceClient,
  versionId: string,
  cycleId: string,
  operateurId: string
): Promise<ValiderVersionResultat> {
  const { data, error } = await service.rpc('mfr_valider_version', {
    p_version_id: versionId,
    p_cycle_id: cycleId,
    p_operateur_id: operateurId,
  })

  if (error || !data) return { statut: 'ERREUR', code: 'erreur_technique' }
  if (data.error) return { statut: 'ERREUR', code: data.error as string }

  return { statut: 'OK', dejaValidee: Boolean(data.already_valide), valideLe: data.valide_le as string }
}

export type PublierVersionResultat =
  | { readonly statut: 'OK'; readonly dejaPubliee: boolean; readonly publicationId: string }
  | { readonly statut: 'ERREUR'; readonly code: string }

export async function publierVersionMfr(
  service: SupabaseServiceClient,
  versionId: string,
  cycleId: string,
  operateurId: string
): Promise<PublierVersionResultat> {
  const { data, error } = await service.rpc('mfr_publier_version', {
    p_version_id: versionId,
    p_cycle_id: cycleId,
    p_operateur_id: operateurId,
  })

  if (error || !data) return { statut: 'ERREUR', code: 'erreur_technique' }
  if (data.error) return { statut: 'ERREUR', code: data.error as string }

  return { statut: 'OK', dejaPubliee: Boolean(data.already_publiee), publicationId: data.publication_id as string }
}

/**
 * Libellés humains — strictement une traduction d'affichage, jamais une
 * seconde source de vérité : chaque code vient exclusivement de la RPC
 * (027). Un code non listé ici affiche son code brut plutôt qu'un
 * message générique qui masquerait une situation non prévue.
 */
export const LIBELLES_ERREUR_VALIDATION_PUBLICATION: Readonly<Record<string, string>> = {
  erreur_technique: 'Erreur technique lors de la communication avec le serveur.',
  identifiant_invalide: 'Identifiant invalide.',
  fonctionnalite_desactivee: 'Cette action est actuellement désactivée.',
  cycle_introuvable: 'Cycle introuvable.',
  version_introuvable_pour_ce_cycle: "Cette version n'appartient pas à ce cycle.",
  cycle_deja_publie: 'Ce cycle est déjà publié — cette version ne peut plus être validée.',
  cycle_deja_publie_autre_version: 'Une autre version de ce cycle est déjà publiée.',
  version_non_validee: 'Cette version doit être validée avant de pouvoir être publiée.',
  aucune_analyse_retenue: 'Aucune analyse retenue pour ce cycle.',
  analyse_retenue_a_change: "L'analyse retenue a changé depuis la rédaction de cette version.",
  aucune_curation: 'Aucune curation trouvée pour ce cycle.',
  curation_non_officielle: "La curation associée à cette version n'est plus la curation officielle.",
  operateur_introuvable: "Identifiant d'opérateur introuvable.",
}
