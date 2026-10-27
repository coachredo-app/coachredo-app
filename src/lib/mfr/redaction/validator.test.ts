// ============================================================
// MFR V1 — Tests OFFLINE du validateur de rédaction — T-MFR.5A
// ============================================================
// Script plain, même discipline que analysis/validator (via
// offline.test.ts). Zéro DB, zéro provider réel — uniquement la
// fonction pure `validerEtResoudreRedactionSortieBrute`.
//
// Contrat brut mis à jour post-E2E#1 (redaction `8e94d5f0-...`, ECHEC
// conservée intacte en base) : `position` reste un NOMBRE natif (1|2|3,
// inchangé depuis v1 — la tentative de conversion en chaîne a été
// annulée après relecture QG confirmant l'enum numérique supporté) ;
// `sources` des affirmations optionnelles est désormais TOUJOURS un
// tableau (jamais `null`, `[]` = aucune source) — voir
// redactionSchema.ts/types.ts pour le détail de la correction.

import { validerEtResoudreRedactionSortieBrute } from './validator'
import type { HypothesisBindings } from '../context/writingTypes'
import type { MfrWritingContext } from '../context/writingTypes'

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

const IDENTITE = {
  cycleId: 'cycle-1',
  analyseId: 'analyse-1',
  curationId: 'curation-1',
  recommandationConfirmee: true,
}

const CONTEXTE_1_DIRECTION_RECOMMANDEE: MfrWritingContext = {
  contextVersion: 1,
  directions: [
    {
      position: 1,
      formulation: 'Direction de test',
      mecanismes: [{ mecanisme: 'M1', role: 'principal' }],
      evaluationD025: {
        coherenceOk: true,
        compatibiliteOk: true,
        actionnabiliteResultat: 'ACTIONNABLE_MAINTENANT',
        disponibiliteOk: true,
        sortie: 'PRESENTER_MAINTENANT',
        justification: null,
      },
      ancragesConstitutifs: [{ famille: 'CAPACITE', enonce: 'Ancrage test', sources: [{ src: 'SRC_1', extrait: 'Extrait réel.' }] }],
    },
  ],
  recommandationPosition: 1,
}

const BINDINGS_1: HypothesisBindings = new Map([[1, 'hypothese-1']])

const CONTEXTE_0_DIRECTION: MfrWritingContext = { contextVersion: 1, directions: [], recommandationPosition: null }
const BINDINGS_0: HypothesisBindings = new Map()

function payloadValideDirection1(overrides: Record<string, unknown> = {}) {
  return {
    directions: [
      {
        position: 1,
        titre: 'Titre',
        pourquoi: { texte: 'Pourquoi texte', sources: ['SRC_1'] },
        forces: { texte: 'Forces texte', sources: ['SRC_1'] },
        limites: { texte: 'Limites texte', sources: [] as readonly string[] },
        planAction: { texte: 'Plan texte', sources: [] as readonly string[] },
      },
    ],
    aucuneDirectionMessage: null,
    ...overrides,
  }
}

