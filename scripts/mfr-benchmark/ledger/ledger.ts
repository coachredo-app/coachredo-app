// ============================================================
// BENCHMARK-MFR V1 — Ledger budgétaire persistant — Phase 2A
// ============================================================
// Porte de coût placée AVANT tout appel futur — ne touche jamais au
// contenu provider, jamais une réparation/retry/coercion (voir
// `../adapters/*`). Hard-cap verrouillé par le QG : 20 USD.
//
// Discipline FAIL-CLOSED (verrouillée par le QG, BENCHMARK-MFR V1
// Phase 2) : seule l'absence SIMULTANÉE des trois fichiers (principal +
// sauvegarde + sentinelle) est traitée comme un véritable premier run.
// Toute autre combinaison (un seul présent, contenus divergents,
// fichier illisible) lève une erreur bloquante — jamais une
// réinitialisation silencieuse à 0 USD.
//
// Anti-dépassement : un `pending` jamais résolu continue de compter
// dans le cumul réservé indéfiniment (jamais remis à zéro
// automatiquement). Un `failed_unknown_cost` (résolution manuelle
// explicite d'un `pending` orphelin) continue de compter son
// `estimatedCostUsd` dans le cumul DÉPENSÉ de façon permanente — le
// système préfère toujours sur-compter (bloquer des appels qui seraient
// en réalité encore sous le plafond) plutôt que sous-compter (ce qui
// permettrait un dépassement réel).
//
// Idempotence : `entryId` déterministe (hash de provider+model+
// fixtureId+repetition) — jamais un UUID aléatoire. Une relance ne peut
// donc jamais compter deux fois le même run planifié, ni le relancer
// silencieusement (voir `reserverPending`).

import { createHash } from 'crypto'
import { lireJsonDefensif, ecrireJsonAtomique } from './atomicFile'
import { cheminsLedgerParDefaut, type CheminsLedger } from './paths'
import type { LedgerEntry, LedgerEntryStatus, LedgerFile, ReservationParams, ResolutionCompleteeParams } from './types'

export class BudgetDepasseError extends Error {
  constructor(coutEstime: number, cumulReserveUsd: number, hardCapUsd: number) {
    super(
      `Hard-cap budgétaire atteint : cumul réservé ${cumulReserveUsd.toFixed(4)} USD + coût estimé ${coutEstime.toFixed(4)} USD dépasserait le plafond ${hardCapUsd} USD.`
    )
    this.name = 'BudgetDepasseError'
  }
}

/** Levée au chargement si l'état des 3 fichiers (principal/sauvegarde/
 * sentinelle) est incohérent — FAIL CLOSED, jamais une réinitialisation
 * automatique. Nécessite une intervention humaine explicite. */
export class LedgerIncoherentError extends Error {
  constructor(detail: string) {
    super(`Ledger budgétaire incohérent — FAIL CLOSED, aucune réinitialisation automatique. ${detail}`)
    this.name = 'LedgerIncoherentError'
  }
}

export class EntreeDejaExistanteError extends Error {
  constructor(entryId: string, status: LedgerEntryStatus) {
    super(`Une entrée identique (entryId=${entryId}) existe déjà avec le statut "${status}" — jamais de double réservation/double comptage pour le même run planifié.`)
    this.name = 'EntreeDejaExistanteError'
  }
}

export class EntreeIntrouvableError extends Error {
  constructor(entryId: string) {
    super(`Aucune entrée "pending" trouvée pour entryId=${entryId}.`)
    this.name = 'EntreeIntrouvableError'
  }
}

function genererEntryIdDeterministe(provider: string, model: string, fixtureId: string, repetition: number): string {
  return createHash('sha256').update(`${provider}::${model}::${fixtureId}::${repetition}`, 'utf8').digest('hex').slice(0, 24)
}

