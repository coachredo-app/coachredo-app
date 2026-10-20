// ============================================================
// BENCHMARK MFR ACCÉLÉRÉ — Sanity CLI minimal — Phase accélérée
// ============================================================
// UN provider × UNE fixture × UN appel, déclenché manuellement.
// AUCUN batch, AUCUN --all, AUCUNE boucle automatique, AUCUN retry.
//
// Réutilise intégralement l'existant : `ledger/ledger.ts` (reserve/
// finalise, fail-closed, hard-cap), `pricing.ts` (tarifs + estimation),
// `sanityConfig.ts` (`MAX_OUTPUT_TOKENS_SANITY`), `adapters/{openai,
// gemini,qwen}.ts` (requête/parsing/exécuteur réel), `fixtures/index.ts`,
// le prompt/schema/ENGINE de production (`validerEtResoudreSortieBrute`),
// et le type `BenchmarkRun` existant tel quel — AUCUN modèle concurrent.
//
// Secrets : `apiKey`/`qwenEndpointUrl` ne sont JAMAIS loggés, JAMAIS
// écrits dans le fichier résultat, JAMAIS inclus dans un message
// d'erreur — ils ne transitent que comme paramètres de fonction vers
// les adapters existants (mêmes garanties qu'eux).
//
// Doctrine coût inconnu (verrouillée par le QG) : si l'appel a pu
// atteindre le provider mais que le coût réel n'est pas déterminable
// (aucun token d'usage retourné, ou exception après réservation),
// l'entrée ledger reste `pending` — JAMAIS finalisée à $0, JAMAIS
// supprimée, JAMAIS retentée automatiquement. Seule une résolution
// manuelle explicite (hors de ce fichier, primitive déjà existante
// `Ledger.resoudreManuellementCommeCoutInconnu`) peut la clore.

import { randomUUID, createHash } from 'crypto'
import { join } from 'path'

import { construirePromptSystemeAnalyseMfr } from '../../src/lib/mfr/provider/prompt'
import { construireJsonSchemaAnalyseSortieBrute, NOM_SCHEMA_ANALYSE_SORTIE_BRUTE } from '../../src/lib/mfr/provider/schema'
import { validerEtResoudreSortieBrute } from '../../src/lib/mfr/analysis/validator'

import { FIXTURES } from './fixtures/index'
import type { FixtureId, BenchmarkRun, StatutEngine } from './types'
import { MAX_OUTPUT_TOKENS_SANITY } from './sanityConfig'
import { estimerCoutConservateurUsd, type ProviderId } from './pricing'
import { Ledger } from './ledger/ledger'
import { ecrireJsonAtomique } from './ledger/atomicFile'

import type { AppelAdapterParams, AppelQwenAdapterParams, ResultatAdapterBenchmark } from './adapters/types'
import * as OpenAiAdapter from './adapters/openai'
import * as GeminiAdapter from './adapters/gemini'
import * as QwenAdapter from './adapters/qwen'

// ────────────────────────────────────────────────────────────
// Périmètre verrouillé de cette phase accélérée (QG) — PAS les 6
// providers/5 fixtures du harness complet, qui restent dormants.
// ────────────────────────────────────────────────────────────

export type ProviderSanity = Extract<ProviderId, 'openai' | 'gemini' | 'qwen'>
export type FixtureSanityId = Extract<FixtureId, 'RICHE' | 'CONTRADICTOIRE' | 'GROUNDING_CIBLE'>

const PROVIDERS_AUTORISES: readonly ProviderSanity[] = ['openai', 'gemini', 'qwen']
const FIXTURES_AUTORISEES: readonly FixtureSanityId[] = ['RICHE', 'CONTRADICTOIRE', 'GROUNDING_CIBLE']

const MODELE_PAR_PROVIDER: Readonly<Record<ProviderSanity, string>> = {
  openai: 'gpt-6.1-sol',
  gemini: 'gemini-3.8-flash',
  qwen: 'qwen3.7-plus',
}

// ────────────────────────────────────────────────────────────
// 1. Validation argv — AUCUNE valeur par défaut, jamais devinée.
// ────────────────────────────────────────────────────────────

export interface ArgumentsSanityCli {
  readonly provider: ProviderSanity
  readonly fixtureId: FixtureSanityId
}

