// ============================================================
// BENCHMARK-MFR V1 — Garde-fou budgétaire — Phase 1
// ============================================================
// Mécanisme pur, en mémoire — aucune dépendance réseau/DB. Hard-cap
// futur verrouillé par le QG : 20 USD. Testable avec des coûts fictifs
// (Phase 1 OFFLINE) ; aucun appel payant n'est déclenché par ce module
// lui-même, qui ne fait qu'additionner des nombres et refuser un
// budget insuffisant AVANT qu'un run ne soit lancé par l'appelant.

export class BudgetDepasseError extends Error {
  constructor(coutEstime: number, coutCumule: number, hardCapUsd: number) {
    super(
      `Hard-cap budgétaire atteint : coût cumulé ${coutCumule.toFixed(4)} USD + coût estimé ${coutEstime.toFixed(4)} USD dépasserait le plafond ${hardCapUsd} USD.`
    )
    this.name = 'BudgetDepasseError'
  }
}

export class SuiviBudget {
  private coutCumuleUsd = 0
  private readonly historique: { readonly libelle: string; readonly coutUsd: number }[] = []

  constructor(private readonly hardCapUsd: number) {
    if (hardCapUsd <= 0) {
      throw new Error('hardCapUsd doit être strictement positif.')
    }
  }

  coutCumule(): number {
    return this.coutCumuleUsd
  }

  hardCap(): number {
    return this.hardCapUsd
  }

  /** À appeler AVANT de lancer un run — lève si le run, une fois son
   * coût réel connu dans la pire hypothèse estimée, dépasserait le
   * plafond. Ne lance jamais rien elle-même : c'est une porte, pas un
   * déclencheur. */
  verifierAvantRun(coutEstimeUsd: number): void {
    if (this.coutCumuleUsd + coutEstimeUsd > this.hardCapUsd) {
      throw new BudgetDepasseError(coutEstimeUsd, this.coutCumuleUsd, this.hardCapUsd)
    }
  }

  /** À appeler APRÈS un run réellement exécuté, avec son coût réel
   * (jamais l'estimation). */
  enregistrerCoutReel(libelle: string, coutUsd: number): void {
    this.coutCumuleUsd += coutUsd
    this.historique.push({ libelle, coutUsd })
  }

  historiqueComplet(): readonly { readonly libelle: string; readonly coutUsd: number }[] {
    return this.historique
  }
}