function entreesEquivalentes(a: readonly LedgerEntry[], b: readonly LedgerEntry[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export class Ledger {
  private constructor(
    private readonly chemins: CheminsLedger,
    private fichier: LedgerFile
  ) {}

  /**
   * Point d'entrée UNIQUE qui peut créer un ledger à 0 USD — refuse
   * explicitement si la moindre trace (principal, sauvegarde OU
   * sentinelle) existe déjà, même une seule des trois. N'est jamais
   * appelé automatiquement par `charger()`.
   */
  static initialiserPremierRunReel(dossierBenchmark: string, hardCapUsd: number): Ledger {
    if (hardCapUsd <= 0) {
      throw new Error('hardCapUsd doit être strictement positif.')
    }
    const chemins = cheminsLedgerParDefaut(dossierBenchmark)
    const principal = lireJsonDefensif(chemins.principal)
    const sauvegarde = lireJsonDefensif(chemins.sauvegarde)
    const sentinelle = lireJsonDefensif(chemins.sentinelle)
    if (principal.etat !== 'absent' || sauvegarde.etat !== 'absent' || sentinelle.etat !== 'absent') {
      throw new LedgerIncoherentError(
        'Une trace existe déjà (principal, sauvegarde ou sentinelle) — initialisation refusée pour ne jamais écraser un historique de dépense existant. Utilisez Ledger.charger() si un ledger existe déjà.'
      )
    }
    const maintenant = new Date().toISOString()
    const fichier: LedgerFile = { schemaVersion: 1, hardCapUsd, createdAt: maintenant, entries: [] }
    const ledger = new Ledger(chemins, fichier)
    ledger.ecrireTout()
    ecrireJsonAtomique(chemins.sentinelle, { createdAt: maintenant, hardCapUsd })
    return ledger
  }

  /**
   * Chargement FAIL-CLOSED : exige que principal, sauvegarde et
   * sentinelle existent tous les trois, soient tous lisibles, et que
   * principal === sauvegarde (contenu strictement identique). Toute
   * autre situation lève `LedgerIncoherentError` — jamais une
   * réinitialisation silencieuse.
   */
  static charger(dossierBenchmark: string): Ledger {
    const chemins = cheminsLedgerParDefaut(dossierBenchmark)
    const principal = lireJsonDefensif(chemins.principal)
    const sauvegarde = lireJsonDefensif(chemins.sauvegarde)
    const sentinelle = lireJsonDefensif(chemins.sentinelle)

    if (principal.etat === 'absent' && sauvegarde.etat === 'absent' && sentinelle.etat === 'absent') {
      throw new LedgerIncoherentError(
        'Aucun ledger initialisé (les 3 fichiers sont absents). Ceci est attendu pour un véritable premier run — appelez explicitement Ledger.initialiserPremierRunReel() pour en créer un, jamais automatiquement.'
      )
    }
    if (principal.etat === 'illisible' || sauvegarde.etat === 'illisible' || sentinelle.etat === 'illisible') {
      throw new LedgerIncoherentError('Au moins un des 3 fichiers existe mais est illisible/corrompu (JSON invalide) — résolution manuelle requise.')
    }
    if (principal.etat === 'absent' || sauvegarde.etat === 'absent' || sentinelle.etat === 'absent') {
      throw new LedgerIncoherentError(
        `Incohérence détectée : principal=${principal.etat}, sauvegarde=${sauvegarde.etat}, sentinelle=${sentinelle.etat}. Une sentinelle ou une sauvegarde sans le fichier principal correspondant (ou l'inverse) est le signe exact d'une suppression/corruption accidentelle — jamais traité comme un premier run.`
      )
    }

    const principalFichier = principal.contenu as LedgerFile
    const sauvegardeFichier = sauvegarde.contenu as LedgerFile
    if (
      principalFichier.createdAt !== sauvegardeFichier.createdAt ||
      principalFichier.hardCapUsd !== sauvegardeFichier.hardCapUsd ||
      !entreesEquivalentes(principalFichier.entries, sauvegardeFichier.entries)
    ) {
      throw new LedgerIncoherentError(
        'Le fichier principal et sa sauvegarde divergent — impossible de déterminer lequel est fiable sans intervention humaine. Jamais résolu automatiquement en faveur de l\'un ou l\'autre.'
      )
    }

    return new Ledger(chemins, principalFichier)
  }

  hardCapUsd(): number {
    return this.fichier.hardCapUsd
  }

  toutesLesEntrees(): readonly LedgerEntry[] {
    return this.fichier.entries
  }

  /** Cumul DÉPENSÉ : entrées `completed` (coût réel connu) + entrées
   * `failed_unknown_cost` (coût réel jamais confirmé, compté de façon
   * conservatrice et PERMANENTE à hauteur de leur estimation — jamais
   * remis à zéro). */
  cumulDepenseUsd(): number {
    return this.fichier.entries
      .filter(e => e.status === 'completed' || e.status === 'failed_unknown_cost')
      .reduce((somme, e) => somme + (e.status === 'completed' ? (e.actualCostUsd ?? 0) : e.estimatedCostUsd), 0)
  }

  /** Cumul RÉSERVÉ : cumul dépensé + estimations des `pending` en
   * cours (jamais remises à zéro automatiquement). */
  cumulReserveUsd(): number {
    const pendingUsd = this.fichier.entries.filter(e => e.status === 'pending').reduce((somme, e) => somme + e.estimatedCostUsd, 0)
    return this.cumulDepenseUsd() + pendingUsd
  }

  /** Porte à appeler AVANT tout appel futur. Ne lance jamais d'appel
   * elle-même — refuse seulement. */
  verifierAvantAppel(estimationCoutUsd: number): void {
    const reserve = this.cumulReserveUsd()
    if (reserve + estimationCoutUsd > this.fichier.hardCapUsd) {
      throw new BudgetDepasseError(estimationCoutUsd, reserve, this.fichier.hardCapUsd)
    }
  }

  genererEntryId(provider: string, model: string, fixtureId: string, repetition: number): string {
    return genererEntryIdDeterministe(provider, model, fixtureId, repetition)
  }

  trouverEntree(entryId: string): LedgerEntry | undefined {
    return this.fichier.entries.find(e => e.entryId === entryId)
  }

  /**
   * Réserve un `pending` pour un run planifié. Idempotent : si une
   * entrée avec le même `entryId` (même provider+model+fixtureId+
   * repetition) existe déjà — quel que soit son statut — refuse
   * (`EntreeDejaExistanteError`) plutôt que de la dupliquer ou de la
   * relancer silencieusement. Vérifie le hard-cap AVANT d'écrire quoi
   * que ce soit.
   */
  reserverPending(params: ReservationParams): string {
    const entryId = genererEntryIdDeterministe(params.provider, params.model, params.fixtureId, params.repetition)
    const existante = this.trouverEntree(entryId)
    if (existante) {
      throw new EntreeDejaExistanteError(entryId, existante.status)
    }
    this.verifierAvantAppel(params.estimatedCostUsd)

    const entree: LedgerEntry = {
      entryId,
      status: 'pending',
      timestamp: new Date().toISOString(),
      provider: params.provider,
      model: params.model,
      fixtureId: params.fixtureId,
      repetition: params.repetition,
      estimatedCostUsd: params.estimatedCostUsd,
      inputTokens: null,
      outputTokens: null,
      actualCostUsd: null,
      cumulativeSpentAfterUsd: null,
      cumulativeReservedAfterUsd: null,
      statutTechnique: null,
    }
    this.fichier.entries.push(entree)
    this.recalculerCumulsEtEcrire()
    return entryId
  }

  /** Résout un `pending` existant avec un coût réel connu — appelé
   * uniquement après un appel réellement exécuté (jamais dans cette
   * phase). Lève si aucune entrée `pending` ne correspond. */
  finaliserCompleted(entryId: string, resolution: ResolutionCompleteeParams): void {
    const entree = this.trouverEntree(entryId)
    if (!entree || entree.status !== 'pending') {
      throw new EntreeIntrouvableError(entryId)
    }
    entree.status = 'completed'
    entree.actualCostUsd = resolution.actualCostUsd
    entree.inputTokens = resolution.inputTokens
    entree.outputTokens = resolution.outputTokens
    entree.statutTechnique = resolution.statutTechnique
    this.recalculerCumulsEtEcrire()
  }

  /**
   * Résolution MANUELLE EXPLICITE d'un `pending` orphelin (process
   * mort entre l'appel réel et la confirmation du coût) — jamais
   * appelée automatiquement par ce module. Le coût reste compté de
   * façon conservatrice et permanente (`cumulDepenseUsd`), jamais remis
   * à zéro.
   */
  resoudreManuellementCommeCoutInconnu(entryId: string): void {
    const entree = this.trouverEntree(entryId)
    if (!entree || entree.status !== 'pending') {
      throw new EntreeIntrouvableError(entryId)
    }
    entree.status = 'failed_unknown_cost'
    this.recalculerCumulsEtEcrire()
  }

  private recalculerCumulsEtEcrire(): void {
    let cumulDepense = 0
    let cumulReserve = 0
    for (const entree of this.fichier.entries) {
      if (entree.status === 'completed') {
        cumulDepense += entree.actualCostUsd ?? 0
      } else if (entree.status === 'failed_unknown_cost') {
        cumulDepense += entree.estimatedCostUsd
      } else {
        cumulReserve += entree.estimatedCostUsd
      }
      entree.cumulativeSpentAfterUsd = cumulDepense
      entree.cumulativeReservedAfterUsd = cumulDepense + cumulReserve
    }
    this.ecrireTout()
  }

  private ecrireTout(): void {
    ecrireJsonAtomique(this.chemins.principal, this.fichier)
    ecrireJsonAtomique(this.chemins.sauvegarde, this.fichier)
  }
}
