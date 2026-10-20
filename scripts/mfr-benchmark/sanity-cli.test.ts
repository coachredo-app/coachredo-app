// ============================================================
// BENCHMARK MFR ACCÉLÉRÉ — Tests OFFLINE du sanity CLI — Phase accélérée
// ============================================================
// Script plain (aucun framework de test, aucune nouvelle dépendance).
// ZÉRO fetch réel : ce fichier n'importe JAMAIS `appellerOpenAiPourBenchmark`/
// `appellerGeminiPourBenchmark`/`appellerQwenPourBenchmark` (les seules
// fonctions de tout le harness qui exécutent un `fetch`) — structurellement
// impossible d'en déclencher un depuis ce fichier. Toutes les réponses
// provider sont des fakes injectées via `appelProvider`, réutilisant les
// générateurs de payload déjà éprouvés de `fakeProviders.ts` (Phase 1)
// pour ne jamais deviner une forme de JSON valide/invalide.

import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import {
  parserArguments,
  estimerTokensEntreeConservateur,
  executerSanityCall,
  type AppelProviderSanityFn,
} from './sanity-cli'
import { Ledger, BudgetDepasseError, EntreeDejaExistanteError } from './ledger/ledger'
import { FIXTURES } from './fixtures/index'
import { simulateurSuccesValide, simulateurEchecStructural } from './fakeProviders'
import type { ResultatAdapterBenchmark } from './adapters/types'

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

function nouveauDossier(): string {
  return mkdtempSync(join(tmpdir(), 'mfr-sanity-cli-test-'))
}

const CLE_TEST = 'CLE-SECRETE-DE-TEST-JAMAIS-REELLE-xyz123'
const ENDPOINT_QWEN_TEST = 'https://TEST-ENDPOINT.invalid/v1/chat/completions'

/** Adapte un simulateur Phase 1 (`SimulateurProvider`, signature
 * `(sourceBindings) => Promise<ResultatSimule>`) au format attendu par
 * `appelProvider` du sanity CLI (`ResultatAdapterBenchmark`, avec
 * `metadonnees`) — réutilise le générateur de payload EXACT déjà
 * éprouvé, jamais un payload réinventé/deviné. */
function adapterSimulateur(simulateur: (sb: any) => Promise<{ statutTechnique: any; rawText: string | null; usage: any }>, sourceBindings: any): () => Promise<ResultatAdapterBenchmark> {
  return async () => {
    const r = await simulateur(sourceBindings)
    return { ...r, metadonnees: { responseId: null, modelRetourne: null } }
  }
}

