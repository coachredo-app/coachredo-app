// ============================================================
// MFR V1 — Tests OFFLINE de l'orchestrateur — T-MFR.3D (reprise après ÉCHEC)
// ============================================================
// Script plain (aucun framework de test, aucune nouvelle dépendance) —
// même discipline que `scripts/mfr-benchmark/*.test.ts`. Exécution :
//   npx tsc <ce fichier + un tsconfig minimal paths-aware> puis node
//   (patch des alias `@/` dans la sortie compilée, non réécrits par
//   tsc à l'émission — même limitation déjà documentée/contournée en
//   T-MFR.3D complément de validation, jamais une modification du
//   code source réel).
// Zéro Supabase réel, zéro OpenAI réel : toutes les briques DB/provider
// sont des fakes injectées via `deps`/`appelerProvider` (seam déjà
// existant, jamais réutilisé ici pour changer un comportement réel,
// uniquement pour l'exercer dynamiquement).

import { lancerAnalyseMfr, type LancerAnalyseMfrParams, type LancerAnalyseMfrDeps } from './lancerAnalyseMfr'
import type { ResultatAppelProvider } from '../provider/openai'
import type { AnalyseGrapheResolu } from '../server/types'

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

const METADATA = { provider: 'openai', model: 'gpt-6.1-sol', promptVersion: 'v2', schemaVersion: '1', catalogueVersion: '1' }

const GRAPHE_FACTICE = {} as unknown as AnalyseGrapheResolu

/** FINISH factices partagés — scénarios où le résultat FINISH lui-même
 * n'est pas l'objet du test (seul le câblage mode/starter l'est). */
function depsFinishFactices(): Pick<LancerAnalyseMfrDeps, 'finirAnalyseEchec' | 'finirAnalyseSucces'> {
  return {
    finirAnalyseEchec: async () => ({ ok: true, alreadyTerminal: false }),
    finirAnalyseSucces: async () => ({ ok: true, alreadyTerminal: false }),
  }
}

function paramsDeBase(overrides: Partial<LancerAnalyseMfrParams> = {}): LancerAnalyseMfrParams {
  return {
    supabaseAuthentifie: {} as never,
    supabaseService: {} as never,
    etatLogiqueId: 'etat-logique-fictif',
    metadata: METADATA,
    promptSysteme: 'prompt de test',
    appelerProvider: async () => ({ type: 'erreur_reseau', erreur: 'ne devrait jamais être appelé dans ce scénario' }) as ResultatAppelProvider,
    timeoutMs: 120000,
    ...overrides,
  }
}