async function main() {
  // 1. Succès strict — un cas pleinement valide.
  {
    const r = validerEtResoudreRedactionSortieBrute(payloadValideDirection1(), CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('1. payload valide → ok:true', r.ok === true)
    if (r.ok) {
      verifier('1. hypotheseId résolu depuis bindings, jamais depuis la sortie', r.contenu.directions[0].hypotheseId === 'hypothese-1')
      verifier('1. estRecommandee calculé depuis le contexte (position recommandée)', r.contenu.directions[0].estRecommandee === true)
      verifier('1. identité (cycle/analyse/curation) reportée telle quelle', r.contenu.cycleId === 'cycle-1' && r.contenu.analyseId === 'analyse-1' && r.contenu.curationId === 'curation-1')
      verifier('1. position résolue en nombre', r.contenu.directions[0].position === 1)
    }
  }

  // 2. Propriété inattendue à la racine → STRUCTURAL, rejeté.
  {
    const r = validerEtResoudreRedactionSortieBrute({ ...payloadValideDirection1(), champIntrus: true }, CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('2. propriété inattendue → rejeté', r.ok === false)
  }

  // 3. `estRecommandee` fourni par le modèle → rejeté (propriété inattendue sur la direction).
  {
    const payload = payloadValideDirection1()
    ;(payload.directions[0] as Record<string, unknown>).estRecommandee = true
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('3. le modèle ne peut pas fournir estRecommandee lui-même → rejeté', r.ok === false)
  }

  // 3b. `position` fournie comme CHAÎNE (contrat intermédiaire rejeté après relecture QG) → rejeté — le contrat exige un nombre.
  {
    const payload = payloadValideDirection1()
    ;(payload.directions[0] as Record<string, unknown>).position = '1'
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('3b. position en chaîne (contrat intermédiaire rejeté) → rejeté', r.ok === false)
  }

  // 4. `pourquoi.sources` vide → STRUCTURAL, rejeté (grounding obligatoire).
  {
    const payload = payloadValideDirection1()
    payload.directions[0].pourquoi = { texte: 'x', sources: [] }
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('4. pourquoi sans source → rejeté', r.ok === false)
  }

  // 5. `forces.sources` vide → rejeté (même règle).
  {
    const payload = payloadValideDirection1()
    payload.directions[0].forces = { texte: 'x', sources: [] }
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('5. forces sans source → rejeté', r.ok === false)
  }

  // 6. `limites.sources: []` → accepté (optionnel, tableau vide = aucune source).
  {
    const r = validerEtResoudreRedactionSortieBrute(payloadValideDirection1(), CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('6. limites sans source (tableau vide) → accepté', r.ok === true)
  }

  // 6b. `limites.sources: null` (ancien contrat v1) → rejeté — le contrat exige désormais toujours un tableau.
  {
    const payload = payloadValideDirection1()
    ;(payload.directions[0].limites as Record<string, unknown>).sources = null
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('6b. sources:null (ancien contrat) → rejeté', r.ok === false)
  }

  // 7. SRC inventé dans `pourquoi` → REFERENTIAL, rejeté.
  {
    const payload = payloadValideDirection1()
    payload.directions[0].pourquoi = { texte: 'x', sources: ['SRC_999_INEXISTANT'] }
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('7. SRC inventé → rejeté', r.ok === false)
  }

  // 8. SRC inventé dans `planAction` (optionnel mais vérifié s'il est présent) → rejeté.
  {
    const payload = payloadValideDirection1()
    payload.directions[0].planAction = { texte: 'x', sources: ['SRC_999_INEXISTANT'] }
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('8. SRC inventé même optionnel → rejeté', r.ok === false)
  }

  // 9. Direction manquante par rapport au contexte → REFERENTIAL, rejeté.
  {
    const r = validerEtResoudreRedactionSortieBrute({ directions: [], aucuneDirectionMessage: null }, CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('9. direction manquante → rejeté', r.ok === false)
  }

  // 10. Direction supplémentaire (position hors contexte) → rejeté.
  {
    const payload = payloadValideDirection1()
    payload.directions.push({
      position: 2,
      titre: 'Intruse',
      pourquoi: { texte: 'x', sources: ['SRC_1'] },
      forces: { texte: 'x', sources: ['SRC_1'] },
      limites: { texte: 'x', sources: [] },
      planAction: { texte: 'x', sources: [] },
    })
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('10. direction supplémentaire hors contexte → rejeté', r.ok === false)
  }

  // 11. Zéro direction : contrat respecté → accepté.
  {
    const payload = { directions: [], aucuneDirectionMessage: { texte: 'Rien de solide aujourd’hui.', sources: [] } }
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_0_DIRECTION, BINDINGS_0, { ...IDENTITE, recommandationConfirmee: false })
    verifier('11. zéro direction avec message → accepté', r.ok === true)
  }

  // 12. Zéro direction mais message manquant → rejeté.
  {
    const payload = { directions: [], aucuneDirectionMessage: null }
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_0_DIRECTION, BINDINGS_0, IDENTITE)
    verifier('12. zéro direction sans message → rejeté', r.ok === false)
  }

  // 13. Directions présentes mais message zéro-direction quand même fourni → rejeté.
  {
    const payload = payloadValideDirection1({ aucuneDirectionMessage: { texte: 'x', sources: [] } })
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_1_DIRECTION_RECOMMANDEE, BINDINGS_1, IDENTITE)
    verifier('13. message zéro-direction interdit si directions non vide → rejeté', r.ok === false)
  }

  // 14. Aucun faux plan d'action possible en zéro direction (structurellement impossible, pas de direction à tester).
  {
    const payload = { directions: [], aucuneDirectionMessage: { texte: 'x', sources: [] } }
    const r = validerEtResoudreRedactionSortieBrute(payload, CONTEXTE_0_DIRECTION, BINDINGS_0, { ...IDENTITE, recommandationConfirmee: false })
    verifier('14. zéro direction → aucun objet direction/planAction dans le résultat', r.ok === true && r.ok && r.contenu.directions.length === 0)
  }

  // 15. Recommandation non confirmée (recommandationPosition=null) → estRecommandee toujours false.
  {
    const contexteSansReco: MfrWritingContext = { ...CONTEXTE_1_DIRECTION_RECOMMANDEE, recommandationPosition: null }
    const r = validerEtResoudreRedactionSortieBrute(payloadValideDirection1(), contexteSansReco, BINDINGS_1, { ...IDENTITE, recommandationConfirmee: false })
    verifier('15. aucune recommandation confirmée → estRecommandee=false', r.ok === true && r.ok && r.contenu.directions[0].estRecommandee === false)
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
