// ============================================================
// MPD V3 — Questionnaire actif — T7.7B (déplacé depuis plan-b/page.tsx)
// réécrit T7.10D (micro-transitions + Retour linéaire minimal, D-036)
// ============================================================
// Autonome : revérifie elle-même auth/dossier/consommation, ne suppose
// jamais que l'utilisateur vient du hub (reprise directe par URL ou
// refresh doit fonctionner identiquement). Aucune écriture n'est
// déclenchée par cette page — mpd_consommer_dossier n'est jamais
// appelée (T7.11, hors périmètre).
//
// T7.10D : trois paramètres de présentation, jamais une autorité
// d'écriture — intégralement redérivés à chaque rendu depuis l'état
// serveur frais par resolution.ts (réutilise exclusivement
// getFamilyStates/getApplicableQuestions/getNextQuestion déjà
// exportés — aucune nouvelle règle métier, aucune nouvelle Server
// Action, aucune nouvelle persistance) :
//   ?q=<stableId>         question précise (Retour intra-famille)
//   ?transition=<etape>   micro-transition d'entrée/de retour
//   ?apres=<stableId>     pivot post-sauvegarde (jamais affiché lui-même)
//
// Les gardes d'écriture D-037 (soumettreReponse, actions.ts) restent
// totalement inchangées et indifférentes à ces paramètres.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOuCreerDossierCourant } from '@/lib/mpd/server/dossier'
import { MPD_CANON_V1 } from '@/lib/mpd/canon'
import { getFamilyStates } from '@/lib/mpd/engine/progression'
import type { ReponseCourante, StatutReponse } from '@/lib/mpd/types-runtime'
import { ParcoursRenderer } from './ParcoursRenderer'
import { determinerVueParcours, hrefDeCible } from './resolution'

interface ParcoursPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; transition?: string; apres?: string }>
}

export default async function ParcoursPage({ params, searchParams }: ParcoursPageProps) {
  const { locale } = await params
  const { q, transition, apres } = await searchParams
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

  // Revérification indépendante (jamais une confiance héritée du hub) :
  // un dossier consommé reste lecture seule, aucune écriture possible.
  const { data: etatLogique } = await supabase
    .from('mpd_etats_logiques')
    .select('id')
    .eq('dossier_id', dossier.dossierId)
    .limit(1)
    .maybeSingle()

  if (etatLogique) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-xl font-bold text-cr-text">Mon Point de Départ</h1>
        <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-3">
          <p className="text-sm text-cr-text">Mon Point de Départ est déjà finalisé.</p>
          <Link href={`/${locale}/plan-b/feuille-de-route`} className="text-sm text-cr-accent font-medium">
            Voir Ma Feuille de Route →
          </Link>
        </div>
      </div>
    )
  }

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

  const vue = determinerVueParcours(reponses, { q, transition, apres })

  // T7.11C : le MPD réellement complet redirige vers la page de
  // clôture dédiée — plus jamais un écran statique ici. La clôture
  // revérifie elle-même tout (auth/dossier/consommation/complétude),
  // jamais une confiance héritée de cette redirection.
  if (vue.type === 'termine') redirect(`/${locale}/plan-b/cloture`)

  // Lot A — même sémantique de progression que le hub (getFamilyStates,
  // réutilisé tel quel), visible pendant tout le parcours linéaire —
  // jamais un X/41 ni un pourcentage.
  const familyStates = getFamilyStates(MPD_CANON_V1, reponses)
  const nbFamillesTerminees = familyStates.filter(f => f.statut === 'TERMINEE').length

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-bold text-cr-text">Mon Point de Départ</h1>

      <div className="space-y-2">
        <p className="text-sm text-cr-text-secondary">
          {nbFamillesTerminees} famille{nbFamillesTerminees === 1 ? '' : 's'} sur 7 terminée
          {nbFamillesTerminees === 1 ? '' : 's'}
        </p>
        <div className="flex gap-1.5" aria-hidden="true">
          {familyStates.map(f => (
            <span
              key={f.etape}
              className={`h-2 flex-1 rounded-full ${f.statut === 'TERMINEE' ? 'bg-cr-accent' : 'bg-cr-border'}`}
            />
          ))}
        </div>
      </div>

      {vue.type === 'transition' && (
        <div className="bg-surface rounded-xl border border-cr-border p-6 space-y-4">
          <p className="text-sm text-cr-text">{vue.texte}</p>
          <div className="flex items-center gap-4">
            <Link
              href={hrefDeCible(vue.continuer, locale)}
              className="px-4 py-2 rounded-lg bg-cr-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Continuer
            </Link>
            <Link href={`/${locale}/plan-b`} className="text-sm text-cr-text-secondary hover:text-cr-text">
              Voir mon parcours
            </Link>
          </div>
        </div>
      )}

      {vue.type === 'question' && (
        <ParcoursRenderer
          key={vue.question.stableId}
          locale={locale}
          dossierId={dossier.dossierId}
          revision={dossier.revision}
          question={vue.question}
          reponseExistante={vue.reponseExistante}
          retourHref={hrefDeCible(vue.retour, locale)}
        />
      )}
    </div>
  )
}
