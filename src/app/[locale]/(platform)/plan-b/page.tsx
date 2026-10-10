// ============================================================
// MPD V3 — Hub — T7.7B, révisé T7.7E (navigation MPD/MFR)
// ============================================================
// Écran d'entrée : dérive l'état des 7 familles exclusivement via
// getFamilyStates (progression.ts, T7.6) — aucun recalcul de
// complétude/applicabilité/E_max/séquentialité ici. Le veto global de
// consommation (mpd_etats_logiques) est une donnée DISTINCTE de
// `modifiable`, combinée uniquement au rendu (T7.7B §10) — jamais
// réinjectée dans getFamilyStates lui-même.
//
// Ma Feuille de Route n'est plus un bloc sous la grille (T7.7E) : elle
// vit dans sa propre route (/plan-b/feuille-de-route), accessible via
// PlanBNavigation — jamais une 8e famille, jamais un bloc informatif
// relégué en bas de page.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOuCreerDossierCourant } from '@/lib/mpd/server/dossier'
import { MPD_CANON_V1 } from '@/lib/mpd/canon'
import { getFamilyStates } from '@/lib/mpd/engine/progression'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'
import { FamilyCard } from './FamilyCard'
import { FAMILLES_MPD } from './familles'
import { PlanBNavigation } from './PlanBNavigation'

interface PlanBHubPageProps {
  params: Promise<{ locale: string }>
}

export default async function PlanBHubPage({ params }: PlanBHubPageProps) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const dossier = await getOuCreerDossierCourant(supabase, user.id)

  if ('error' in dossier) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-xl font-bold text-cr-text">Mon Point de Départ</h1>
        <p className="text-sm text-red-600">{dossier.error}</p>
      </div>
    )
  }

  const { data: etatLogique } = await supabase
    .from('mpd_etats_logiques')
    .select('id')
    .eq('dossier_id', dossier.dossierId)
    .limit(1)
    .maybeSingle()

  const consomme = Boolean(etatLogique)

  const { data: reponsesRows } = await supabase
    .from('mpd_reponses_courantes')
    .select('question_id, statut, payload')
    .eq('dossier_id', dossier.dossierId)

  const reponses = new Map<string, ReponseCourante>(
    (reponsesRows ?? []).map(r => [
      r.question_id as string,
      { questionId: r.question_id as string, statut: r.statut as StatutReponse, payload: r.payload },
    ])
  )

  const familyStates = getFamilyStates(MPD_CANON_V1, reponses)
  const nbTerminees = familyStates.filter(f => f.statut === 'TERMINEE').length
  const toutesTerminees = nbTerminees === 7

  // GO QG (D-047) : contrat de responsabilité affiché uniquement quand
  // le dossier n'a réellement encore aucune réponse — dérivé de la
  // même lecture déjà effectuée ci-dessus (reponses), aucune requête ni
  // état persisté supplémentaire, aucun flag « déjà vu ».
  const dossierVide = reponses.size === 0

  return (
    <div className="max-w-4xl space-y-8">
      {/* Navigation principale Plan B — MPD/MFR (T7.7E) : avant tout le
          reste, MFR n'est jamais reléguée sous les familles. */}
      <PlanBNavigation locale={locale} actif="mpd" />

      {/* 1. En-tête Mon Point de Départ + 2. progression globale */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-cr-text">Mon Point de Départ</h1>
          <p className="text-cr-text-secondary mt-1 text-sm">
            {nbTerminees} famille{nbTerminees === 1 ? '' : 's'} sur 7 terminée{nbTerminees === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {familyStates.map(f => (
            <span
              key={f.etape}
              className={`h-2 flex-1 rounded-full ${f.statut === 'TERMINEE' ? 'bg-cr-accent' : 'bg-cr-border'}`}
            />
          ))}
        </div>
      </div>

      {/* GO QG (D-047) : contrat de responsabilité — affiché uniquement
          avant toute réponse, au point d'entrée naturel du MPD. Pas un
          écran bloquant : un bloc informatif parmi d'autres sur le hub. */}
      {dossierVide && (
        <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-3">
          <h2 className="text-sm font-semibold text-cr-text">Avant de commencer</h2>
          <div className="text-sm text-cr-text-secondary space-y-2">
            <p>Mon Point de Départ sert à comprendre ta situation réelle avant de construire ta Feuille de Route.</p>
            <p>
              Prends le temps de répondre avec sincérité et précision. Lorsque tu peux, appuie-toi sur des
              situations concrètes que tu as réellement vécues.
            </p>
            <p>
              Il n’y a pas de réponse à donner pour « faire bonne impression ». Si tu ne sais pas, dis-le
              simplement plutôt que d’inventer une réponse.
            </p>
            <p>
              La responsabilité est partagée : CoachRedo est responsable de poser les bonnes questions et de ne
              pas surinterpréter tes réponses. De ton côté, tu es responsable d’y répondre avec sincérité et
              précision.
            </p>
            <p>Ta Feuille de Route sera construite à partir de ces informations.</p>
          </div>
        </div>
      )}

      {/* 3. Les 7 familles — grille 2 colonnes desktop, 1 colonne mobile,
          même convention lg: que admin/users/[id]. La 7e carte occupe
          naturellement sa propre cellule en fin de grille. */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {familyStates.map(etat => {
          const famille = FAMILLES_MPD.find(f => f.etape === etat.etape)!
          return (
            <FamilyCard
              key={etat.etape}
              numero={etat.etape}
              nom={famille.nom}
              description={famille.description}
              conseil={famille.conseil}
              statut={etat.statut}
              modifiable={etat.modifiable}
              consomme={consomme}
              locale={locale}
            />
          )
        })}
      </section>

      {/* H7 — T7.11 correction navigation : mène vers la page de
          clôture dédiée (/plan-b/cloture), qui seule explique la suite
          et porte le CTA de consommation. Ce bouton n'ouvre que
          /cloture — aucune consommation n'est déclenchée ici. */}
      {toutesTerminees && !consomme && (
        <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-3">
          <p className="text-sm font-medium text-cr-text">Ton Point de Départ est terminé.</p>
          <Link
            href={`/${locale}/plan-b/cloture`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Passer à l’étape suivante →
          </Link>
        </div>
      )}

      {/* T7.11C : jamais silencieux après consommation — état honnête,
          aucun pourcentage, aucune promesse de rapport déjà généré. */}
      {consomme && (
        <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-3">
          <div>
            <p className="text-sm font-medium text-cr-text">Ton Point de Départ est finalisé.</p>
            <p className="text-sm text-cr-text-secondary mt-1">
              Tes réponses sont maintenant prêtes à servir de base à Ta Feuille de Route.
            </p>
          </div>
          <Link
            href={`/${locale}/plan-b/feuille-de-route`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Voir Ma Feuille de Route →
          </Link>
        </div>
      )}
    </div>
  )
}
