// ============================================================
// MPD V3 — Dérivation pure des états des 7 familles — T7.6B
// ============================================================
// Fonction pure, déterministe, sans I/O, sans dépendance Supabase.
// Dérive deux axes strictement séparés (T7.6A §C, jamais fusionnés) :
//
//   A. le statut utilisateur de chaque famille (D-019 §E, exactement
//      4 valeurs — "verrouillée" n'en est PAS une 5e) ;
//   B. sa propriété interne modifiable/verrouillée (D-019 §D).
//
// Entrées strictement limitées au canon + aux réponses courantes
// ACTIVES (ReponsesParId, déjà défini dans applicabilite.ts) — jamais
// un client Supabase, un dossierId, une revision, l'historique
// (`mpd_historique_evenements`) ou l'état de consommation
// (`mpd_etats_logiques`). Une réponse devenue inactive a, par
// construction, disparu de `reponses` (D-028 pt.4) : elle n'a donc
// structurellement aucune influence ici, sans qu'il soit besoin de la
// lire explicitement pour l'exclure.
//
// La complétude d'une famille utilise l'applicabilité ACTUELLE
// (getApplicableQuestions, réutilisée telle quelle, T7.4B) — jamais
// "toutes les questions physiques du fichier canon" (D-026/D-028 pt.3).
// Le statut utilisateur n'est PAS dérivé directement de E_max : il suit
// une chaîne de "reachability" séquentielle (complétude de la famille
// précédente), plus robuste que E_max seul face à une réponse active
// anormalement présente dans une famille ultérieure alors que la
// chaîne précédente n'est pas complète (T7.6A §D/§8) — dans ce cas
// pathologique, le statut reste A_VENIR tandis que E_max (verrouillage)
// peut refléter la réponse réellement présente : les deux axes sont
// volontairement indépendants.

import type { Etape, QuestionCanonique } from '../canon/types'
import { getApplicableQuestions, type ReponsesParId } from './applicabilite'

export type StatutFamille = 'A_VENIR' | 'A_COMMENCER' | 'EN_COURS' | 'TERMINEE'

export interface EtatFamille {
  readonly etape: Etape
  readonly statut: StatutFamille
  readonly modifiable: boolean
}

const ETAPES: readonly Etape[] = [1, 2, 3, 4, 5, 6, 7]

/** Plus grande étape contenant au moins une réponse active reconnue
 * par le canon (0 si aucune réponse). Ne lit que `reponses` — aucune
 * dépendance à l'historique ou à l'état de consommation. */
function calculerEMax(canon: readonly QuestionCanonique[], reponses: ReponsesParId): number {
  let max = 0
  for (const question of canon) {
    if (question.etape > max && reponses.has(question.stableId)) {
      max = question.etape
    }
  }
  return max
}

export function getFamilyStates(
  canon: readonly QuestionCanonique[],
  reponses: ReponsesParId
): readonly EtatFamille[] {
  const applicables = getApplicableQuestions(canon, reponses)
  const eMax = calculerEMax(canon, reponses)

  const resultat: EtatFamille[] = []
  // F1 toujours atteignable (T7.6A §C) — amorce la chaîne de reachability.
  let precedenteReachableEtComplete: boolean = true

  for (const etape of ETAPES) {
    const applicablesEtape = applicables.filter(q => q.etape === etape)
    const reponduesEtape = applicablesEtape.filter(q => reponses.has(q.stableId))
    const complete: boolean = reponduesEtape.length === applicablesEtape.length
    const reachable: boolean = precedenteReachableEtComplete

    let statut: StatutFamille
    if (!reachable) {
      statut = 'A_VENIR'
    } else if (reponduesEtape.length === 0) {
      statut = 'A_COMMENCER'
    } else if (!complete) {
      statut = 'EN_COURS'
    } else {
      statut = 'TERMINEE'
    }

    resultat.push({
      etape,
      statut,
      modifiable: !(etape < eMax),
    })

    // Propage reachable ET complete — si la chaîne s'est déjà rompue
    // (reachable=false), toute famille suivante reste A_VENIR, même si
    // une réponse anormale y est présente (cas pathologique, T7.6A §8).
    precedenteReachableEtComplete = reachable && complete
  }

  return resultat
}

// ============================================================
// Garde de séquentialité — T7.6C-B
// ============================================================
// Fonction pure distincte de getFamilyStates (laquelle reste
// sémantiquement inchangée) — décide si une écriture pour `question`
// doit être acceptée, selon exactement deux cas (jamais fusionnés,
// T7.6C-A §B/§C, arbitrage G14 verrouillé par le QG) :
//
//   CAS A — une réponse active existe déjà pour cette question
//           (modification rétroactive, D-036) : autorisée si et
//           seulement si sa famille est encore modifiable. Aucune
//           contrainte de position — une famille encore ouverte reste
//           entièrement modifiable question par question (Retour).
//
//   CAS B — aucune réponse active (nouvelle réponse, y compris une
//           ancienne conditionnelle réactivée, D-029) : autorisée si
//           et seulement si sa famille est atteignable (jamais
//           A_VENIR) ET que la question soumise est EXACTEMENT la
//           prochaine question applicable non répondue de l'ordre
//           canonique global (arbitrage G14).
//
// Ne reçoit aucun client Supabase, aucun userId/dossierId, aucune
// lecture d'historique — uniquement des valeurs déjà dérivées par
// l'appelant (familyStates, la question canonique résolue, et l'id de
// la prochaine question légitime déjà calculé via getNextQuestion).
// L'applicabilité actuelle de `question` elle-même n'est PAS revérifiée
// ici — elle reste de la responsabilité du garde existant
// (`applicablesActuelles.some(...)`), exécuté avant cet appel.

export type ErreurSequentialite = 'famille_verrouillee' | 'famille_non_atteignable' | 'position_invalide'

export type ResultatSequentialite =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: ErreurSequentialite }

export function verifierSequentialite(
  familyStates: readonly EtatFamille[],
  question: QuestionCanonique,
  aUneReponseActive: boolean,
  prochaineQuestionLegitimeId: string | null
): ResultatSequentialite {
  const etatFamille = familyStates.find(f => f.etape === question.etape)
  // Garde-fou défensif : les 7 familles sont toujours présentes dans
  // le résultat de getFamilyStates — ne devrait jamais se produire.
  if (!etatFamille) return { ok: false, error: 'famille_non_atteignable' }

  if (aUneReponseActive) {
    return etatFamille.modifiable ? { ok: true } : { ok: false, error: 'famille_verrouillee' }
  }

  if (etatFamille.statut === 'A_VENIR') return { ok: false, error: 'famille_non_atteignable' }
  if (question.stableId !== prochaineQuestionLegitimeId) return { ok: false, error: 'position_invalide' }
  return { ok: true }
}