export function parserArguments(argv: readonly string[]): ArgumentsSanityCli {
  let provider: string | undefined
  let fixtureId: string | undefined
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--provider') provider = argv[i + 1]
    if (argv[i] === '--fixture') fixtureId = argv[i + 1]
  }
  if (!provider || !(PROVIDERS_AUTORISES as readonly string[]).includes(provider)) {
    throw new Error(`--provider requis, une valeur EXACTE parmi : ${PROVIDERS_AUTORISES.join(', ')} (reçu : ${provider ?? 'aucun'}).`)
  }
  if (!fixtureId || !(FIXTURES_AUTORISEES as readonly string[]).includes(fixtureId)) {
    throw new Error(`--fixture requis, une valeur EXACTE parmi : ${FIXTURES_AUTORISEES.join(', ')} (reçu : ${fixtureId ?? 'aucun'}).`)
  }
  return { provider: provider as ProviderSanity, fixtureId: fixtureId as FixtureSanityId }
}

// ────────────────────────────────────────────────────────────
// Estimation input CONSERVATRICE — formule EXACTE documentée.
// ────────────────────────────────────────────────────────────

/**
 * `Math.ceil((promptSysteme.length + schemaSerialise.length +
 * contexteSerialise.length) / 3.5)`.
 *
 * Ratio choisi (3,5 caractères/token) délibérément plus défavorable
 * que le ratio usuel (~4 caractères/token pour du texte français/
 * anglais mixte), pour ne JAMAIS sous-estimer. CE N'EST PAS un
 * tokenizer réel d'aucun provider — approximation simple et
 * déterministe dont le SEUL but est de protéger le hard-cap 20 USD
 * avant tout appel réseau, pas de prédire un coût exact.
 */
export function estimerTokensEntreeConservateur(promptSysteme: string, schemaSerialise: string, contexteSerialise: string): number {
  const totalCaracteres = promptSysteme.length + schemaSerialise.length + contexteSerialise.length
  return Math.ceil(totalCaracteres / 3.5)
}

// ────────────────────────────────────────────────────────────
// Dispatch provider réel — injectable pour les tests offline (même
// principe que `LancerAnalyseMfrDeps`, production) — AUCUNE nouvelle
// architecture générique, seule la fonction d'appel est substituable.
// ────────────────────────────────────────────────────────────

export type AppelProviderSanityFn = (provider: ProviderSanity, params: AppelAdapterParams, qwenEndpointUrl: string | undefined) => Promise<ResultatAdapterBenchmark>

async function appelProviderReel(provider: ProviderSanity, params: AppelAdapterParams, qwenEndpointUrl: string | undefined): Promise<ResultatAdapterBenchmark> {
  if (provider === 'openai') return OpenAiAdapter.appellerOpenAiPourBenchmark(params)
  if (provider === 'gemini') return GeminiAdapter.appellerGeminiPourBenchmark(params)
  if (!qwenEndpointUrl) {
    throw new Error('Qwen : endpointUrl manquant — ne doit jamais survenir ici (déjà validé avant réservation ledger).')
  }
  return QwenAdapter.appellerQwenPourBenchmark({ ...params, endpointUrl: qwenEndpointUrl } as AppelQwenAdapterParams)
}

// ────────────────────────────────────────────────────────────
// Orchestrateur — UN appel, séquence verrouillée par le QG.
// ────────────────────────────────────────────────────────────

export interface OptionsSanityCall {
  readonly provider: ProviderSanity
  readonly fixtureId: FixtureSanityId
  readonly apiKey: string | undefined
  readonly qwenEndpointUrl?: string
  readonly dossierLedger: string
  readonly dossierResultats: string
  /** Jamais fourni en usage réel — uniquement pour les tests offline
   * (zéro fetch réel dans cette phase). */
  readonly appelProvider?: AppelProviderSanityFn
}

export interface ResultatSanityCall {
  readonly entryId: string
  readonly ledgerStatus: 'completed' | 'pending'
  readonly cheminResultat: string
  readonly benchmarkRun: BenchmarkRun
}

