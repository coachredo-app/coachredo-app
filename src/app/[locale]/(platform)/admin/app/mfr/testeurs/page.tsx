// ============================================================
// MFR — Testeurs autorisés (GO QG APP 2026-11-05)
// ============================================================
// Recherche par e-mail réutilisant exactement `service.auth.admin.
// listUsers()` déjà en production ailleurs dans l'admin MFR
// (`admin/app/mfr/page.tsx`) — aucune nouvelle capacité technique.
// Zéro composant client : formulaires HTML natifs (`method="get"` pour
// la recherche, Server Actions directement en `action` pour autoriser/
// retirer) — complexité minimale, cohérente avec le mandat. Le MFR
// reste fermé par défaut pour tout compte absent de la liste
// ci-dessous (`mfr_testeurs_evenements`, 034) — cette page ne fait que
// refléter/modifier cette liste, jamais une seconde autorité d'accès.

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { listerStatutsTesteurs } from '@/lib/mfr/server/testeurs'
import { autoriserTesteurFormAction, retirerTesteurFormAction } from './actions'

interface TesteursMfrPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ email?: string; erreur?: string; succes?: string }>
}

const LIBELLES_ERREUR: Record<string, string> = {
  identifiant_invalide: 'Identifiant invalide.',
  utilisateur_introuvable: 'Utilisateur introuvable.',
  reponse_rpc_invalide: 'Réponse technique invalide — réessaie.',
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function TesteursMfrPage({ params, searchParams }: TesteursMfrPageProps) {
  const { locale } = await params
  const { email: emailRecherche, erreur, succes } = await searchParams

  // 1. Garde admin — identique au reste de /admin/app.
  const supabase = await createClient()
  const { data: { user: admin } } = await supabase.auth.getUser()
  if (!admin || admin.email !== process.env.ADMIN_EMAIL) {
    redirect(`/${locale}/dashboard`)
  }

  const service = createServiceClient()

  const [usersResult, statutsTesteurs] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 1000 }),
    listerStatutsTesteurs(service),
  ])

  const tousLesUtilisateurs = usersResult.data?.users ?? []
  const emailByUserId = new Map(tousLesUtilisateurs.map(u => [u.id, u.email ?? '—']))
  const idsTesteurs = new Set(statutsTesteurs.map(t => t.userId))

  const termeRecherche = emailRecherche?.trim().toLowerCase() ?? ''
  const resultatsRecherche = termeRecherche.length > 0
    ? tousLesUtilisateurs.filter(u => (u.email ?? '').toLowerCase().includes(termeRecherche))
    : []

  const testeursAvecEmail = statutsTesteurs
    .map(t => ({ ...t, email: emailByUserId.get(t.userId) ?? '—' }))
    .sort((a, b) => a.email.localeCompare(b.email))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-cr-text">Testeurs MFR</h1>
        <p className="text-sm text-cr-text-secondary mt-1">
          Ma Feuille de Route reste fermée par défaut pour tout autre compte. Seuls les comptes listés ci-dessous peuvent consulter leur propre MFR une fois publiée. Le Livre, la Carte de parcours et le Point de Départ restent inchangés pour tout le monde.
        </p>
      </div>

      {erreur && (
        <p className="text-sm text-error">{LIBELLES_ERREUR[erreur] ?? `Erreur inattendue (${erreur}).`}</p>
      )}
      {succes === 'autorise' && <p className="text-sm text-green-700">Testeur autorisé.</p>}
      {succes === 'retire' && <p className="text-sm text-green-700">Autorisation retirée.</p>}

      <section className="bg-surface rounded-xl border border-cr-border p-6 space-y-4">
        <h2 className="font-semibold text-cr-text">Rechercher un compte par e-mail</h2>
        <form method="get" className="flex gap-2">
          <input
            type="text"
            name="email"
            defaultValue={emailRecherche ?? ''}
            placeholder="email@exemple.com"
            className="flex-1 rounded-lg border border-cr-border bg-background px-3 py-2 text-sm"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
            Rechercher
          </button>
        </form>

        {termeRecherche.length > 0 && (
          resultatsRecherche.length === 0 ? (
            <p className="text-sm text-cr-text-muted">Aucun compte trouvé pour « {emailRecherche} ».</p>
          ) : (
            <ul className="divide-y divide-cr-border">
              {resultatsRecherche.map(u => (
                <li key={u.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm text-cr-text">{u.email}</span>
                  {idsTesteurs.has(u.id) ? (
                    <span className="text-xs text-cr-text-muted">Déjà testeur</span>
                  ) : (
                    <form action={autoriserTesteurFormAction} className="flex items-center gap-2 flex-wrap">
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <input
                        type="text"
                        name="commentaire"
                        placeholder="Commentaire (optionnel)"
                        className="rounded-lg border border-cr-border bg-background px-2 py-1 text-xs"
                      />
                      <button type="submit" className="px-3 py-1.5 rounded-lg bg-cr-accent text-white text-xs font-medium hover:opacity-90 transition-opacity">
                        Autoriser
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )
        )}
      </section>

      <section className="bg-surface rounded-xl border border-cr-border overflow-hidden">
        <div className="px-6 py-4 border-b border-cr-border">
          <h2 className="font-semibold text-cr-text">Testeurs actuellement autorisés ({testeursAvecEmail.length})</h2>
        </div>
        {testeursAvecEmail.length === 0 ? (
          <p className="px-6 py-4 text-sm text-cr-text-muted">Aucun testeur autorisé pour l&apos;instant — le MFR est fermé pour tous les comptes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cr-border">
                  <th className="text-left px-5 py-3 text-cr-text-secondary font-medium">Compte</th>
                  <th className="text-left px-5 py-3 text-cr-text-secondary font-medium whitespace-nowrap">Autorisé le</th>
                  <th className="text-left px-5 py-3 text-cr-text-secondary font-medium">Commentaire</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cr-border">
                {testeursAvecEmail.map(t => (
                  <tr key={t.userId} className="hover:bg-background transition-colors">
                    <td className="px-5 py-3 font-medium text-cr-text">{t.email}</td>
                    <td className="px-5 py-3 text-cr-text-secondary whitespace-nowrap">{fmt(t.dernierEvenementLe)}</td>
                    <td className="px-5 py-3 text-cr-text-secondary">{t.commentaire ?? '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <form action={retirerTesteurFormAction} className="inline-flex items-center gap-2">
                        <input type="hidden" name="userId" value={t.userId} />
                        <input type="hidden" name="locale" value={locale} />
                        <button type="submit" className="text-xs font-medium text-error hover:underline">
                          Retirer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
