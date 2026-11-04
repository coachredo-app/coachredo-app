'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminServiceWithUser } from '@/lib/admin'
import { validerVersionMfr, publierVersionMfr, actionsMfrAdminActivees } from '@/lib/mfr/server/validationPublication'
import type { ValiderVersionResultat, PublierVersionResultat } from '@/lib/mfr/server/validationPublication'

// Next.js expose toute fonction exportée d'un fichier 'use server' comme
// un point d'entrée HTTP appelable directement, indépendamment de l'UI
// React — la garde admin ci-dessous doit donc s'exécuter inconditionnellement
// en premier dans CHAQUE fonction exportée, jamais seulement « accessible
// depuis un bouton protégé ».
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `requireAdminServiceWithUser()` capture l'identité serveur réelle de
 * l'admin (jamais une valeur transmise par le client) — c'est elle qui
 * devient `p_operateur_id` dans les deux RPC ci-dessous (027). Si
 * l'appelant n'est pas admin, cette fonction lève — jamais atteint la
 * RPC, jamais une tentative silencieusement ignorée. Exécutée
 * inconditionnellement en premier, avant même la validation de forme
 * des paramètres — un appel direct sans session admin est donc rejeté
 * identiquement, qu'il vienne de l'UI ou d'un appel HTTP direct à cette
 * Server Action.
 */
export async function validerVersion(versionId: string, cycleId: string, locale: string): Promise<ValiderVersionResultat> {
  const { service, adminUserId } = await requireAdminServiceWithUser()

  // Verrou serveur additif (`MFR_ADMIN_ACTIONS_ENABLED`) — fail-closed,
  // vérifié avant tout autre contrôle ou effet de bord. Indépendant du
  // déploiement du code : le bouton peut être présent sans que l'action
  // sous-jacente ne produise jamais d'effet réel tant que la variable
  // n'est pas explicitement `'true'`.
  if (!actionsMfrAdminActivees()) {
    return { statut: 'ERREUR', code: 'fonctionnalite_desactivee' }
  }

  // Forme des identifiants contrôlée avant toute utilisation — jamais
  // une valeur non-UUID transmise telle quelle à la RPC (027 échouerait
  // de façon sûre côté Postgres, mais jamais sur la seule foi de ce
  // comportement en aval : contrôlé explicitement ici).
  if (!UUID_REGEX.test(versionId) || !UUID_REGEX.test(cycleId)) {
    return { statut: 'ERREUR', code: 'identifiant_invalide' }
  }

  const resultat = await validerVersionMfr(service, versionId, cycleId, adminUserId)
  if (resultat.statut === 'OK') {
    revalidatePath(`/${locale}/admin/app/mfr/${cycleId}`)
  }
  return resultat
}

export async function publierVersion(versionId: string, cycleId: string, locale: string): Promise<PublierVersionResultat> {
  const { service, adminUserId } = await requireAdminServiceWithUser()

  if (!actionsMfrAdminActivees()) {
    return { statut: 'ERREUR', code: 'fonctionnalite_desactivee' }
  }

  if (!UUID_REGEX.test(versionId) || !UUID_REGEX.test(cycleId)) {
    return { statut: 'ERREUR', code: 'identifiant_invalide' }
  }

  const resultat = await publierVersionMfr(service, versionId, cycleId, adminUserId)
  if (resultat.statut === 'OK') {
    revalidatePath(`/${locale}/admin/app/mfr/${cycleId}`)
    revalidatePath(`/${locale}/admin/app/mfr`)
  }
  return resultat
}
