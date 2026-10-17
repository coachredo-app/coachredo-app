// ============================================================
// BENCHMARK-MFR V1 — Runner offline — Phase 1
// ============================================================
// Compose : fixture → prompt (réutilisé, production) → simulateur
// (jamais un vrai provider en Phase 1) → parse défensif → ENGINE
// (`validerEtResoudreSortieBrute`, réutilisé, production) → BenchmarkRun.
//
// AUCUNE réparation : un payload invalide reste invalide, jamais une
// seconde tentative, jamais une correction. Le validator est appelé
// EXACTEMENT comme en production — ce fichier ne réimplémente rien de
// l'ENGINE, il le consomme tel quel.
//
// Zéro import Supabase — recherche exhaustive effectuée (voir rapport
// §I) : ni `createServiceClient`, ni `obtenirOuCreerCycle`, ni
// `demarrerPremiereAnalyse`, ni `finirAnalyseEchec`/`finirAnalyseSucces`,
// ni `lancerAnalyseMfr`, directement ou indirectement.

import { randomUUID, createHash } from 'crypto'
import { construirePromptSystemeAnalyseMfr } from '../../src/lib/mfr/provider/prompt'
import { validerEtResoudreSortieBrute } from '../../src/lib/mfr/analysis/validator'
import { FIXTURES } from './fixtures/index'
import type { SimulateurProvider } from './fakeProviders'
import type { BenchmarkRun, FixtureId, StatutEngine } from './types'
import { SuiviBudget } from './budget'

const VERSION_PROMPT_BENCHMARK = 'v1'

function hacherTexte(texte: string): string {
  return createHash('sha256').update(texte, 'utf8').digest('hex')
}

export interface ExecuterRunParams {
  readonly fixtureId: FixtureId
  readonly providerAlias: string
  readonly modelAlias: string
  readonly repetition: number
  /** Phase 1 : uniquement des simulateurs déterministes — aucun vrai
   * appel provider n'est câblé ni autorisé dans cette passe. */
  readonly simulateur: SimulateurProvider
  /** Coût réel du run, fourni par l'appelant (Phase 1 : fictif) — ce
   * fichier ne calcule jamais lui-même un tarif, pour ne jamais figer
   * une configuration tarifaire non verrouillée (modèles/tarifs encore
   * non arrêtés, rappel QG). */
  readonly coutUsdReel: number
  readonly suiviBudget?: SuiviBudget
}

/**
 * Exécute un run unique. Lève si `suiviBudget` est fourni et que le
 * hard-cap serait dépassé — AVANT tout appel au simulateur (jamais une
 * vérification après coup pour un vrai provider futur).
 */
export async function executerRun(params: ExecuterRunParams): Promise<BenchmarkRun> {
  if (params.suiviBudget) {
    params.suiviBudget.verifierAvantRun(params.coutUsdReel)
  }

  const fixture = FIXTURES[params.fixtureId]
  const promptSysteme = construirePromptSystemeAnalyseMfr()
  const promptHash = hacherTexte(promptSysteme)

  const startedAt = new Date().toISOString()
  const debutMs = Date.now()
  const resultatSimule = await params.simulateur(fixture.sourceBindings)
  const latencyMs = Date.now() - debutMs
  const finishedAt = new Date().toISOString()

  let statutEngine: StatutEngine = 'NON_EVALUE'
  let diagnostics: BenchmarkRun['engine']['diagnostics'] = []
  let graphe: unknown
  let parsedPayload: unknown

  if (resultatSimule.statutTechnique === 'succes' && resultatSimule.rawText !== null) {
    try {
      parsedPayload = JSON.parse(resultatSimule.rawText)
    } catch {
      // Ne devrait jamais survenir ici (Phase 1 simulée) — défensif,
      // même discipline que provider/openai.ts réel : jamais présumer
      // qu'un texte "succes" est forcément un JSON valide.
      statutEngine = 'NON_EVALUE'
    }
    if (parsedPayload !== undefined) {
      const validation = validerEtResoudreSortieBrute(parsedPayload, fixture.sourceBindings)
      if (validation.ok) {
        statutEngine = 'PASS'
        graphe = validation.graphe
      } else {
        statutEngine = 'FAIL'
        diagnostics = validation.diagnostics
      }
    }
  }
  // Tout autre statut technique (refusal/incomplete/echec_provider/
  // payload_non_json/payload_absent/erreur_reseau) : le validator
  // n'est JAMAIS appelé — il n'existe rien à lui soumettre. Conforme à
  // la discipline production (lancerAnalyseMfr.ts) : aucune réparation,
  // aucune tentative de sauver un payload absent ou refusé.

  if (params.suiviBudget) {
    params.suiviBudget.enregistrerCoutReel(`${params.fixtureId}:${params.providerAlias}:${params.repetition}`, params.coutUsdReel)
  }

  return {
    runId: randomUUID(),
    fixtureId: params.fixtureId,
    providerAlias: params.providerAlias,
    modelAlias: params.modelAlias,
    repetition: params.repetition,
    startedAt,
    finishedAt,
    latencyMs,
    input: {
      promptVersion: VERSION_PROMPT_BENCHMARK,
      promptHash,
      fixtureId: params.fixtureId,
      sourceCount: fixture.context.sources.length,
    },
    output: {
      statutTechnique: resultatSimule.statutTechnique,
      rawText: resultatSimule.rawText,
      parsedPayload,
    },
    engine: {
      statut: statutEngine,
      diagnostics,
      graphe,
    },
    usage: {
      inputTokens: resultatSimule.usage.inputTokens,
      outputTokens: resultatSimule.usage.outputTokens,
      reasoningTokens: resultatSimule.usage.reasoningTokens,
      coutUsd: params.coutUsdReel,
    },
  }
}

// ────────────────────────────────────────────────────────────
// Agrégats (section 6 du GO QG)
// ────────────────────────────────────────────────────────────

export function tauxDePassageEngine(runs: readonly BenchmarkRun[]): number {
  if (runs.length === 0) return 0
  const pass = runs.filter(r => r.engine.statut === 'PASS').length
  return pass / runs.length
}

export function coutMoyenParRun(runs: readonly BenchmarkRun[]): number {
  if (runs.length === 0) return 0
  const total = runs.reduce((somme, r) => somme + (r.usage.coutUsd ?? 0), 0)
  return total / runs.length
}

export function coutParEnginePass(runs: readonly BenchmarkRun[]): number | null {
  const pass = runs.filter(r => r.engine.statut === 'PASS')
  if (pass.length === 0) return null
  const total = runs.reduce((somme, r) => somme + (r.usage.coutUsd ?? 0), 0)
  return total / pass.length
}

export function repartitionCategoriesEchec(runs: readonly BenchmarkRun[]): Record<string, number> {
  const repartition: Record<string, number> = { STRUCTURAL: 0, REFERENTIAL: 0, BUSINESS: 0, EPISTEMIC: 0 }
  for (const run of runs) {
    for (const diagnostic of run.engine.diagnostics) {
      repartition[diagnostic.categorie] = (repartition[diagnostic.categorie] ?? 0) + 1
    }
  }
  return repartition
}

export function distributionLatence(runs: readonly BenchmarkRun[]): readonly number[] {
  return runs.map(r => r.latencyMs).sort((a, b) => a - b)
}
