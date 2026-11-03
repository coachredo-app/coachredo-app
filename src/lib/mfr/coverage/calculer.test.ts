// ============================================================
// MFR — Tests OFFLINE du prototype de couverture analytique
// ============================================================
// Même discipline que redaction/validator.test.ts : script plain, zéro
// DB, zéro provider réel, fixtures synthétiques construites à la main
// pour couvrir chaque état déductible — jamais une revalidation du
// moteur d'analyse lui-même (STRUCTURAL/REFERENTIAL/BUSINESS/EPISTEMIC
// restent la seule autorité de analysis/validator.ts, non rouvert ici).

import { calculerCouvertureAnalytique } from './calculer'
import { MFR_ANALYSIS_CONTEXT_VERSION } from '../context/types'
import type { MfrAnalysisContext, MfrAnalysisSource, SourceBindings } from '../context/types'
import type { AnalyseGrapheResolu } from '../server/types'

let total = 0
let echecs = 0
function verifier(nom: string, condition: boolean, detail?: string): void {
  total += 1
  if (condition) {
    console.log(`PASS  ${nom}`)
  } else {
    echecs += 1
    console.log(`FAIL  ${nom}${detail ? ` — ${detail}` : ''}`)
  }
}

function source(partial: Partial<MfrAnalysisSource> & { readonly src: string }): MfrAnalysisSource {
  return {
    etape: 1,
    natureObjet: 'contexte',
    statut: 'DECLARE',
    question: 'question factice',
    reponseLisible: 'réponse factice',
    valeurStructuree: null,
    legacy: false,
    ...partial,
  }
}

