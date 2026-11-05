'use server'

// ============================================================
// MFR — Autorisation/retrait des comptes testeurs (GO QG APP 2026-11-05)
// ============================================================
// Même patron que admin/app/mfr/[cycleId]/actions.ts : la garde admin
// s'exécute inconditionnellement en premier dans CHAQUE fonction
// exportée — un appel direct à cette Server Action, hors de l'UI, est
// donc rejeté identiquement. `requireAdminServiceWithUser()` capture
// l'identité serveur réelle de l'admin (jamais une valeur transmise
// par le client) — c'est elle qui devient `p_operateur_id` (034),
// jamais falsifiable depuis le navigateur. Aucun privilège admin n'est
// jamais accordé au testeur par ces actions — elles ne touchent que
// `mfr_testeurs_evenements`, jamais `profiles.is_admin`/`ADMIN_EMAIL`.
//
// Signature `FormData` directe (pas de wrapper client) : ces fonctions
// servent d'`action` à des formulaires HTML natifs (`<form action=...>`)
// — zéro JavaScript client nécessaire, complexité minimale demandée.
// Le résultat est communiqué par redirection avec un paramètre de
// requête (`?erreur=...`), jamais par un retour de valeur consommé
// côté client (qui exigerait un composant client + hook d'état).

import { redirect } from 'next/navigation'
import { requireAdminServiceWithUser } from '@/lib/admin'
import { autoriserTesteur, retirerTesteur } from '@/lib/mfr/server/testeurs'
import { routing } from '@/lib/i18n/routing'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function lireChamp(formData: FormData, nom: string): string {
  const valeur = formData.get(nom)
  return typeof valeur === 'string' ? valeur : ''
}

/**
 * Revue QG APP 2026-11-05 : le champ caché `locale` venait d'un
 * formulaire HTML, jamais revalidé avant d'être injecté dans l'URL de
 * redirection — un client pouvait transmettre n'importe quelle chaîne.
 * Sans être une faille de sécurité en soi (Server Action déjà gardée
 * par `requireAdminServiceWithUser()` avant même de lire ce champ,
 * redirection relative jamais vers un domaine externe), c'était un
 * manque de robustesse réel. Revalidé contre `routing.locales`
 * (`next-intl`, source unique des locales supportées) — jamais une
 * seconde liste dupliquée ici.
 */
function validerLocale(valeur: string): string {
  return (routing.locales as readonly string[]).includes(valeur) ? valeur : routing.defaultLocale
}

export async function autoriserTesteurFormAction(formData: FormData): Promise<void> {
  const { service, adminUserId } = await requireAdminServiceWithUser()

  const locale = validerLocale(lireChamp(formData, 'locale'))
  const userId = lireChamp(formData, 'userId')
  const commentaire = lireChamp(formData, 'commentaire').trim()

  if (!UUID_REGEX.test(userId)) {
    redirect(`/${locale}/admin/app/mfr/testeurs?erreur=identifiant_invalide`)
  }

  const resultat = await autoriserTesteur(service, userId, adminUserId, commentaire.length > 0 ? commentaire : null)

  if ('error' in resultat) {
    redirect(`/${locale}/admin/app/mfr/testeurs?erreur=${encodeURIComponent(resultat.error)}`)
  }

  redirect(`/${locale}/admin/app/mfr/testeurs?succes=autorise`)
}

export async function retirerTesteurFormAction(formData: FormData): Promise<void> {
  const { service, adminUserId } = await requireAdminServiceWithUser()

  const locale = validerLocale(lireChamp(formData, 'locale'))
  const userId = lireChamp(formData, 'userId')
  const commentaire = lireChamp(formData, 'commentaire').trim()

  if (!UUID_REGEX.test(userId)) {
    redirect(`/${locale}/admin/app/mfr/testeurs?erreur=identifiant_invalide`)
  }

  const resultat = await retirerTesteur(service, userId, adminUserId, commentaire.length > 0 ? commentaire : null)

  if ('error' in resultat) {
    redirect(`/${locale}/admin/app/mfr/testeurs?erreur=${encodeURIComponent(resultat.error)}`)
  }

  redirect(`/${locale}/admin/app/mfr/testeurs?succes=retire`)
}
