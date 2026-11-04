// ============================================================
// MFR — Prototype de contrôle de couverture analytique
// ============================================================
// Prototype local, hors chantier numéroté (GO QG « PROTOTYPE COUVERTURE
// MFR », audit/proposition T-MFR.5B-2c-1 non rouvert). Fonction pure,
// AUCUNE écriture, AUCUN appel IA. Volontairement NON importé par le
// pipeline de production (orchestration/analysis/redaction) : ce
// dossier est isolé, son seul objet est de démontrer la faisabilité du
// calcul avant tout GO d'intégration.
//
// Portée et limites assumées (arbitrage QG, deux ajustements) :
//
// 1. Signaux économiques (preuves de faisabilité/valeur — capacite,
//    comportement_passe, ressource, observation_probleme) vs critères
//    d'adéquation personnelle (preference, contrainte — motivations,
//    contraintes, préférences, conditions indispensables) : deux
//    familles disjointes, jamais mélangées dans un même compteur.
//    `contexte` reste hors périmètre (fond de décor, jamais un signal
//    potentiellement décisif).
//
// 2. Une source citée dans le graphe est une preuve de COUVERTURE
//    STRUCTURELLE uniquement — jamais une validation automatique de la
//    qualité de son interprétation. En particulier :
//    - RETENU signifie « structurellement promu jusqu'à un ancrage
//      constitutif d'une Direction Candidate » — jamais « correctement
//      interprété ». Réservé au groupe économique : le catalogue actuel
//      (families d'ancrage CAPACITE/COMPORTEMENT_PASSE/
//      EXPERIENCE_EXPOSITION/RESSOURCE/ACCES_RELATION/PROBLEME_OBSERVE)
//      n'a aucune famille correspondant à preference/contrainte — ce
//      groupe ne peut donc structurellement jamais atteindre RETENU.
//    - Pour le groupe adéquation personnelle, seule la présence dans
//      une proposition analytique est vérifiable
//      (EXAMINE_SANS_VALIDATION_POSSIBLE) — jamais son influence finale
//      sur une direction, faute de tout champ structuré équivalent
//      dans le contrat actuel (hypothèses : `exigences`/
//      `modalitesProposees`/`acteursFlux` sont du texte libre).
//    - Les Pistes (`PisteResolue.variables_test`) sont également du
//      texte libre, sans aucune référence structurelle à un SRC_xxx
//      dans le schéma actuel. Aucun champ n'est ajouté ici (interdit
//      par le GO) : chaque piste est donc rapportée dans un état
//      séparé et uniforme, « à explorer — non vérifiable », sans
//      jamais affirmer une correspondance (ou son absence) avec un
//      signal donné.

import type { NatureObjet } from '@/lib/mpd/canon'

/** Capacité/comportement passé/ressource/observation — les seules
 * natures pouvant structurellement nourrir un ancrage (D-024/D-028). */
export const NATURES_ECONOMIQUES: readonly NatureObjet[] = ['capacite', 'comportement_passe', 'ressource', 'observation_probleme']

/** Préférence/contrainte — motivations, conditions indispensables :
 * jamais une famille d'ancrage correspondante dans le catalogue actuel. */
export const NATURES_ADEQUATION_PERSONNELLE: readonly NatureObjet[] = ['preference', 'contrainte']

export type StatutCouvertureEconomique = 'RETENU' | 'CITE_NON_DETERMINANT' | 'INSUFFISAMMENT_DOCUMENTE' | 'SANS_TRACE_ANALYTIQUE'

export type StatutCouvertureAdequation = 'EXAMINE_SANS_VALIDATION_POSSIBLE' | 'INSUFFISAMMENT_DOCUMENTE' | 'SANS_TRACE_ANALYTIQUE'

export interface SignalCouvertureEconomique {
  readonly src: string
  readonly natureObjet: NatureObjet
  readonly statut: StatutCouvertureEconomique
  /** UUID résolus impliqués — pour relecture humaine uniquement, jamais
   * pour revalider la sémantique (cf. point 2 ci-dessus). */
  readonly propositionsLiees: readonly string[]
  readonly ancragesLies: readonly string[]
  readonly hypothesesPromouvant: readonly string[]
}

export interface SignalCouvertureAdequation {
  readonly src: string
  readonly natureObjet: NatureObjet
  readonly statut: StatutCouvertureAdequation
  readonly propositionsLiees: readonly string[]
}

export interface PisteNonVerifiable {
  readonly pisteId: string
  readonly incertitudeConstitutive: string
  readonly etat: 'A_EXPLORER_NON_VERIFIABLE'
}

export interface RapportCouvertureAnalytique {
  readonly signauxEconomiques: readonly SignalCouvertureEconomique[]
  readonly signauxAdequationPersonnelle: readonly SignalCouvertureAdequation[]
  readonly pistes: readonly PisteNonVerifiable[]
  readonly resume: {
    readonly totalSignauxEvalues: number
    readonly economiques: Readonly<Record<StatutCouvertureEconomique, number>>
    readonly adequation: Readonly<Record<StatutCouvertureAdequation, number>>
  }
}
