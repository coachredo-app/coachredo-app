// ============================================================
// BENCHMARK-MFR V1 — Helpers de construction de fixtures — Phase 1
// ============================================================
// Importe UNIQUEMENT des types (`import type`), jamais une valeur, de
// `context/types.ts` — zéro empreinte runtime, zéro résolution d'alias
// nécessaire à l'exécution (contrairement à `context/builder.ts`,
// jamais importé ici). Aucune donnée réelle : tout contenu ci-dessous
// est inventé pour le benchmark, sans ressemblance voulue avec un
// dossier utilisateur réel.

import type { MfrAnalysisContext, MfrAnalysisSource, SourceBindings } from '../../../src/lib/mfr/context/types'

export interface FixtureBrute {
  readonly context: MfrAnalysisContext
  /** Clé = SRC_xxx, valeur = identifiant fictif de la ligne source —
   * JAMAIS un UUID réel, jamais une valeur pouvant être confondue avec
   * un identifiant Supabase. */
  readonly sourceBindings: SourceBindings
}

interface SourceSpec {
  readonly etape: MfrAnalysisSource['etape']
  readonly natureObjet: MfrAnalysisSource['natureObjet']
  readonly statut: MfrAnalysisSource['statut']
  readonly question: string
  readonly reponseLisible?: string | null
  readonly valeurStructuree?: unknown
}

/** Construit un `MfrAnalysisContext` + `sourceBindings` fictifs
 * cohérents entre eux — jamais de `contextHash` réel (non vérifié par
 * le validator, cf. `validerEtResoudreSortieBrute`, jamais lu) ; chaque
 * SRC reçoit un identifiant « ligne fictive » clairement non-UUID. */
export function construireFixture(etatLogiqueIdFictif: string, specs: readonly SourceSpec[]): FixtureBrute {
  const sources: MfrAnalysisSource[] = []
  const sourceBindings = new Map<string, string>()

  specs.forEach((spec, index) => {
    const src = `SRC_${String(index + 1).padStart(3, '0')}`
    sources.push({
      src,
      etape: spec.etape,
      natureObjet: spec.natureObjet,
      statut: spec.statut,
      question: spec.question,
      reponseLisible: spec.statut === 'DECLARE' ? spec.reponseLisible ?? null : null,
      valeurStructuree: spec.statut === 'DECLARE' ? spec.valeurStructuree ?? null : null,
      legacy: false,
    })
    // Identifiant de ligne fictif — jamais un format UUID (délibéré,
    // pour qu'aucune confusion avec un vrai id Supabase ne soit même
    // visuellement possible).
    sourceBindings.set(src, `fixture-row::${etatLogiqueIdFictif}::${src}`)
  })

  return {
    context: {
      contextVersion: 1,
      etatLogiqueId: etatLogiqueIdFictif,
      canonVersion: 1,
      sources,
      // Jamais une vraie SHA-256 — le validator ne lit jamais ce champ
      // (confirmé, analysis/validator.ts), une chaîne fictive marquée
      // comme telle suffit.
      contextHash: `fixture-hash::${etatLogiqueIdFictif}`,
    },
    sourceBindings,
  }
}
