// ============================================================
// MPD V3 — Moteur d'applicabilité — T7.4B
// ============================================================
// Calcule, à partir du canon TypeScript (source exclusive, D-029 §F) et
// des réponses réellement persistées, l'ensemble des questions
// applicables et la prochaine question à poser. Aucune logique
// spécifique à une question précise — purement générique sur la
// structure du canon (SOCLE/CONDITIONNELLE/RECUPERATION, triggers
// structurés A7/D-026). Ne travaille que sur des payloads structurés
// réellement persistés, jamais une évaluation sémantique de texte libre.

import type { QuestionCanonique, Trigger, TriggerCondition } from '../canon/types'
import type { ReponseCourante } from '../types-runtime'

export type ReponsesParId = ReadonlyMap<string, ReponseCourante>

function aUneValeurScalaire(payload: unknown): payload is { readonly value: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    !Array.isArray(payload) &&
    typeof (payload as { value?: unknown }).value === 'string'
  )
}

/** Valeur scalaire comparable d'un payload (choix simple) — null si le
 * payload n'a pas cette forme (texte libre, structure composite, etc.). */
function valeurScalaire(payload: unknown): string | null {
  if (typeof payload === 'string') return payload
  if (aUneValeurScalaire(payload)) return payload.value
  return null
}

/** Entrées d'un payload de type liste (multi_selection, texte à
 * cardinalité) — tableau vide si le payload n'a pas cette forme. */
function entrees(payload: unknown): readonly string[] {
  if (Array.isArray(payload)) {
    return payload
      .map(entree => {
        if (typeof entree === 'string') return entree
        if (aUneValeurScalaire(entree)) return entree.value
        return null
      })
      .filter((v): v is string => v !== null)
  }
  const scalaire = valeurScalaire(payload)
  return scalaire !== null ? [scalaire] : []
}

function evaluerCondition(condition: TriggerCondition, reponses: ReponsesParId): boolean {
  const reponse = reponses.get(condition.stableId)
  if (!reponse || reponse.statut !== 'DECLARE') return false

  switch (condition.regle) {
    case 'egal_a': {
      const valeur = valeurScalaire(reponse.payload)
      return valeur !== null && valeur === condition.valeur
    }
    case 'valeur_parmi': {
      const valeur = valeurScalaire(reponse.payload)
      return valeur !== null && condition.valeurs.includes(valeur)
    }
    case 'contient_une_entree_hors': {
      return entrees(reponse.payload).some(v => v !== condition.valeurExclue)
    }
  }
}

function evaluerTrigger(trigger: Trigger, reponses: ReponsesParId): boolean {
  if (trigger.operateur === 'ET') {
    return trigger.conditions.every(condition => evaluerCondition(condition, reponses))
  }
  return trigger.conditions.some(condition => evaluerCondition(condition, reponses))
}

/** Une question SOCLE est toujours applicable. Une question
 * CONDITIONNELLE/RECUPERATION l'est uniquement si son trigger structuré
 * évalue à vrai contre les réponses réellement persistées — jamais sans
 * réponse déclenchante (un trigger sans réponse correspondante évalue
 * toujours à faux). */
export function estApplicable(question: QuestionCanonique, reponses: ReponsesParId): boolean {
  if (question.applicabilite === 'SOCLE') return true
  if (!question.trigger) return false
  return evaluerTrigger(question.trigger, reponses)
}

export function getApplicableQuestions(
  canon: readonly QuestionCanonique[],
  reponses: ReponsesParId
): QuestionCanonique[] {
  return canon
    .filter(question => estApplicable(question, reponses))
    .slice()
    .sort((a, b) => a.ordre - b.ordre)
}

/** Première question applicable (ordre canonique) sans réponse courante
 * — null si toutes les questions applicables sont déjà répondues. */
export function getNextQuestion(
  canon: readonly QuestionCanonique[],
  reponses: ReponsesParId
): QuestionCanonique | null {
  const applicables = getApplicableQuestions(canon, reponses)
  return applicables.find(question => !reponses.has(question.stableId)) ?? null
}
