// ============================================================
// BENCHMARK-MFR V1 — Simulateurs de provider (OFFLINE) — Phase 1
// ============================================================
// AUCUN appel réseau, AUCUN SDK provider. Produit des réponses
// déterministes couvrant chaque branche attendue par le runner/
// validator — exactement ce dont la Phase 1 OFFLINE a besoin pour être
// testée sans aucun appel payant.

import type { SourceBindings } from '../../src/lib/mfr/context/types'
import type { StatutTechniqueProvider, UsageBenchmark } from './types'

export interface ResultatSimule {
  readonly statutTechnique: StatutTechniqueProvider
  readonly rawText: string | null
  readonly usage: UsageBenchmark
}

export type SimulateurProvider = (sourceBindings: SourceBindings) => Promise<ResultatSimule>

const USAGE_FACTICE: UsageBenchmark = { inputTokens: 1200, outputTokens: 400, reasoningTokens: null, coutUsd: 0.01 }

function premieresSrc(sourceBindings: SourceBindings, n: number): readonly string[] {
  return Array.from(sourceBindings.keys()).slice(0, n)
}

function sortieValideJson(sourceBindings: SourceBindings): string {
  const [src1, src2] = premieresSrc(sourceBindings, 2)
  const srcReferents = src2 ? [src1, src2] : [src1]
  return JSON.stringify({
    referents: [{ idLocal: 'R1', sources: srcReferents, extraits: [] }],
    propositionsAnalytiques: [
      { idLocal: 'P1', enonce: 'Proposition simulée', natureObjet: 'capacite', statutEpistemique: 'DECLARE', referents: ['R1'] },
    ],
    ancrages: [{ idLocal: 'A1', famille: 'CAPACITE', enonce: 'Ancrage simulé', propositions: ['P1'] }],
    hypotheses: [
      {
        idLocal: 'H1',
        statut: 'DIRECTION_CANDIDATE',
        formulation: 'Hypothèse simulée',
        mecanismes: [{ mecanisme: 'M1', role: 'principal' }],
        transformations: [],
        acteursFlux: 'Texte simulé',
        modalitesProposees: [],
        exigences: [],
        etatExigences: [],
        inconnuesCritiques: [],
        ancrages: [{ ancrageIdLocal: 'A1', constitutif: true }],
      },
    ],
    pistes: [],
    evaluationsD025: [
      {
        hypotheseIdLocal: 'H1',
        coherenceOk: true,
        compatibiliteOk: true,
        actionnabiliteResultat: 'ACTIONNABLE_MAINTENANT',
        disponibiliteOk: true,
        recommandeeAujourdhui: false,
        justification: null,
      },
    ],
  })
}

export const simulateurSuccesValide: SimulateurProvider = async sourceBindings => ({
  statutTechnique: 'succes',
  rawText: sortieValideJson(sourceBindings),
  usage: USAGE_FACTICE,
})

export const simulateurEchecStructural: SimulateurProvider = async sourceBindings => {
  const brut = JSON.parse(sortieValideJson(sourceBindings)) as Record<string, unknown>
  // Drift closed-world : propriété hors contrat sur le premier référent.
  ;(brut.referents as Record<string, unknown>[])[0].proprieteInattendue = 'drift'
  return { statutTechnique: 'succes', rawText: JSON.stringify(brut), usage: USAGE_FACTICE }
}

export const simulateurEchecReferential: SimulateurProvider = async sourceBindings => {
  const brut = JSON.parse(sortieValideJson(sourceBindings)) as Record<string, unknown>
  ;(brut.referents as Record<string, unknown>[])[0].sources = ['SRC_INEXISTANT_999']
  return { statutTechnique: 'succes', rawText: JSON.stringify(brut), usage: USAGE_FACTICE }
}

export const simulateurEchecBusiness: SimulateurProvider = async sourceBindings => {
  const brut = JSON.parse(sortieValideJson(sourceBindings)) as Record<string, unknown>
  const hypothese = (brut.hypotheses as Record<string, unknown>[])[0]
  ;(hypothese.mecanismes as Record<string, unknown>[])[0].mecanisme = 'M7'
  return { statutTechnique: 'succes', rawText: JSON.stringify(brut), usage: USAGE_FACTICE }
}

export const simulateurEchecEpistemic: SimulateurProvider = async sourceBindings => {
  const brut = JSON.parse(sortieValideJson(sourceBindings)) as Record<string, unknown>
  ;(brut.propositionsAnalytiques as Record<string, unknown>[])[0].statutEpistemique = 'ETAYE'
  // Un seul référent cité (R1) — condition ÉTAYÉ (≥2 distincts) non remplie.
  return { statutTechnique: 'succes', rawText: JSON.stringify(brut), usage: USAGE_FACTICE }
}

export const simulateurPayloadNonJson: SimulateurProvider = async () => ({
  statutTechnique: 'payload_non_json',
  rawText: 'Ceci n\'est pas un JSON valide {{{',
  usage: USAGE_FACTICE,
})

export const simulateurPayloadAbsent: SimulateurProvider = async () => ({
  statutTechnique: 'payload_absent',
  rawText: null,
  usage: { ...USAGE_FACTICE, outputTokens: 0 },
})

export const simulateurRefusal: SimulateurProvider = async () => ({
  statutTechnique: 'refusal',
  rawText: 'Je ne peux pas traiter cette demande (simulation).',
  usage: { ...USAGE_FACTICE, outputTokens: 20 },
})

export const simulateurIncomplete: SimulateurProvider = async () => ({
  statutTechnique: 'incomplete',
  rawText: '{"referents":[{"idLocal":"R1","sources":["SRC_001"]',
  usage: { ...USAGE_FACTICE, outputTokens: 50 },
})

export const simulateurErreurReseau: SimulateurProvider = async () => ({
  statutTechnique: 'erreur_reseau',
  rawText: null,
  usage: { inputTokens: null, outputTokens: null, reasoningTokens: null, coutUsd: null },
})

export const simulateurEchecProvider: SimulateurProvider = async () => ({
  statutTechnique: 'echec_provider',
  rawText: null,
  usage: { inputTokens: null, outputTokens: null, reasoningTokens: null, coutUsd: null },
})
