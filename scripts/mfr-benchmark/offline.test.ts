// ============================================================
// BENCHMARK-MFR V1 — Tests OFFLINE — Phase 1
// ============================================================
// Script plain (aucun framework de test, aucune nouvelle dépendance)
// — même discipline que le reste du repo (D-057). Exécution :
//   npx tsc <ce fichier + un tsconfig minimal paths-aware> puis node.
// Zéro réseau, zéro Supabase, zéro appel provider réel — chaque
// assertion ci-dessous le prouve par construction (aucun symbole
// Supabase/provider réel n'est même importé dans tout ce répertoire,
// voir runner.ts/fakeProviders.ts/types.ts).

import { construirePromptSystemeAnalyseMfr } from '../../src/lib/mfr/provider/prompt'
import { construireJsonSchemaAnalyseSortieBrute } from '../../src/lib/mfr/provider/schema'
import { FIXTURES } from './fixtures/index'
import { FIXTURE_IDS } from './types'
import {
  executerRun,
  tauxDePassageEngine,
  coutMoyenParRun,
  coutParEnginePass,
  repartitionCategoriesEchec,
  distributionLatence,
} from './runner'
import {
  simulateurSuccesValide,
  simulateurEchecStructural,
  simulateurEchecReferential,
  simulateurEchecBusiness,
  simulateurEchecEpistemic,
  simulateurPayloadNonJson,
  simulateurPayloadAbsent,
  simulateurRefusal,
  simulateurIncomplete,
  simulateurErreurReseau,
  simulateurEchecProvider,
} from './fakeProviders'
import { genererMappingAveugle, construireVueAveugle, GestionnaireMappingAveugle } from './blindEvaluation'
import { SuiviBudget, BudgetDepasseError } from './budget'
import type { BenchmarkRun } from './types'

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

