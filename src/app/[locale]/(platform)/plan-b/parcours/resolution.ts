// ============================================================
// MPD V3 — Résolution de la vue du parcours linéaire — T7.10D
// ============================================================
// Fonction pure (aucun accès DB ici — reçoit `reponses` déjà lues par
// page.tsx), aucune nouvelle logique métier : réutilise exclusivement
// getFamilyStates / getApplicableQuestions / getNextQuestion déjà
// exportés (D-037, T7.4B). N'est PAS une Server Action — pas de
// directive 'use server', pas de frontière réseau, simple module
// serveur importé par page.tsx (et par ParcoursRenderer pour le seul
// helper de formatage de href, sans accès DB).
//
// Les trois paramètres de présentation (q/transition/apres) ne sont
// jamais une autorité d'écriture — chacun est intégralement revalidé
// ici contre l'état réel avant de produire quoi que ce soit. En cas
// d'invalidité, repli silencieux sur la résolution par défaut, jamais
// un crash, jamais un contenu inventé.

import { MPD_CANON_V1, MPD_CANON_PAR_ID, type Etape, type QuestionCanonique } from '@/lib/mpd/canon'
import { estApplicable, getApplicableQuestions, getNextQuestion, type ReponsesParId } from '@/lib/mpd/engine/applicabilite'
import { getFamilyStates, type EtatFamille } from '@/lib/mpd/engine/progression'
import type { ReponseCourante } from '@/lib/mpd/types-runtime'
import { TRANSITIONS_MPD } from './transitions'

export type CibleNavigation =
  | { readonly kind: 'q'; readonly stableId: string }
  | { readonly kind: 'transition'; readonly versEtape: Etape }
  | { readonly kind: 'hub' }
  | { readonly kind: 'parcours' }

export type VueParcours =
  | {
      readonly type: 'question'
      readonly question: QuestionCanonique
      readonly reponseExistante: ReponseCourante | null
      readonly retour: CibleNavigation
    }
  | { readonly type: 'transition'; readonly versEtape: Etape; readonly texte: string; readonly continuer: CibleNavigation }
  | { readonly type: 'termine' }

/** Famille « active » du parcours linéaire — jamais TERMINEE (réservé
 * à D-039, /famille/[etape]) ni A_VENIR (pas encore atteignable). */
function familleEstActive(etat: EtatFamille | undefined): boolean {
  return etat?.statut === 'A_COMMENCER' || etat?.statut === 'EN_COURS'
}

function construireVueQuestion(question: QuestionCanonique, reponses: ReponsesParId): VueParcours {
  const reponseExistante = reponses.get(question.stableId) ?? null
  const applicablesFamille = getApplicableQuestions(MPD_CANON_V1, reponses).filter(q => q.etape === question.etape)
  const precedente = applicablesFamille.filter(q => q.ordre < question.ordre).pop()

  // Retour (GO QG T7.10D §2) : précédente applicable de la même
  // famille (A) ; sinon transition d'entrée si etape>1 (B) ; sinon hub
  // pour la toute première question de F1 (C — hypothèse QG confirmée
  // en T7.10B/C, aucune meilleure solution identifiée).
  const retour: CibleNavigation = precedente
    ? { kind: 'q', stableId: precedente.stableId }
    : question.etape === 1
    ? { kind: 'hub' }
    : { kind: 'transition', versEtape: question.etape }

  return { type: 'question', question, reponseExistante, retour }
}

function construireVueTransition(
  versEtape: Etape,
  familyStates: readonly EtatFamille[],
  reponses: ReponsesParId
): VueParcours {
  const etatDestination = familyStates.find(f => f.etape === versEtape)
  const premiereQuestion = getApplicableQuestions(MPD_CANON_V1, reponses).find(q => q.etape === versEtape)
  const texte = TRANSITIONS_MPD.find(t => t.versEtape === versEtape)?.texte ?? ''

  // GO QG T7.10D §6 — correction explicite : une transition
  // « historique » (famille destination déjà EN_COURS ou TERMINEE,
  // revisitée via Retour) ne doit JAMAIS rouvrir un formulaire de
  // cette famille — seule une transition encore A_COMMENCER (première
  // entrée réelle, pas encore de réponse) mène vers ?q=<première
  // question>. Sinon, Continuer reprend proprement le parcours actif
  // réel via la résolution par défaut — jamais une famille déjà close,
  // jamais D-039 (aucun accès à /famille/[etape] depuis ce chemin).
  const continuer: CibleNavigation =
    etatDestination?.statut === 'A_COMMENCER' && premiereQuestion
      ? { kind: 'q', stableId: premiereQuestion.stableId }
      : { kind: 'parcours' }

  return { type: 'transition', versEtape, texte, continuer }
}