async function main() {
  // ============================================================
  // 1. mode PREMIERE_ANALYSE (par défaut) utilise demarrerPremiereAnalyse,
  // jamais relancerAnalyseApresEchec.
  // ============================================================
  let demarrerPremiereAppele = false
  let relancerAppele = false
  const depsCas1: Partial<LancerAnalyseMfrDeps> = {
    obtenirOuCreerCycle: async () => ({ cycleId: 'cycle-1', created: false }),
    demarrerPremiereAnalyse: async () => {
      demarrerPremiereAppele = true
      return { analyseId: 'analyse-1', created: true }
    },
    relancerAnalyseApresEchec: async () => {
      relancerAppele = true
      return { analyseId: 'ne-devrait-jamais-etre-cree', created: true }
    },
    construireMfrAnalysisContext: async () => ({ ok: false, anomalie: { type: 'etat_logique_introuvable' } }) as never,
    ...depsFinishFactices(),
  }
  await lancerAnalyseMfr(paramsDeBase({ deps: depsCas1 })) // mode omis = défaut
  verifier('1. mode omis (défaut) → demarrerPremiereAnalyse appelé', demarrerPremiereAppele)
  verifier('1. mode omis (défaut) → relancerAnalyseApresEchec jamais appelé', !relancerAppele)

  // ============================================================
  // 2. mode REPRISE_APRES_ECHEC utilise relancerAnalyseApresEchec,
  // jamais demarrerPremiereAnalyse.
  // ============================================================
  demarrerPremiereAppele = false
  relancerAppele = false
  const depsCas2: Partial<LancerAnalyseMfrDeps> = {
    obtenirOuCreerCycle: async () => ({ cycleId: 'cycle-1', created: false }),
    demarrerPremiereAnalyse: async () => {
      demarrerPremiereAppele = true
      return { analyseId: 'ne-devrait-jamais-etre-cree', created: true }
    },
    relancerAnalyseApresEchec: async () => {
      relancerAppele = true
      return { analyseId: 'analyse-2', created: true }
    },
    construireMfrAnalysisContext: async () => ({ ok: false, anomalie: { type: 'etat_logique_introuvable' } }) as never,
    ...depsFinishFactices(),
  }
  await lancerAnalyseMfr(paramsDeBase({ mode: 'REPRISE_APRES_ECHEC', deps: depsCas2 }))
  verifier('2. mode REPRISE_APRES_ECHEC → relancerAnalyseApresEchec appelé', relancerAppele)
  verifier('2. mode REPRISE_APRES_ECHEC → demarrerPremiereAnalyse jamais appelé', !demarrerPremiereAppele)

  // ============================================================
  // 3. Reprise refusée par la RPC (ex. analyse_en_cours, SUCCES déjà
  // atteint, aucune analyse précédente) → provider JAMAIS appelé.
  // ============================================================
  for (const erreurRpc of ['aucune_analyse_precedente', 'analyse_en_cours', 'derniere_tentative_deja_succes'] as const) {
    let providerAppele = false
    const resultat = await lancerAnalyseMfr(
      paramsDeBase({
        mode: 'REPRISE_APRES_ECHEC',
        appelerProvider: async () => {
          providerAppele = true
          return { type: 'erreur_reseau', erreur: 'ne devrait jamais être appelé' }
        },
        deps: {
          obtenirOuCreerCycle: async () => ({ cycleId: 'cycle-1', created: false }),
          relancerAnalyseApresEchec: async () => ({ error: erreurRpc }),
        },
      })
    )
    verifier(`3. reprise refusée (${erreurRpc}) → statut ECHEC_AVANT_ANALYSE`, resultat.statut === 'ECHEC_AVANT_ANALYSE')
    verifier(`3. reprise refusée (${erreurRpc}) → provider jamais appelé`, !providerAppele)
  }

  // ============================================================
  // 4. Reprise acceptée → démarrage réussi → provider appelé
  // EXACTEMENT une fois → FINISH SUCCES fonctionne sur l'analyse de
  // reprise (même mécanique que pour une première analyse — FINISH
  // n'a aucune hypothèse sur le rang de l'analyse).
  // ============================================================
  // Payload minimal mais RÉELLEMENT valide pour `validerEtResoudreSortieBrute`
  // (même forme que `fakeProviders.ts` / `simulateurSuccesValide`,
  // Phase 1 benchmark — jamais réinventée ici) : exerce pour de vrai le
  // chemin FINISH SUCCES, pas seulement le câblage.
  const PAYLOAD_VALIDE = {
    referents: [{ idLocal: 'R1', sources: ['SRC_001'], extraits: [] }],
    propositionsAnalytiques: [{ idLocal: 'P1', enonce: 'Proposition de test.', natureObjet: 'capacite', statutEpistemique: 'DECLARE', referents: ['R1'] }],
    ancrages: [{ idLocal: 'A1', famille: 'CAPACITE', enonce: 'Ancrage de test.', propositions: ['P1'] }],
    hypotheses: [
      {
        idLocal: 'H1',
        statut: 'DIRECTION_CANDIDATE',
        formulation: 'Hypothèse de test.',
        mecanismes: [{ mecanisme: 'M1', role: 'principal' }],
        transformations: [],
        acteursFlux: null,
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
  }

  let appelsProvider = 0
  let analyseIdPasseAFinirSucces: string | undefined
  const resultatSucces = await lancerAnalyseMfr(
    paramsDeBase({
      mode: 'REPRISE_APRES_ECHEC',
      appelerProvider: async () => {
        appelsProvider += 1
        return {
          type: 'succes',
          payload: PAYLOAD_VALIDE,
          metadonnees: { responseId: 'resp-1', model: 'gpt-6.1-sol', usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } },
        }
      },
      deps: {
        obtenirOuCreerCycle: async () => ({ cycleId: 'cycle-1', created: false }),
        relancerAnalyseApresEchec: async () => ({ analyseId: 'analyse-reprise-1', created: true }),
        construireMfrAnalysisContext: async () => ({
          ok: true,
          context: { contextVersion: 1, etatLogiqueId: 'e', canonVersion: 1, sources: [], contextHash: 'h' },
          sourceBindings: new Map([['SRC_001', 'fixture-row::test::SRC_001']]),
        }),
        ...depsFinishFactices(),
        finirAnalyseSucces: async (_service, analyseId) => {
          analyseIdPasseAFinirSucces = analyseId
          return { ok: true, alreadyTerminal: false }
        },
      },
    })
  )
  verifier('4. reprise acceptée → provider appelé EXACTEMENT une fois', appelsProvider === 1)
  verifier('4. ENGINE accepte le payload valide → statut SUCCES (FINISH SUCCES réellement emprunté)', resultatSucces.statut === 'SUCCES')
  verifier('4. FINISH SUCCES reçoit bien l’analyseId de la REPRISE (pas de l’ancienne)', analyseIdPasseAFinirSucces === 'analyse-reprise-1')

  // ============================================================
  // 5. FINISH ECHEC fonctionne sur une analyse de reprise (même
  // mécanique que pour une première analyse).
  // ============================================================
  let analyseIdPasseAFinirEchec: string | undefined
  await lancerAnalyseMfr(
    paramsDeBase({
      mode: 'REPRISE_APRES_ECHEC',
      appelerProvider: async () => ({ type: 'erreur_reseau', erreur: 'panne simulée' }),
      deps: {
        obtenirOuCreerCycle: async () => ({ cycleId: 'cycle-1', created: false }),
        relancerAnalyseApresEchec: async () => ({ analyseId: 'analyse-reprise-2', created: true }),
        construireMfrAnalysisContext: async () => ({
          ok: true,
          context: { contextVersion: 1, etatLogiqueId: 'e', canonVersion: 1, sources: [], contextHash: 'h' },
          sourceBindings: new Map(),
        }),
        finirAnalyseEchec: async (_service, analyseId) => {
          analyseIdPasseAFinirEchec = analyseId
          return { ok: true, alreadyTerminal: false }
        },
      },
    })
  )
  verifier('5. FINISH ECHEC reçoit bien l’analyseId de la REPRISE', analyseIdPasseAFinirEchec === 'analyse-reprise-2')

  console.log(`\n${total - echecs}/${total} vérifications passées.`)
  if (echecs > 0) {
    console.log(`${echecs} ÉCHEC(S).`)
    process.exitCode = 1
  } else {
    console.log('Toutes les vérifications sont passées.')
  }
}

main()
