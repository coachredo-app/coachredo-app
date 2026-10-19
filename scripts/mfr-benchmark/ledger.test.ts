// ============================================================
// BENCHMARK-MFR V1 — Tests OFFLINE du ledger — Phase 2A
// ============================================================
// Script plain (aucun framework de test, aucune nouvelle dépendance),
// même discipline que `offline.test.ts` (Phase 1). Zéro réseau, zéro
// Supabase, zéro appel provider réel. Chaque ledger de test vit dans
// un dossier temporaire HORS du repository (os.tmpdir()), jamais sous
// `scripts/mfr-benchmark/.ledger/` — supprimé après chaque scénario
// pour ne laisser aucun artefact de test dans le repo.

import { mkdtempSync, rmSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { Ledger, BudgetDepasseError, LedgerIncoherentError, EntreeDejaExistanteError, EntreeIntrouvableError } from './ledger/ledger'
import { cheminsLedgerParDefaut } from './ledger/paths'

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

function nouveauDossierTemporaire(): string {
  return mkdtempSync(join(tmpdir(), 'mfr-benchmark-ledger-test-'))
}

async function main() {
  // 1. Initialisation à zéro
  const d1 = nouveauDossierTemporaire()
  const l1 = Ledger.initialiserPremierRunReel(d1, 20)
  verifier('1. initialisation : cumulDepenseUsd() = 0', l1.cumulDepenseUsd() === 0)
  verifier('1. initialisation : cumulReserveUsd() = 0', l1.cumulReserveUsd() === 0)
  verifier('1. initialisation : hardCapUsd() = 20', l1.hardCapUsd() === 20)
  const chemins1 = cheminsLedgerParDefaut(d1)
  verifier('1. fichier principal créé', existsSync(chemins1.principal))
  verifier('1. fichier de sauvegarde créé', existsSync(chemins1.sauvegarde))
  verifier('1. sentinelle créée', existsSync(chemins1.sentinelle))

  // 2. initialiserPremierRunReel refuse si une trace existe déjà
  let refusReinit = false
  try {
    Ledger.initialiserPremierRunReel(d1, 20)
  } catch (e) {
    refusReinit = e instanceof LedgerIncoherentError
  }
  verifier('2. ré-initialisation refusée si le ledger existe déjà', refusReinit)

  // 3. charger() recharge l'état existant fidèlement
  const l1b = Ledger.charger(d1)
  verifier('3. charger() relit le même hardCap', l1b.hardCapUsd() === 20)
  verifier('3. charger() relit le même cumul (0)', l1b.cumulDepenseUsd() === 0)

  // 4. reserverPending + finaliserCompleted — happy path
  const entryId1 = l1.reserverPending({ provider: 'openai', model: 'gpt-6.1-sol', fixtureId: 'GROUNDING_CIBLE', repetition: 1, estimatedCostUsd: 0.05 })
  verifier('4. reserverPending retourne un entryId non vide', typeof entryId1 === 'string' && entryId1.length > 0)
  verifier('4. après réservation, cumulReserveUsd = estimation', l1.cumulReserveUsd() === 0.05)
  verifier('4. après réservation, cumulDepenseUsd reste 0 (pending ne compte pas comme dépensé)', l1.cumulDepenseUsd() === 0)
  l1.finaliserCompleted(entryId1, { actualCostUsd: 0.04, inputTokens: 1200, outputTokens: 400, statutTechnique: 'succes' })
  verifier('4. après finalisation, cumulDepenseUsd = coût réel', l1.cumulDepenseUsd() === 0.04)
  verifier('4. après finalisation, cumulReserveUsd = cumulDepenseUsd (plus de pending)', l1.cumulReserveUsd() === 0.04)

  // 5. idempotence — même entryId (même provider+model+fixture+repetition) refusé
  let doublonRefuse = false
  try {
    l1.reserverPending({ provider: 'openai', model: 'gpt-6.1-sol', fixtureId: 'GROUNDING_CIBLE', repetition: 1, estimatedCostUsd: 0.05 })
  } catch (e) {
    doublonRefuse = e instanceof EntreeDejaExistanteError
  }
  verifier('5. relance du même run planifié refusée (idempotence)', doublonRefuse)
  const entryIdRecalcule = l1.genererEntryId('openai', 'gpt-6.1-sol', 'GROUNDING_CIBLE', 1)
  verifier('5. entryId déterministe (recalculé = celui de la réservation initiale)', entryIdRecalcule === entryId1)

  // 6. hard-cap — refus avant tout appel au-delà du plafond
  let capAtteint = false
  try {
    l1.verifierAvantAppel(19.97)
  } catch (e) {
    capAtteint = e instanceof BudgetDepasseError
  }
  verifier('6. verifierAvantAppel() refuse un appel qui dépasserait 20 USD', capAtteint)
  let capOk = true
  try {
    l1.verifierAvantAppel(19.95)
  } catch {
    capOk = false
  }
  verifier('6. verifierAvantAppel() accepte un appel strictement sous le plafond', capOk)

  // 7. un pending non résolu compte dans le cumul réservé même après rechargement (anti-crash)
  const d2 = nouveauDossierTemporaire()
  const l2 = Ledger.initialiserPremierRunReel(d2, 20)
  l2.reserverPending({ provider: 'anthropic', model: 'claude-sonnet-5-5', fixtureId: 'RICHE', repetition: 1, estimatedCostUsd: 3 })
  const l2Reloaded = Ledger.charger(d2) // simule un redémarrage de process
  verifier('7. après "crash" simulé (rechargement), le pending reste compté', l2Reloaded.cumulReserveUsd() === 3)
  let secondAppelBloqueParPending = false
  try {
    l2Reloaded.verifierAvantAppel(17.5)
  } catch (e) {
    secondAppelBloqueParPending = e instanceof BudgetDepasseError
  }
  verifier('7. le pending orphelin réduit bien la marge disponible pour un futur appel', secondAppelBloqueParPending)

  // 8. résolution manuelle d'un pending orphelin — coût compté de façon permanente
  const entryId2 = l2Reloaded.genererEntryId('anthropic', 'claude-sonnet-5-5', 'RICHE', 1)
  l2Reloaded.resoudreManuellementCommeCoutInconnu(entryId2)
  verifier('8. après résolution manuelle, cumulDepenseUsd = estimation (jamais remis à 0)', l2Reloaded.cumulDepenseUsd() === 3)
  verifier('8. après résolution manuelle, plus de pending (cumulReserveUsd = cumulDepenseUsd)', l2Reloaded.cumulReserveUsd() === 3)
  let introuvable = false
  try {
    l2Reloaded.finaliserCompleted(entryId2, { actualCostUsd: 2, inputTokens: 1, outputTokens: 1, statutTechnique: 'succes' })
  } catch (e) {
    introuvable = e instanceof EntreeIntrouvableError
  }
  verifier('8. un entryId déjà résolu (failed_unknown_cost) ne peut plus être finalisé comme pending', introuvable)

  // 9. FAIL CLOSED — suppression accidentelle du fichier principal
  const d3 = nouveauDossierTemporaire()
  Ledger.initialiserPremierRunReel(d3, 20)
  const chemins3 = cheminsLedgerParDefaut(d3)
  rmSync(chemins3.principal)
  let failClosedSuppressionPrincipal = false
  try {
    Ledger.charger(d3)
  } catch (e) {
    failClosedSuppressionPrincipal = e instanceof LedgerIncoherentError
  }
  verifier('9. suppression du fichier principal (sauvegarde+sentinelle intacts) => FAIL CLOSED', failClosedSuppressionPrincipal)

  // 9b. FAIL CLOSED — corruption du fichier principal
  const d4 = nouveauDossierTemporaire()
  Ledger.initialiserPremierRunReel(d4, 20)
  const chemins4 = cheminsLedgerParDefaut(d4)
  writeFileSync(chemins4.principal, '{ ceci n\'est pas du JSON valide', 'utf8')
  let failClosedCorruption = false
  try {
    Ledger.charger(d4)
  } catch (e) {
    failClosedCorruption = e instanceof LedgerIncoherentError
  }
  verifier('9b. fichier principal corrompu (JSON invalide) => FAIL CLOSED', failClosedCorruption)

  // 9c. FAIL CLOSED — divergence principal/sauvegarde
  const d5 = nouveauDossierTemporaire()
  const l5 = Ledger.initialiserPremierRunReel(d5, 20)
  l5.reserverPending({ provider: 'mistral', model: 'mistral-large-4', fixtureId: 'AMBIGU', repetition: 1, estimatedCostUsd: 1 })
  const chemins5 = cheminsLedgerParDefaut(d5)
  // Simule une sauvegarde restée en retard par rapport au principal
  // (ex. crash entre les deux écritures atomiques) en réécrivant une
  // sauvegarde délibérément différente.
  writeFileSync(chemins5.sauvegarde, JSON.stringify({ schemaVersion: 1, hardCapUsd: 20, createdAt: '2000-01-01T00:00:00.000Z', entries: [] }), 'utf8')
  let failClosedDivergence = false
  try {
    Ledger.charger(d5)
  } catch (e) {
    failClosedDivergence = e instanceof LedgerIncoherentError
  }
  verifier('9c. divergence principal/sauvegarde => FAIL CLOSED', failClosedDivergence)

  // 9d. FAIL CLOSED — sentinelle présente mais principal+sauvegarde absents (reset accidentel)
  const d6 = nouveauDossierTemporaire()
  Ledger.initialiserPremierRunReel(d6, 20)
  const chemins6 = cheminsLedgerParDefaut(d6)
  rmSync(chemins6.principal)
  rmSync(chemins6.sauvegarde)
  let failClosedResetAccidentel = false
  try {
    Ledger.charger(d6)
  } catch (e) {
    failClosedResetAccidentel = e instanceof LedgerIncoherentError
  }
  verifier('9d. sentinelle seule restante (principal+sauvegarde supprimés) => FAIL CLOSED, jamais ré-init à 0 silencieuse', failClosedResetAccidentel)

  // 9e. seul cas légitime de "premier run" : absence simultanée des 3 fichiers
  const d7 = nouveauDossierTemporaire()
  let refusAttenduAvantInit = false
  try {
    Ledger.charger(d7)
  } catch (e) {
    refusAttenduAvantInit = e instanceof LedgerIncoherentError
  }
  verifier('9e. charger() sur un dossier vierge refuse aussi (jamais de création implicite)', refusAttenduAvantInit)
  const l7 = Ledger.initialiserPremierRunReel(d7, 20)
  verifier('9e. seule initialiserPremierRunReel() explicite peut créer un ledger neuf', l7.cumulDepenseUsd() === 0)

  // 10. écriture atomique — aucun fichier .tmp- résiduel après une série d'écritures
  const fichiersRestants = readdirSync(cheminsLedgerParDefaut(d1).dossier)
  verifier('10. aucun fichier temporaire résiduel après plusieurs écritures (écriture atomique)', fichiersRestants.every(f => !f.includes('.tmp-')))

  // 11. recalcul des cumuls par entrée (traçabilité, jamais une valeur isolée non reconstructible)
  const toutes = l1.toutesLesEntrees()
  verifier('11. chaque entrée porte un cumulativeSpentAfterUsd renseigné', toutes.every(e => e.cumulativeSpentAfterUsd !== null))
  verifier('11. chaque entrée porte un cumulativeReservedAfterUsd renseigné', toutes.every(e => e.cumulativeReservedAfterUsd !== null))

  // Nettoyage des dossiers temporaires de test (jamais dans le repo).
  for (const d of [d1, d2, d3, d4, d5, d6, d7]) {
    rmSync(d, { recursive: true, force: true })
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