export async function executerSanityCall(options: OptionsSanityCall): Promise<ResultatSanityCall> {
  // 2. Vérifier clé requise — AVANT tout le reste.
  if (!options.apiKey) {
    throw new Error(`Clé API manquante pour le provider "${options.provider}" — refusé AVANT tout réseau.`)
  }
  // Qwen : endpoint régional obligatoire — AVANT tout le reste.
  if (options.provider === 'qwen' && !options.qwenEndpointUrl) {
    throw new Error('Qwen : QWEN_ENDPOINT_URL manquant — refusé AVANT tout réseau (aucun fallback, aucune valeur par défaut).')
  }

  // 3. Construire contexte/prompt/schema — réutilisés par import direct.
  const fixture = FIXTURES[options.fixtureId]
  const promptSysteme = construirePromptSystemeAnalyseMfr()
  const schema = construireJsonSchemaAnalyseSortieBrute()
  const schemaSerialise = JSON.stringify(schema)
  const contexteSerialise = JSON.stringify(fixture.context)
  const model = MODELE_PAR_PROVIDER[options.provider]

  // 4. Estimation input conservatrice (formule documentée ci-dessus).
  const tokensEntreeEstimes = estimerTokensEntreeConservateur(promptSysteme, schemaSerialise, contexteSerialise)

  // 5. estimatedCostUsd — pire cas (plafond de sortie réellement configuré).
  const estimatedCostUsd = estimerCoutConservateurUsd(options.provider, tokensEntreeEstimes, MAX_OUTPUT_TOKENS_SANITY)

  // 6. Charger le ledger EXPLICITEMENT — aucune initialisation silencieuse
  // (lève si absent/incohérent, voir `Ledger.charger`, inchangé).
  const ledger = Ledger.charger(options.dossierLedger)

  // 7. Réserver AVANT tout réseau — lève si hard-cap dépassé OU si cette
  // combinaison (provider+model+fixture+repetition) existe déjà
  // (idempotence déjà garantie par `reserverPending`, réutilisée telle
  // quelle, aucune logique nouvelle).
  const entryId = ledger.reserverPending({
    provider: options.provider,
    model,
    fixtureId: options.fixtureId,
    repetition: 1,
    estimatedCostUsd,
  })

  const promptHash = createHash('sha256').update(promptSysteme, 'utf8').digest('hex')
  const startedAt = new Date().toISOString()
  const debutMs = Date.now()

  const paramsAdapter: AppelAdapterParams = {
    promptSysteme,
    contexteSerialise,
    schema,
    schemaName: NOM_SCHEMA_ANALYSE_SORTIE_BRUTE,
    model,
    apiKey: options.apiKey,
    timeoutMs: 120000,
    maxOutputTokens: MAX_OUTPUT_TOKENS_SANITY,
  }

  const appelProvider = options.appelProvider ?? appelProviderReel

  let resultatAdapter: ResultatAdapterBenchmark
  try {
    // 8. SEULEMENT MAINTENANT — le seul appel réseau de toute l'exécution.
    resultatAdapter = await appelProvider(options.provider, paramsAdapter, options.qwenEndpointUrl)
  } catch (erreur) {
    // Exception inattendue APRÈS réservation : coût potentiellement
    // engagé, JAMAIS traité comme $0, JAMAIS retenté. L'entrée reste
    // `pending` — aucune finalisation, aucune résolution automatique.
    const finishedAtErreur = new Date().toISOString()
    const cheminResultatErreur = join(options.dossierResultats, `${entryId}.json`)
    ecrireJsonAtomique(cheminResultatErreur, {
      entryId,
      ledgerStatus: 'pending',
      estimatedCostUsd,
      provider: options.provider,
      model,
      fixtureId: options.fixtureId,
      startedAt,
      finishedAt: finishedAtErreur,
      erreurApresReservation: erreur instanceof Error ? erreur.message : String(erreur),
    })
    throw new Error(
      `Appel provider interrompu après réservation ledger (entryId=${entryId}) — coût réel INCONNU, jamais traité comme $0, entrée restée "pending" (résolution manuelle requise, hors de ce CLI). Détail : ${erreur instanceof Error ? erreur.message : String(erreur)}`
    )
  }

  const finishedAt = new Date().toISOString()
  const latencyMs = Date.now() - debutMs

  // ENGINE — JSON.parse défensif, AUCUNE réparation (même discipline
  // que `runner.ts`, Phase 1, réutilisée à l'identique).
  let statutEngine: StatutEngine = 'NON_EVALUE'
  let diagnostics: BenchmarkRun['engine']['diagnostics'] = []
  let graphe: unknown
  let parsedPayload: unknown

  if (resultatAdapter.statutTechnique === 'succes' && resultatAdapter.rawText !== null) {
    try {
      parsedPayload = JSON.parse(resultatAdapter.rawText)
    } catch {
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

  // Coût observé — UNIQUEMENT si le provider a réellement renvoyé des
  // tokens d'usage (quel que soit le statut technique/ENGINE). Si
  // l'usage est entièrement absent, le coût reste INCONNU : jamais $0,
  // jamais résolu automatiquement — l'entrée ledger reste `pending`.
  const usageConnu = resultatAdapter.usage.inputTokens !== null || resultatAdapter.usage.outputTokens !== null
  let coutUsd: number | null = null
  let ledgerStatus: 'completed' | 'pending' = 'pending'

  if (usageConnu) {
    coutUsd = estimerCoutConservateurUsd(options.provider, resultatAdapter.usage.inputTokens ?? 0, resultatAdapter.usage.outputTokens ?? 0)
    ledger.finaliserCompleted(entryId, {
      actualCostUsd: coutUsd,
      inputTokens: resultatAdapter.usage.inputTokens,
      outputTokens: resultatAdapter.usage.outputTokens,
      statutTechnique: resultatAdapter.statutTechnique,
    })
    ledgerStatus = 'completed'
  }
  // Sinon : aucune finalisation — l'entrée reste `pending`, continue de
  // compter dans le cumul réservé (protection anti-dépassement intacte).

  const benchmarkRun: BenchmarkRun = {
    runId: randomUUID(),
    fixtureId: options.fixtureId,
    providerAlias: options.provider,
    modelAlias: model,
    repetition: 1,
    startedAt,
    finishedAt,
    latencyMs,
    input: {
      promptVersion: 'v1',
      promptHash,
      fixtureId: options.fixtureId,
      sourceCount: fixture.context.sources.length,
    },
    output: {
      statutTechnique: resultatAdapter.statutTechnique,
      rawText: resultatAdapter.rawText,
      parsedPayload,
    },
    engine: {
      statut: statutEngine,
      diagnostics,
      graphe,
    },
    usage: {
      inputTokens: resultatAdapter.usage.inputTokens,
      outputTokens: resultatAdapter.usage.outputTokens,
      reasoningTokens: resultatAdapter.usage.reasoningTokens,
      coutUsd,
    },
  }

  const cheminResultat = join(options.dossierResultats, `${entryId}.json`)
  ecrireJsonAtomique(cheminResultat, { entryId, ledgerStatus, estimatedCostUsd, benchmarkRun })

  return { entryId, ledgerStatus, cheminResultat, benchmarkRun }
}

// ────────────────────────────────────────────────────────────
// CLI — invoqué UNIQUEMENT quand ce fichier est exécuté directement
// (jamais lors d'un `import` depuis les tests).
// ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const dossierBenchmark = join(process.cwd(), 'scripts/mfr-benchmark')

  if (argv.includes('--init-ledger')) {
    Ledger.initialiserPremierRunReel(dossierBenchmark, 20)
    console.log(`Ledger initialisé (0 USD, hard-cap 20 USD) dans ${join(dossierBenchmark, '.ledger')}.`)
    return
  }

  try {
    const { provider, fixtureId } = parserArguments(argv)
    const apiKey =
      provider === 'openai' ? process.env.OPENAI_API_KEY : provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.QWEN_API_KEY
    const qwenEndpointUrl = provider === 'qwen' ? process.env.QWEN_ENDPOINT_URL : undefined

    const resultat = await executerSanityCall({
      provider,
      fixtureId,
      apiKey,
      qwenEndpointUrl,
      dossierLedger: dossierBenchmark,
      dossierResultats: join(dossierBenchmark, '.sanity-results'),
    })

    console.log(
      `Terminé — entryId=${resultat.entryId} ledgerStatus=${resultat.ledgerStatus} ENGINE=${resultat.benchmarkRun.engine.statut} coût=${resultat.benchmarkRun.usage.coutUsd ?? 'INCONNU (pending)'} USD`
    )
    console.log(`Résultat : ${resultat.cheminResultat}`)
  } catch (erreur) {
    console.error(`ÉCHEC : ${erreur instanceof Error ? erreur.message : String(erreur)}`)
    process.exitCode = 1
  }
}

if (require.main === module) {
  main()
}
