'use server'

// ============================================================
// Mini-onboarding profil — pays de résidence
// ============================================================
// GO QG (architecture pays/devise) : Auth OTP → vérification →
// mini-onboarding profil → dashboard. Une seule information demandée
// ici : le pays, sélectionné (jamais saisi librement), stocké en
// ISO 3166-1 alpha-2 dans profiles.country (colonne créée par la
// migration 015, exécutée et vérifiée — CHECK NULL ou ^[A-Z]{2}$). La
// devise préférée dérivée du pays (profiles.preferred_currency,
// migration 014, exécutée et vérifiée) reste une VALEUR INITIALE,
// jamais un verrouillage — l'utilisateur pourra toujours la modifier
// séparément, y compris ponctuellement dans une réponse MPD (ex. Q28)
// sans jamais réécrire cette préférence de profil.
//
// GO QG (état final, validé post-migrations) : UNE SEULE écriture
// cohérente country + preferred_currency. Si elle échoue, une vraie
// erreur est retournée — jamais de nouvelle tentative partielle qui
// masquerait la cause réelle de l'échec.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { estCodePaysValide } from '@/lib/profile/pays'
import { deviseParDefautPourPays } from '@/lib/profile/devise'

export async function enregistrerPays(
  locale: string,
  codePays: string
): Promise<{ readonly error: string } | undefined> {
  if (!estCodePaysValide(codePays)) return { error: 'pays_invalide' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const deviseParDefaut = deviseParDefautPourPays(codePays)

  const { error } = await supabase
    .from('profiles')
    .update({ country: codePays, preferred_currency: deviseParDefaut })
    .eq('id', user.id)

  if (error) return { error: 'enregistrement_echoue' }

  redirect(`/${locale}/dashboard`)
}