/** `?q=`/`?apres=` partagent la même garde (GO QG T7.10B/C) : la
 * question doit exister, être actuellement applicable, et appartenir
 * à une famille active (A_COMMENCER/EN_COURS) — jamais TERMINEE
 * (D-039) ni A_VENIR. Un stableId forgé/obsolète échoue silencieusement
 * (retourne null), sans jamais faire planter le rendu. */
function pivotValide(
  stableId: string,
  reponses: ReponsesParId,
  familyStates: readonly EtatFamille[]
): QuestionCanonique | null {
  const question = MPD_CANON_PAR_ID.get(stableId)
  if (!question) return null
  if (!estApplicable(question, reponses)) return null
  if (!familleEstActive(familyStates.find(f => f.etape === question.etape))) return null
  return question
}

/**
 * Résolution par défaut (aucun paramètre, ou `apres` validé) — règle A
 * (GO QG T7.10C §4) : une transition n'est affichée automatiquement
 * que si la famille destination est encore A_COMMENCER (zéro réponse,
 * famille atteignable — champ déjà dérivé par getFamilyStates, aucune
 * règle parallèle) — jamais lors d'une reprise dans une famille déjà
 * EN_COURS/TERMINEE. Si un pivot est fourni, cherche d'abord la
 * prochaine question applicable de la MÊME famille strictement après
 * lui dans l'ordre canonique, qu'elle possède déjà une réponse ou non
 * (GO QG T7.10D §3) — jamais `getNextQuestion` global directement,
 * qui téléporterait au-delà de questions déjà répondues.
 */
function resoudreParDefaut(
  pivot: QuestionCanonique | null,
  reponses: ReponsesParId,
  familyStates: readonly EtatFamille[]
): VueParcours {
  if (pivot) {
    const suivanteMemeFamille = getApplicableQuestions(MPD_CANON_V1, reponses).filter(
      q => q.etape === pivot.etape && q.ordre > pivot.ordre
    )[0]
    if (suivanteMemeFamille) return construireVueQuestion(suivanteMemeFamille, reponses)
  }

  const prochaine = getNextQuestion(MPD_CANON_V1, reponses)
  if (!prochaine) return { type: 'termine' }

  const etatDestination = familyStates.find(f => f.etape === prochaine.etape)
  if (prochaine.etape > 1 && etatDestination?.statut === 'A_COMMENCER') {
    return construireVueTransition(prochaine.etape, familyStates, reponses)
  }
  return construireVueQuestion(prochaine, reponses)
}

export function determinerVueParcours(
  reponses: ReponsesParId,
  params: { readonly q?: string; readonly transition?: string; readonly apres?: string }
): VueParcours {
  const familyStates = getFamilyStates(MPD_CANON_V1, reponses)

  if (params.q) {
    const question = pivotValide(params.q, reponses, familyStates)
    if (question) return construireVueQuestion(question, reponses)
  }

  if (params.transition) {
    const n = Number(params.transition)
    if (Number.isInteger(n) && n >= 2 && n <= 7) {
      const etat = familyStates.find(f => f.etape === n)
      // GO QG T7.10C §5/T7.10D §5 : valide dès que la famille est
      // réellement atteinte (statut !== A_VENIR) — EN_COURS et
      // TERMINEE restent des cibles légitimes, ce n'est pas une
      // preuve de « première entrée », seulement une frontière
      // logique de navigation.
      if (etat && etat.statut !== 'A_VENIR') {
        return construireVueTransition(n as Etape, familyStates, reponses)
      }
    }
  }

  const pivotApres = params.apres ? pivotValide(params.apres, reponses, familyStates) : null
  return resoudreParDefaut(pivotApres, reponses, familyStates)
}

/** Formatage pur d'une cible de navigation en href — aucune logique
 * métier, uniquement de la construction de chaîne préfixée par la
 * locale (jamais dans resolution elle-même, locale-agnostique). */
export function hrefDeCible(cible: CibleNavigation, locale: string): string {
  switch (cible.kind) {
    case 'q':
      return `/${locale}/plan-b/parcours?q=${cible.stableId}`
    case 'transition':
      return `/${locale}/plan-b/parcours?transition=${cible.versEtape}`
    case 'hub':
      return `/${locale}/plan-b`
    case 'parcours':
      return `/${locale}/plan-b/parcours`
  }
}