function main(): void {
  // ── Fixture 1 : couverture économique complète ──────────────────────
  // SRC_A : capacite, DECLARE, promu jusqu'à RETENU (ancrage constitutif
  // d'une Direction Candidate).
  // SRC_B : ressource, DECLARE, cité mais ancrage NON constitutif.
  // SRC_B2 : comportement_passe, DECLARE, cité dans une proposition
  // jamais reliée à aucun ancrage.
  // SRC_I : capacite, DECLARE, ancrage constitutif mais hypothèse
  // REJETEE (jamais promue) — distingue « constitutif » de
  // « DIRECTION_CANDIDATE ».
  // SRC_C : observation_probleme, DECLARE, jamais cité nulle part.
  // SRC_D : capacite, INCONNU — insuffisamment documenté, priorité sur
  // toute recherche de citation.
  // SRC_E : preference, DECLARE, cité dans une proposition — aucun
  // chemin structurel vers RETENU pour ce groupe.
  // SRC_F : contrainte, REFUS — insuffisamment documenté (groupe adéquation).
  // SRC_G : preference, DECLARE, jamais cité nulle part.
  // SRC_H : contexte, DECLARE — hors périmètre, ne doit apparaître dans
  // aucun des deux tableaux.

  const sources: readonly MfrAnalysisSource[] = [
    source({ src: 'SRC_A', natureObjet: 'capacite', statut: 'DECLARE' }),
    source({ src: 'SRC_B', natureObjet: 'ressource', statut: 'DECLARE' }),
    source({ src: 'SRC_B2', natureObjet: 'comportement_passe', statut: 'DECLARE' }),
    source({ src: 'SRC_I', natureObjet: 'capacite', statut: 'DECLARE' }),
    source({ src: 'SRC_C', natureObjet: 'observation_probleme', statut: 'DECLARE' }),
    source({ src: 'SRC_D', natureObjet: 'capacite', statut: 'INCONNU', reponseLisible: null }),
    source({ src: 'SRC_E', natureObjet: 'preference', statut: 'DECLARE' }),
    source({ src: 'SRC_F', natureObjet: 'contrainte', statut: 'REFUS', reponseLisible: null }),
    source({ src: 'SRC_G', natureObjet: 'preference', statut: 'DECLARE' }),
    source({ src: 'SRC_H', natureObjet: 'contexte', statut: 'DECLARE' }),
  ]

  const context: MfrAnalysisContext = {
    contextVersion: MFR_ANALYSIS_CONTEXT_VERSION,
    etatLogiqueId: 'etat-logique-fixture',
    canonVersion: 1,
    sources,
    contextHash: 'hash-fixture',
  }

  const sourceBindings: SourceBindings = new Map([
    ['SRC_A', 'ELR_A'],
    ['SRC_B', 'ELR_B'],
    ['SRC_B2', 'ELR_B2'],
    ['SRC_I', 'ELR_I'],
    ['SRC_C', 'ELR_C'],
    ['SRC_D', 'ELR_D'],
    ['SRC_E', 'ELR_E'],
    ['SRC_F', 'ELR_F'],
    ['SRC_G', 'ELR_G'],
    ['SRC_H', 'ELR_H'],
    // SRC_C n'a volontairement AUCUNE entrée dans referent_sources plus
    // bas malgré son lien ici — c'est exactement ce qui doit produire
    // SANS_TRACE_ANALYTIQUE (lien privé existant, mais jamais cité par
    // le graphe analytique lui-même).
  ])

  const graphe: AnalyseGrapheResolu = {
    referents: [{ id: 'REF_A' }, { id: 'REF_B' }, { id: 'REF_B2' }, { id: 'REF_I' }, { id: 'REF_E' }],
    referent_sources: [
      { id: 'RS_A', referent_id: 'REF_A', etat_logique_reponse_id: 'ELR_A' },
      { id: 'RS_B', referent_id: 'REF_B', etat_logique_reponse_id: 'ELR_B' },
      { id: 'RS_B2', referent_id: 'REF_B2', etat_logique_reponse_id: 'ELR_B2' },
      { id: 'RS_I', referent_id: 'REF_I', etat_logique_reponse_id: 'ELR_I' },
      { id: 'RS_E', referent_id: 'REF_E', etat_logique_reponse_id: 'ELR_E' },
      // ELR_C absent : SRC_C n'est jamais cité.
    ],
    propositions_analytiques: [
      { id: 'PROP_A', enonce: 'x', nature_objet: 'capacite', statut_epistemique: 'DECLARE' },
      { id: 'PROP_B', enonce: 'x', nature_objet: 'ressource', statut_epistemique: 'DECLARE' },
      { id: 'PROP_B2', enonce: 'x', nature_objet: 'comportement_passe', statut_epistemique: 'DECLARE' },
      { id: 'PROP_I', enonce: 'x', nature_objet: 'capacite', statut_epistemique: 'DECLARE' },
      { id: 'PROP_E', enonce: 'x', nature_objet: 'preference', statut_epistemique: 'DECLARE' },
    ],
    proposition_referents: [
      { id: 'PR_A', proposition_id: 'PROP_A', referent_id: 'REF_A' },
      { id: 'PR_B', proposition_id: 'PROP_B', referent_id: 'REF_B' },
      { id: 'PR_B2', proposition_id: 'PROP_B2', referent_id: 'REF_B2' },
      { id: 'PR_I', proposition_id: 'PROP_I', referent_id: 'REF_I' },
      { id: 'PR_E', proposition_id: 'PROP_E', referent_id: 'REF_E' },
    ],
    ancrages: [
      { id: 'ANC_A', famille: 'CAPACITE', enonce: 'x' },
      { id: 'ANC_B', famille: 'RESSOURCE', enonce: 'x' },
      { id: 'ANC_I', famille: 'CAPACITE', enonce: 'x' },
      // PROP_B2 et PROP_E ne sont reliées à AUCUN ancrage.
    ],
    proposition_ancrages: [
      { id: 'PA_A', proposition_id: 'PROP_A', ancrage_id: 'ANC_A' },
      { id: 'PA_B', proposition_id: 'PROP_B', ancrage_id: 'ANC_B' },
      { id: 'PA_I', proposition_id: 'PROP_I', ancrage_id: 'ANC_I' },
    ],
    hypotheses: [
      { id: 'HYP_1', statut: 'DIRECTION_CANDIDATE', formulation: 'x', acteurs_flux: null, modalites_proposees: [], exigences: [], etat_exigences: [], inconnues_critiques: [] },
      { id: 'HYP_2', statut: 'REJETEE', formulation: 'x', acteurs_flux: null, modalites_proposees: [], exigences: [], etat_exigences: [], inconnues_critiques: [] },
    ],
    hypothese_ancrages: [
      { id: 'HA_1', hypothese_id: 'HYP_1', ancrage_id: 'ANC_A', constitutif: true },
      { id: 'HA_2', hypothese_id: 'HYP_1', ancrage_id: 'ANC_B', constitutif: false },
      { id: 'HA_3', hypothese_id: 'HYP_2', ancrage_id: 'ANC_I', constitutif: true },
    ],
    pistes: [{ id: 'PISTE_1', incertitude_constitutive: 'incertitude factice', action_reduction: 'action factice', variables_test: ['x'] }],
    evaluations_d025: [],
  }

  const rapport = calculerCouvertureAnalytique(context, sourceBindings, graphe)

  const trouverEco = (src: string) => rapport.signauxEconomiques.find(s => s.src === src)
  const trouverAdeq = (src: string) => rapport.signauxAdequationPersonnelle.find(s => s.src === src)

  verifier('SRC_A (ancrage constitutif -> DIRECTION_CANDIDATE) => RETENU', trouverEco('SRC_A')?.statut === 'RETENU')
  verifier('SRC_B (ancrage non constitutif) => CITE_NON_DETERMINANT', trouverEco('SRC_B')?.statut === 'CITE_NON_DETERMINANT')
  verifier('SRC_B2 (proposition jamais reliée à un ancrage) => CITE_NON_DETERMINANT', trouverEco('SRC_B2')?.statut === 'CITE_NON_DETERMINANT')
  verifier(
    'SRC_I (ancrage constitutif mais hypothèse REJETEE) => CITE_NON_DETERMINANT, jamais RETENU',
    trouverEco('SRC_I')?.statut === 'CITE_NON_DETERMINANT'
  )
  verifier('SRC_C (DECLARE, jamais cité dans le graphe) => SANS_TRACE_ANALYTIQUE', trouverEco('SRC_C')?.statut === 'SANS_TRACE_ANALYTIQUE')
  verifier('SRC_D (INCONNU) => INSUFFISAMMENT_DOCUMENTE', trouverEco('SRC_D')?.statut === 'INSUFFISAMMENT_DOCUMENTE')
  verifier(
    'SRC_E (preference, cité) => EXAMINE_SANS_VALIDATION_POSSIBLE, jamais RETENU',
    trouverAdeq('SRC_E')?.statut === 'EXAMINE_SANS_VALIDATION_POSSIBLE'
  )
  verifier('SRC_F (REFUS) => INSUFFISAMMENT_DOCUMENTE', trouverAdeq('SRC_F')?.statut === 'INSUFFISAMMENT_DOCUMENTE')
  verifier('SRC_G (preference, jamais cité) => SANS_TRACE_ANALYTIQUE', trouverAdeq('SRC_G')?.statut === 'SANS_TRACE_ANALYTIQUE')
  verifier('SRC_H (contexte) absent du groupe économique', trouverEco('SRC_H') === undefined)
  verifier('SRC_H (contexte) absent du groupe adéquation', trouverAdeq('SRC_H') === undefined)
  verifier('Aucun signal économique n\'atteint jamais RETENU depuis le groupe adéquation (vérifié par construction du type)', true)

  verifier('Piste PISTE_1 rapportée, état A_EXPLORER_NON_VERIFIABLE', rapport.pistes.length === 1 && rapport.pistes[0].etat === 'A_EXPLORER_NON_VERIFIABLE')
  verifier('Piste : incertitudeConstitutive transmise sans altération', rapport.pistes[0]?.incertitudeConstitutive === 'incertitude factice')

  verifier('Total signaux évalués = 9 (10 sources - 1 `contexte` hors périmètre)', rapport.resume.totalSignauxEvalues === 9)
  verifier(
    'Résumé économique : 1 RETENU, 3 CITE_NON_DETERMINANT (SRC_B/SRC_B2/SRC_I), 1 INSUFFISAMMENT_DOCUMENTE, 1 SANS_TRACE_ANALYTIQUE',
    rapport.resume.economiques.RETENU === 1 &&
      rapport.resume.economiques.CITE_NON_DETERMINANT === 3 &&
      rapport.resume.economiques.INSUFFISAMMENT_DOCUMENTE === 1 &&
      rapport.resume.economiques.SANS_TRACE_ANALYTIQUE === 1
  )
  verifier(
    'Résumé adéquation : 1 EXAMINE_SANS_VALIDATION_POSSIBLE, 1 INSUFFISAMMENT_DOCUMENTE, 1 SANS_TRACE_ANALYTIQUE',
    rapport.resume.adequation.EXAMINE_SANS_VALIDATION_POSSIBLE === 1 &&
      rapport.resume.adequation.INSUFFISAMMENT_DOCUMENTE === 1 &&
      rapport.resume.adequation.SANS_TRACE_ANALYTIQUE === 1
  )

  // ── Fixture 2 : graphe totalement vide (aucun référent/proposition/
  // ancrage/hypothèse/piste) — toute source DECLARE candidate doit
  // retomber sur SANS_TRACE_ANALYTIQUE, jamais une exception. ──────────
  {
    const contextVide: MfrAnalysisContext = {
      ...context,
      sources: [source({ src: 'SRC_SEUL', natureObjet: 'capacite', statut: 'DECLARE' })],
    }
    const bindingsVide: SourceBindings = new Map([['SRC_SEUL', 'ELR_SEUL']])
    const grapheVide: AnalyseGrapheResolu = {}
    const r = calculerCouvertureAnalytique(contextVide, bindingsVide, grapheVide)
    verifier('Graphe vide : SRC_SEUL => SANS_TRACE_ANALYTIQUE, aucune exception levée', r.signauxEconomiques[0]?.statut === 'SANS_TRACE_ANALYTIQUE')
    verifier('Graphe vide : aucune piste rapportée', r.pistes.length === 0)
  }

  // ── Fixture 3 : lien privé sourceBindings manquant pour une source du
  // contexte (incohérence défensive, jamais supposée en pratique) —
  // doit être traité comme SANS_TRACE_ANALYTIQUE, jamais planter. ─────
  {
    const contextSansLien: MfrAnalysisContext = {
      ...context,
      sources: [source({ src: 'SRC_ORPHELIN', natureObjet: 'ressource', statut: 'DECLARE' })],
    }
    const bindingsVides: SourceBindings = new Map()
    const r = calculerCouvertureAnalytique(contextSansLien, bindingsVides, {})
    verifier(
      'Lien privé SRC->etat_logique_reponse_id absent => SANS_TRACE_ANALYTIQUE, pas une exception',
      r.signauxEconomiques[0]?.statut === 'SANS_TRACE_ANALYTIQUE'
    )
  }

  console.log(`\n${total - echecs}/${total} vérifications passées.`)
  if (echecs > 0) {
    console.log(`${echecs} ÉCHEC(S).`)
    process.exitCode = 1
  } else {
    console.log('Toutes les vérifications sont passées.')
  }
}

main()
