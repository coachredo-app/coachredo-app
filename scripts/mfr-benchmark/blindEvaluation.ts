// ============================================================
// BENCHMARK-MFR V1 — Blind evaluation — Phase 1
// ============================================================
// Le mapping alias↔provider réel est randomisé INDÉPENDAMMENT par
// fixture (pas un mapping fixe pour tout le benchmark) — empêche de
// deviner par répétition de style sur plusieurs cas. La vue aveugle ne
// porte jamais provider/model/responseId/usage/latence (signature
// potentiellement identifiante) — uniquement ce qui est nécessaire à
// la notation qualitative (le graphe si PASS, les diagnostics sinon).

import type { BenchmarkRun, BlindRunView, FixtureId } from './types'

const LETTRES_ALIAS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

function melanger<T>(valeurs: readonly T[]): T[] {
  const copie = [...valeurs]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copie[i], copie[j]] = [copie[j], copie[i]]
  }
  return copie
}

/** Génère un mapping provider→alias bijectif et randomisé. Au plus
 * `LETTRES_ALIAS.length` providers (6, aligné sur la shortlist QG). */
export function genererMappingAveugle(providers: readonly string[]): ReadonlyMap<string, string> {
  if (providers.length === 0) throw new Error('Au moins un provider est requis.')
  if (providers.length > LETTRES_ALIAS.length) {
    throw new Error(`Au plus ${LETTRES_ALIAS.length} providers supportés par ce mapping (reçu : ${providers.length}).`)
  }
  const idUniques = new Set(providers)
  if (idUniques.size !== providers.length) {
    throw new Error('Les identifiants provider doivent être uniques.')
  }
  const ordreMelange = melanger(providers)
  const mapping = new Map<string, string>()
  ordreMelange.forEach((provider, index) => mapping.set(provider, LETTRES_ALIAS[index]))
  return mapping
}

/** Construit la vue strictement anonymisée d'un run — jamais de champ
 * identifiant au-delà de l'alias attribué. */
export function construireVueAveugle(run: BenchmarkRun, mapping: ReadonlyMap<string, string>): BlindRunView {
  const alias = mapping.get(run.providerAlias)
  if (!alias) {
    throw new Error(`Aucun alias aveugle défini pour le provider "${run.providerAlias}" — mapping incomplet.`)
  }
  return {
    alias,
    fixtureId: run.fixtureId,
    engine: run.engine,
  }
}

/**
 * Gestionnaire du mapping réel — un mapping par fixture, jamais
 * partagé entre fixtures. Phase 1 : en mémoire uniquement (aucun run
 * réel n'existe encore à persister) ; une persistance locale (jamais
 * Supabase) serait à ajouter avant un usage réel multi-session, hors
 * périmètre de cette passe.
 */
export class GestionnaireMappingAveugle {
  private readonly mappingsParFixture = new Map<FixtureId, ReadonlyMap<string, string>>()

  obtenirOuCreerMapping(fixtureId: FixtureId, providers: readonly string[]): ReadonlyMap<string, string> {
    const existant = this.mappingsParFixture.get(fixtureId)
    if (existant) return existant
    const nouveau = genererMappingAveugle(providers)
    this.mappingsParFixture.set(fixtureId, nouveau)
    return nouveau
  }

  /** Mapping réel — jamais exposé à l'évaluateur, uniquement pour la
   * révélation finale après notation complète. */
  mappingReel(fixtureId: FixtureId): ReadonlyMap<string, string> | undefined {
    return this.mappingsParFixture.get(fixtureId)
  }
}