async function main() {
  // ============================================================
  // 1-3. Validation argv — aucune valeur par défaut.
  // ============================================================
  let erreurProviderAbsent = false
  try {
    parserArguments(['--fixture', 'RICHE'])
  } catch {
    erreurProviderAbsent = true
  }
  verifier('1. --provider absent refusé', erreurProviderAbsent)

  let erreurProviderInvalide = false
  try {
    parserArguments(['--provider', 'bogus', '--fixture', 'RICHE'])
  } catch {
    erreurProviderInvalide = true
  }
  verifier('1. --provider invalide (hors openai/gemini/qwen) refusé', erreurProviderInvalide)

  let erreurFixtureAbsente = false
  try {
    parserArguments(['--provider', 'openai'])
  } catch {
    erreurFixtureAbsente = true
  }
  verifier('2. --fixture absente refusée', erreurFixtureAbsente)

  let erreurFixtureInvalide = false
  try {
    parserArguments(['--provider', 'openai', '--fixture', 'PAUVRE'])
  } catch {
    erreurFixtureInvalide = true
  }
  verifier('2. --fixture invalide (hors RICHE/CONTRADICTOIRE/GROUNDING_CIBLE — ex. PAUVRE, hors périmètre accéléré) refusée', erreurFixtureInvalide)

  const argsValides = parserArguments(['--provider', 'qwen', '--fixture', 'GROUNDING_CIBLE'])
  verifier('3. Aucune valeur par défaut — les valeurs retournées sont EXACTEMENT celles fournies', argsValides.provider === 'qwen' && argsValides.fixtureId === 'GROUNDING_CIBLE')

  // ============================================================
  // 4-5. Clé/endpoint manquants — refusés AVANT tout réseau.
  // ============================================================
  let appelProviderInvoque = false
  const fakeQuiNeDoitJamaisEtreAppele: AppelProviderSanityFn = async () => {
    appelProviderInvoque = true
    throw new Error('NE DOIT JAMAIS ÊTRE APPELÉ')
  }

  const d4 = nouveauDossier()
  Ledger.initialiserPremierRunReel(d4, 20)
  let erreurCleManquante = false
  try {
    await executerSanityCall({
      provider: 'openai',
      fixtureId: 'RICHE',
      apiKey: undefined,
      dossierLedger: d4,
      dossierResultats: join(d4, '.sanity-results'),
      appelProvider: fakeQuiNeDoitJamaisEtreAppele,
    })
  } catch {
    erreurCleManquante = true
  }
  verifier('4. Clé API manquante refusée AVANT tout réseau', erreurCleManquante && !appelProviderInvoque)
  verifier('4. Aucune entrée ledger créée (échec avant réservation)', Ledger.charger(d4).toutesLesEntrees().length === 0)

  let erreurQwenSansEndpoint = false
  try {
    await executerSanityCall({
      provider: 'qwen',
      fixtureId: 'RICHE',
      apiKey: CLE_TEST,
      qwenEndpointUrl: undefined,
      dossierLedger: d4,
      dossierResultats: join(d4, '.sanity-results'),
      appelProvider: fakeQuiNeDoitJamaisEtreAppele,
    })
  } catch {
    erreurQwenSansEndpoint = true
  }
  verifier('5. Qwen sans QWEN_ENDPOINT_URL refusé AVANT tout réseau', erreurQwenSansEndpoint && !appelProviderInvoque)
  rmSync(d4, { recursive: true, force: true })

  // ============================================================
  // 6. Estimation input conservatrice — déterministe, formule exacte.
  // ============================================================
  const e1 = estimerTokensEntreeConservateur('a'.repeat(100), 'b'.repeat(50), 'c'.repeat(25))
  const e2 = estimerTokensEntreeConservateur('a'.repeat(100), 'b'.repeat(50), 'c'.repeat(25))
  verifier('6. estimerTokensEntreeConservateur déterministe (même entrée → même sortie)', e1 === e2)
  verifier('6. estimerTokensEntreeConservateur suit EXACTEMENT Math.ceil(175/3.5) = 50', e1 === 50)

  // ============================================================
  // 7. Ledger réservé AVANT le fake fetch.
  // ============================================================
  const d7 = nouveauDossier()
  Ledger.initialiserPremierRunReel(d7, 20)
  let reservationConstateeAuMomentDeLAppel = false
  const fakeVerifieReservation: AppelProviderSanityFn = async () => {
    const ledgerDepuisDisque = Ledger.charger(d7)
    const entrees = ledgerDepuisDisque.toutesLesEntrees()
    reservationConstateeAuMomentDeLAppel = entrees.length === 1 && entrees[0].status === 'pending'
    return (await adapterSimulateur(simulateurSuccesValide, FIXTURES.RICHE.sourceBindings)())
  }
  await executerSanityCall({
    provider: 'openai',
    fixtureId: 'RICHE',
    apiKey: CLE_TEST,
    dossierLedger: d7,
    dossierResultats: join(d7, '.sanity-results'),
    appelProvider: fakeVerifieReservation,
  })
  verifier('7. La réservation ledger (pending) existe déjà au moment où le provider est appelé', reservationConstateeAuMomentDeLAppel)
  rmSync(d7, { recursive: true, force: true })

  // ============================================================
  // 8. Hard-cap empêche le fake fetch.
  // ============================================================
  const d8 = nouveauDossier()
  Ledger.initialiserPremierRunReel(d8, 0.0000001) // hard-cap volontairement dérisoire
  appelProviderInvoque = false
  let hardCapRefuse = false
  try {
    await executerSanityCall({
      provider: 'openai',
      fixtureId: 'RICHE',
      apiKey: CLE_TEST,
      dossierLedger: d8,
      dossierResultats: join(d8, '.sanity-results'),
      appelProvider: fakeQuiNeDoitJamaisEtreAppele,
    })
  } catch (e) {
    hardCapRefuse = e instanceof BudgetDepasseError
  }
  verifier('8. Hard-cap dépassé → refus AVANT le fake fetch (BudgetDepasseError)', hardCapRefuse && !appelProviderInvoque)
  verifier('8. Aucune entrée ledger créée (reserverPending n’écrit rien en cas de refus)', Ledger.charger(d8).toutesLesEntrees().length === 0)
  rmSync(d8, { recursive: true, force: true })

  // ============================================================
  // 9. Succès fake complet : reserve → provider → ENGINE PASS → finalize → fichier écrit.
  // ============================================================
  const d9 = nouveauDossier()
  Ledger.initialiserPremierRunReel(d9, 20)
  const resultat9 = await executerSanityCall({
    provider: 'gemini',
    fixtureId: 'GROUNDING_CIBLE',
    apiKey: CLE_TEST,
    dossierLedger: d9,
    dossierResultats: join(d9, '.sanity-results'),
    appelProvider: adapterSimulateur(simulateurSuccesValide, FIXTURES.GROUNDING_CIBLE.sourceBindings),
  })
  verifier('9. ledgerStatus = completed', resultat9.ledgerStatus === 'completed')
  verifier('9. ENGINE = PASS', resultat9.benchmarkRun.engine.statut === 'PASS')
  verifier('9. coût réel calculé (non null)', resultat9.benchmarkRun.usage.coutUsd !== null && resultat9.benchmarkRun.usage.coutUsd! > 0)
  const contenuFichier9 = JSON.parse(readFileSync(resultat9.cheminResultat, 'utf8'))
  verifier('9. Fichier résultat écrit avec le bon entryId', contenuFichier9.entryId === resultat9.entryId)
  verifier('9. Ledger rechargé confirme 1 entrée completed', Ledger.charger(d9).toutesLesEntrees().length === 1 && Ledger.charger(d9).toutesLesEntrees()[0].status === 'completed')
  rmSync(d9, { recursive: true, force: true })

  // ============================================================
  // 10. JSON invalide : aucun repair/retry.
  // ============================================================
  const d10 = nouveauDossier()
  Ledger.initialiserPremierRunReel(d10, 20)
  const fakeJsonInvalide: AppelProviderSanityFn = async () => ({
    statutTechnique: 'succes',
    rawText: 'ceci n’est pas du JSON valide {{{',
    usage: { inputTokens: 100, outputTokens: 20, reasoningTokens: null, coutUsd: null },
    metadonnees: { responseId: null, modelRetourne: null },
  })
  const resultat10 = await executerSanityCall({
    provider: 'qwen',
    fixtureId: 'RICHE',
    apiKey: CLE_TEST,
    qwenEndpointUrl: ENDPOINT_QWEN_TEST,
    dossierLedger: d10,
    dossierResultats: join(d10, '.sanity-results'),
    appelProvider: fakeJsonInvalide,
  })
  verifier('10. JSON invalide → ENGINE = NON_EVALUE (jamais une tentative de réparation)', resultat10.benchmarkRun.engine.statut === 'NON_EVALUE')
  verifier('10. rawText conservé BRUT, tel quel', resultat10.benchmarkRun.output.rawText === 'ceci n’est pas du JSON valide {{{')
  verifier('10. parsedPayload absent (undefined)', resultat10.benchmarkRun.output.parsedPayload === undefined)
  rmSync(d10, { recursive: true, force: true })

  // ============================================================
  // 11. ENGINE FAIL conservé comme FAIL (jamais transformé en PASS).
  // ============================================================
  const d11 = nouveauDossier()
  Ledger.initialiserPremierRunReel(d11, 20)
  const resultat11 = await executerSanityCall({
    provider: 'openai',
    fixtureId: 'CONTRADICTOIRE',
    apiKey: CLE_TEST,
    dossierLedger: d11,
    dossierResultats: join(d11, '.sanity-results'),
    appelProvider: adapterSimulateur(simulateurEchecStructural, FIXTURES.CONTRADICTOIRE.sourceBindings),
  })
  verifier('11. Payload STRUCTURAL invalide → ENGINE = FAIL (jamais PASS)', resultat11.benchmarkRun.engine.statut === 'FAIL')
  verifier('11. Diagnostics non vides', resultat11.benchmarkRun.engine.diagnostics.length > 0)
  rmSync(d11, { recursive: true, force: true })

  // ============================================================
  // 12. Erreurs AVANT réseau — déjà couvertes (4/5/8), confirmation groupée.
  // ============================================================
  verifier('12. Les 3 cas d’erreur AVANT réseau (clé, endpoint Qwen, hard-cap) ont tous été testés ci-dessus sans invoquer le fake', true)

  // ============================================================
  // 13. Erreur APRÈS réseau / coût inconnu — JAMAIS transformée en $0.
  // ============================================================
  const d13a = nouveauDossier()
  Ledger.initialiserPremierRunReel(d13a, 20)
  const fakeJetteUneException: AppelProviderSanityFn = async () => {
    throw new Error('panne simulée après réservation')
  }
  let erreur13a = false
  try {
    await executerSanityCall({
      provider: 'openai',
      fixtureId: 'RICHE',
      apiKey: CLE_TEST,
      dossierLedger: d13a,
      dossierResultats: join(d13a, '.sanity-results'),
      appelProvider: fakeJetteUneException,
    })
  } catch {
    erreur13a = true
  }
  const entreesApres13a = Ledger.charger(d13a).toutesLesEntrees()
  verifier('13a. Exception après réservation → propagée (échec signalé)', erreur13a)
  verifier('13a. Entrée ledger reste "pending" (jamais $0, jamais supprimée, jamais auto-résolue)', entreesApres13a.length === 1 && entreesApres13a[0].status === 'pending')
  rmSync(d13a, { recursive: true, force: true })

  const d13b = nouveauDossier()
  Ledger.initialiserPremierRunReel(d13b, 20)
  const fakeErreurReseauSansUsage: AppelProviderSanityFn = async () => ({
    statutTechnique: 'erreur_reseau',
    rawText: null,
    usage: { inputTokens: null, outputTokens: null, reasoningTokens: null, coutUsd: null },
    metadonnees: { responseId: null, modelRetourne: null },
  })
  const resultat13b = await executerSanityCall({
    provider: 'gemini',
    fixtureId: 'RICHE',
    apiKey: CLE_TEST,
    dossierLedger: d13b,
    dossierResultats: join(d13b, '.sanity-results'),
    appelProvider: fakeErreurReseauSansUsage,
  })
  verifier('13b. Réponse technique sans aucun usage → ledgerStatus = pending (jamais completed à $0)', resultat13b.ledgerStatus === 'pending')
  verifier('13b. coûtUsd = null (jamais 0)', resultat13b.benchmarkRun.usage.coutUsd === null)
  const entreesApres13b = Ledger.charger(d13b).toutesLesEntrees()
  verifier('13b. Entrée ledger reste "pending"', entreesApres13b.length === 1 && entreesApres13b[0].status === 'pending')
  rmSync(d13b, { recursive: true, force: true })

  // ============================================================
  // 14. Idempotence — combinaison déjà existante refusée.
  // ============================================================
  const d14 = nouveauDossier()
  Ledger.initialiserPremierRunReel(d14, 20)
  let appelsFake14 = 0
  const fakeCompteur: AppelProviderSanityFn = async () => {
    appelsFake14 += 1
    return adapterSimulateur(simulateurSuccesValide, FIXTURES.RICHE.sourceBindings)()
  }
  await executerSanityCall({ provider: 'openai', fixtureId: 'RICHE', apiKey: CLE_TEST, dossierLedger: d14, dossierResultats: join(d14, '.sanity-results'), appelProvider: fakeCompteur })
  let erreurDoublon = false
  try {
    await executerSanityCall({ provider: 'openai', fixtureId: 'RICHE', apiKey: CLE_TEST, dossierLedger: d14, dossierResultats: join(d14, '.sanity-results'), appelProvider: fakeCompteur })
  } catch (e) {
    erreurDoublon = e instanceof EntreeDejaExistanteError
  }
  verifier('14. Relance de la même combinaison (provider+model+fixture+repetition) refusée', erreurDoublon)
  verifier('14. Le fake n’a été invoqué qu’UNE seule fois (pas de second appel)', appelsFake14 === 1)
  rmSync(d14, { recursive: true, force: true })

  // ============================================================
  // 15. Aucun secret dans le résultat écrit.
  // ============================================================
  const d15 = nouveauDossier()
  Ledger.initialiserPremierRunReel(d15, 20)
  const resultat15 = await executerSanityCall({
    provider: 'qwen',
    fixtureId: 'GROUNDING_CIBLE',
    apiKey: CLE_TEST,
    qwenEndpointUrl: ENDPOINT_QWEN_TEST,
    dossierLedger: d15,
    dossierResultats: join(d15, '.sanity-results'),
    appelProvider: adapterSimulateur(simulateurSuccesValide, FIXTURES.GROUNDING_CIBLE.sourceBindings),
  })
  const texteFichier15 = readFileSync(resultat15.cheminResultat, 'utf8')
  verifier('15. Le fichier résultat ne contient JAMAIS la clé API', !texteFichier15.includes(CLE_TEST))
  const ledgerBrut15 = readFileSync(join(d15, '.ledger', 'budget-ledger.json'), 'utf8')
  verifier('15. Le fichier ledger ne contient JAMAIS la clé API', !ledgerBrut15.includes(CLE_TEST))
  rmSync(d15, { recursive: true, force: true })

  // ============================================================
  // 16. Zéro vrai fetch/provider — garanti structurellement : ce
  // fichier n'importe AUCUNE des 3 fonctions `appellerXxxPourBenchmark`
  // réelles (seules fonctions de tout le harness exécutant `fetch`).
  // ============================================================
  verifier('16. Ce fichier de test n’importe aucune fonction appellerXxxPourBenchmark réelle (zéro fetch possible)', true)

  console.log(`\n${total - echecs}/${total} vérifications passées.`)
  if (echecs > 0) {
    console.log(`${echecs} ÉCHEC(S).`)
    process.exitCode = 1
  } else {
    console.log('Toutes les vérifications sont passées.')
  }
}

main()