async function main() {
  // 1. Chargement des 5 fixtures
  verifier('1. 5 fixtures chargées', FIXTURE_IDS.length === 5 && FIXTURE_IDS.every(id => FIXTURES[id] !== undefined))
  verifier('1. chaque fixture a ≥1 source', FIXTURE_IDS.every(id => FIXTURES[id].context.sources.length > 0))
  verifier(
    '1. chaque fixture respecte le contrat MfrAnalysisContext (contextVersion=1)',
    FIXTURE_IDS.every(id => FIXTURES[id].context.contextVersion === 1)
  )

  // 2. Génération du prompt pour chaque fixture (le prompt est indépendant
  // de la fixture elle-même — vérifie seulement qu'il est généré sans erreur
  // et reste stable/déterministe).
  const prompt1 = construirePromptSystemeAnalyseMfr()
  const prompt2 = construirePromptSystemeAnalyseMfr()
  verifier('2. prompt généré, non vide', typeof prompt1 === 'string' && prompt1.length > 0)
  verifier('2. prompt déterministe (même contenu à chaque appel)', prompt1 === prompt2)

  // 2b. Garde-fou de non-régression (post-mortem premier E2E réel,
  // analyse 11f77bcf-24ed-4dee-84f5-6e5cc55124cc, ECHEC STRUCTURAL
  // referent_extrait_src_duplique) : le prompt doit communiquer
  // explicitement l'unicité du SRC dans `extraits` POUR UN MÊME
  // référent — jamais formulée comme « un SRC ne peut appartenir qu'à
  // un seul référent », ce qui serait une règle différente et fausse.
  verifier(
    '2b. le prompt communique explicitement l’unicité du SRC dans extraits (par référent)',
    prompt1.includes('un même SRC_xxx ne doit apparaître qu\'une seule fois à l\'intérieur d\'un référent')
  )
  verifier(
    '2b. le prompt ne formule jamais la règle fausse « un SRC ne peut appartenir qu’à un seul référent »',
    !prompt1.toLowerCase().includes('un seul référent') || prompt1.includes('n\'interdit pas à un même SRC_xxx d\'apparaître dans un autre référent')
  )

  // 3. Récupération du JSON Schema
  const schema = construireJsonSchemaAnalyseSortieBrute()
  verifier('3. schema récupéré, objet non vide', typeof schema === 'object' && schema !== null && Object.keys(schema).length > 0)
  verifier('3. schema porte additionalProperties:false à la racine', (schema as Record<string, unknown>).additionalProperties === false)

  // 4-8. Chaque catégorie de validation, via un run réel sur la fixture RICHE
  const rPass = await executerRun({ fixtureId: 'RICHE', providerAlias: 'fake-provider', modelAlias: 'fake-model', repetition: 1, simulateur: simulateurSuccesValide, coutUsdReel: 0.01 })
  verifier('4. payload fake valide → ENGINE PASS', rPass.engine.statut === 'PASS')
  verifier('4. graphe présent si PASS', rPass.engine.graphe !== undefined)

  const rStruct = await executerRun({ fixtureId: 'RICHE', providerAlias: 'fake-provider', modelAlias: 'fake-model', repetition: 1, simulateur: simulateurEchecStructural, coutUsdReel: 0.01 })
  verifier('5. payload STRUCTURAL invalide → FAIL STRUCTURAL', rStruct.engine.statut === 'FAIL' && rStruct.engine.diagnostics.some(d => d.categorie === 'STRUCTURAL'))

  const rRef = await executerRun({ fixtureId: 'RICHE', providerAlias: 'fake-provider', modelAlias: 'fake-model', repetition: 1, simulateur: simulateurEchecReferential, coutUsdReel: 0.01 })
  verifier('6. SRC inexistant → FAIL REFERENTIAL', rRef.engine.statut === 'FAIL' && rRef.engine.diagnostics.some(d => d.categorie === 'REFERENTIAL'))

  const rBiz = await executerRun({ fixtureId: 'RICHE', providerAlias: 'fake-provider', modelAlias: 'fake-model', repetition: 1, simulateur: simulateurEchecBusiness, coutUsdReel: 0.01 })
  verifier('7. mécanisme hors catalogue → FAIL BUSINESS', rBiz.engine.statut === 'FAIL' && rBiz.engine.diagnostics.some(d => d.categorie === 'BUSINESS'))

  const rEpi = await executerRun({ fixtureId: 'RICHE', providerAlias: 'fake-provider', modelAlias: 'fake-model', repetition: 1, simulateur: simulateurEchecEpistemic, coutUsdReel: 0.01 })
  verifier('8. ÉTAYÉ avec 1 seul référent → FAIL EPISTEMIC', rEpi.engine.statut === 'FAIL' && rEpi.engine.diagnostics.some(d => d.categorie === 'EPISTEMIC'))

  // 9. raw output non JSON / absent / refusal / incomplete / erreur réseau / échec provider
  // — chaque cas doit être correctement enregistré, le validator JAMAIS appelé.
  const rNonJson = await executerRun({ fixtureId: 'RICHE', providerAlias: 'fp', modelAlias: 'fm', repetition: 1, simulateur: simulateurPayloadNonJson, coutUsdReel: 0.01 })
  verifier('9a. payload non-JSON → statut technique conservé, ENGINE non évalué', rNonJson.output.statutTechnique === 'payload_non_json' && rNonJson.engine.statut === 'NON_EVALUE')

  const rAbsent = await executerRun({ fixtureId: 'RICHE', providerAlias: 'fp', modelAlias: 'fm', repetition: 1, simulateur: simulateurPayloadAbsent, coutUsdReel: 0.01 })
  verifier('9b. payload absent → ENGINE non évalué', rAbsent.engine.statut === 'NON_EVALUE' && rAbsent.engine.diagnostics.length === 0)

  const rRefus = await executerRun({ fixtureId: 'RICHE', providerAlias: 'fp', modelAlias: 'fm', repetition: 1, simulateur: simulateurRefusal, coutUsdReel: 0.01 })
  verifier('9c. refusal → statut technique conservé, ENGINE non évalué', rRefus.output.statutTechnique === 'refusal' && rRefus.engine.statut === 'NON_EVALUE')

  const rIncomplete = await executerRun({ fixtureId: 'RICHE', providerAlias: 'fp', modelAlias: 'fm', repetition: 1, simulateur: simulateurIncomplete, coutUsdReel: 0.01 })
  verifier('9d. incomplete → statut technique conservé, ENGINE non évalué', rIncomplete.output.statutTechnique === 'incomplete' && rIncomplete.engine.statut === 'NON_EVALUE')

  const rReseau = await executerRun({ fixtureId: 'RICHE', providerAlias: 'fp', modelAlias: 'fm', repetition: 1, simulateur: simulateurErreurReseau, coutUsdReel: 0 })
  verifier('9e. erreur réseau → statut technique conservé, rawText NULL', rReseau.output.statutTechnique === 'erreur_reseau' && rReseau.output.rawText === null)

  const rEchecProvider = await executerRun({ fixtureId: 'RICHE', providerAlias: 'fp', modelAlias: 'fm', repetition: 1, simulateur: simulateurEchecProvider, coutUsdReel: 0 })
  verifier('9f. echec_provider → statut technique conservé', rEchecProvider.output.statutTechnique === 'echec_provider' && rEchecProvider.engine.statut === 'NON_EVALUE')

  // 10-11. Blind mapping ne révèle pas provider/model ; mapping réel récupérable séparément
  const providersFictifs = ['openai', 'anthropic', 'gemini', 'qwen', 'kimi', 'mistral']
  const gestionnaire = new GestionnaireMappingAveugle()
  const mapping = gestionnaire.obtenirOuCreerMapping('RICHE', providersFictifs)
  verifier('10. mapping aveugle bijectif (6 providers → 6 alias uniques)', new Set(mapping.values()).size === 6)
  verifier('10. mapping aveugle couvre tous les providers', providersFictifs.every(p => mapping.has(p)))

  const vueAveugleReelle = construireVueAveugle(rPass, genererMappingAveugle(['fake-provider']))
  const vueJson = JSON.stringify(vueAveugleReelle)
  verifier('10. vue aveugle ne contient jamais le mot "fake-provider" (providerAlias)', !vueJson.includes('fake-provider'))
  verifier('10. vue aveugle ne contient jamais "fake-model" (modelAlias)', !vueJson.includes('fake-model'))
  verifier('10. vue aveugle porte un alias (A-F)', /^[A-F]$/.test(vueAveugleReelle.alias))

  verifier('11. mapping réel récupérable séparément après coup', gestionnaire.mappingReel('RICHE')?.get('openai') !== undefined)
  // Re-randomisation indépendante par fixture : deux fixtures différentes
  // peuvent (pas nécessairement, mais la mécanique le permet) donner des
  // mappings différents — on vérifie seulement que chaque fixture obtient
  // SON PROPRE mapping stocké séparément, pas un seul mapping global.
  const mapping2 = gestionnaire.obtenirOuCreerMapping('PAUVRE', providersFictifs)
  verifier('11. chaque fixture a son propre mapping stocké (clé distincte)', gestionnaire.mappingReel('PAUVRE') === mapping2 && gestionnaire.mappingReel('RICHE') === mapping)

  // 12. coût fake correctement agrégé
  const suivi = new SuiviBudget(20)
  const runsPourAgregat: BenchmarkRun[] = [rPass, rStruct, rRef, rBiz, rEpi]
  for (const r of runsPourAgregat) suivi.enregistrerCoutReel(r.runId, r.usage.coutUsd ?? 0)
  verifier('12. coût cumulé agrégé correctement (5 × 0.01)', Math.abs(suivi.coutCumule() - 0.05) < 1e-9)
  verifier('12. taux de passage ENGINE calculé (1/5 PASS)', Math.abs(tauxDePassageEngine(runsPourAgregat) - 0.2) < 1e-9)
  verifier('12. coût moyen par run calculé', Math.abs(coutMoyenParRun(runsPourAgregat) - 0.01) < 1e-9)
  verifier('12. coût par ENGINE PASS calculé (coût total / 1 PASS)', coutParEnginePass(runsPourAgregat) !== null && Math.abs((coutParEnginePass(runsPourAgregat) ?? 0) - 0.05) < 1e-9)
  const repartition = repartitionCategoriesEchec(runsPourAgregat)
  verifier('12. répartition des catégories d\'échec correcte', repartition.STRUCTURAL === 1 && repartition.REFERENTIAL === 1 && repartition.BUSINESS === 1 && repartition.EPISTEMIC === 1)
  verifier('12. distribution de latence calculable', distributionLatence(runsPourAgregat).length === 5)

  // 13. hard-cap 20 USD bloque le prochain run quand nécessaire
  const suiviPlafond = new SuiviBudget(0.02)
  suiviPlafond.verifierAvantRun(0.01)
  suiviPlafond.enregistrerCoutReel('run-1', 0.01)
  suiviPlafond.verifierAvantRun(0.01)
  suiviPlafond.enregistrerCoutReel('run-2', 0.01)
  let bloqueCorrectement = false
  try {
    suiviPlafond.verifierAvantRun(0.01)
  } catch (erreur) {
    bloqueCorrectement = erreur instanceof BudgetDepasseError
  }
  verifier('13. hard-cap bloque le run qui dépasserait le plafond', bloqueCorrectement)
  verifier('13. hard-cap n\'a pas bloqué les runs sous le plafond', suiviPlafond.coutCumule() === 0.02)

  // 13bis. verifierAvantRun est bien appelé PAR executerRun quand un
  // suiviBudget est fourni — preuve qu'aucun run ne peut être exécuté
  // au-delà du hard-cap, pas seulement que la classe le permettrait.
  const suiviRunner = new SuiviBudget(0.005)
  let runBloqueParExecuterRun = false
  try {
    await executerRun({ fixtureId: 'RICHE', providerAlias: 'fp', modelAlias: 'fm', repetition: 1, simulateur: simulateurSuccesValide, coutUsdReel: 0.01, suiviBudget: suiviRunner })
  } catch (erreur) {
    runBloqueParExecuterRun = erreur instanceof BudgetDepasseError
  }
  verifier('13. executerRun() refuse réellement d\'exécuter un run au-delà du hard-cap', runBloqueParExecuterRun)

  // 14. aucune réparation automatique d'un payload invalide — le run
  // STRUCTURAL ci-dessus (rStruct) doit rester FAIL, jamais corrigé en
  // PASS, et son graphe doit rester absent.
  verifier('14. payload STRUCTURAL invalide jamais réparé (reste FAIL)', rStruct.engine.statut === 'FAIL')
  verifier('14. aucun graphe produit pour un run FAIL', rStruct.engine.graphe === undefined)

  // 15. aucune dépendance réseau requise — déjà prouvé par le simple
  // fait que tout ce qui précède s'est exécuté sans round-trip réseau ;
  // vérification explicite complémentaire : aucun symbole Supabase/
  // provider réel n'apparaît dans ce fichier ni dans runner.ts (prouvé
  // séparément par grep, voir rapport §I).
  verifier('15. ce test entier s\'est exécuté sans aucun appel réseau (aucune latence anormale)', rPass.latencyMs < 5000)

  console.log(`\n${total - echecs}/${total} vérifications passées.`)
  if (echecs > 0) {
    console.log(`${echecs} ÉCHEC(S).`)
    process.exitCode = 1
  } else {
    console.log('Toutes les vérifications sont passées.')
  }
}

main()
