// ============================================================
// MFR V1 — Orchestrateur d'analyse réelle — T-MFR.3D
// ============================================================
// Compose exactement : obtenirOuCreerCycle → demarrerPremiereAnalyse →
// construireMfrAnalysisContext → provider (injecté) → contrôle de
// l'enveloppe → validerEtResoudreSortieBrute → finirAnalyseSucces OU
// finirAnalyseEchec. Aucune brique ci-dessous n'est réécrite — toutes
// déjà existantes (T-MFR.3A/3B/3C). `appelerProvider` est injecté en
// paramètre (jamais importé en dur) pour rester exerçable par fakes,
// sans toucher OpenAI ni Supabase réels (conception T-MFR.3D §F).
//
// `sourceBindings` ne quitte jamais cette fonction : reçu de
// `construireMfrAnalysisContext`, utilisé uniquement en mémoire locale
// pour la validation, jamais sérialisé, jamais loggué, jamais transmis
// à `appelerProvider`.
//
// Machine FINISH verrouillée (arbitrage QG, T-MFR.3D) : aucune boucle,
// aucun retry caché.
//   A. FINISH SUCCESS échoue → UNE SEULE tentative de FINISH FAILURE.
//   B. ce fallback échoue → erreur critique, EN_COURS signalé explicitement.
//   C. FINISH FAILURE initial échoue → erreur critique, EN_COURS signalé.
//
// Injection minimale (`deps`, T-MFR.3D complément de validation) :
// chaque brique DB (cycle/démarrage/contexte/FINISH) est substituable,
// par défaut les implémentations réelles ci-dessous — aucun appelant
// réel n'est affecté (champ optionnel, zéro call site existant avant ce
// chantier). Seul but : exercer dynamiquement la machine d'échec avec
// des fakes, sans toucher Supabase/OpenAI réels ni réécrire la logique.

import { construireMfrAnalysisContext } from '../context/builder'
import { demarrerPremiereAnalyse, finirAnalyseEchec, finirAnalyseSucces } from '../server/analyse'
import { obtenirOuCreerCycle } from '../server/cycle'
import type { AnalyseMetadata } from '../server/types'
import { validerEtResoudreSortieBrute } from '../analysis/validator'
import type { AnalyseGrapheResolu } from '../server/types'
import type { MetadonneesAppelProvider, ResultatAppelProvider } from '../provider/openai'

type SupabaseAuthentifie = Parameters<typeof obtenirOuCreerCycle>[0]
type SupabaseService = Parameters<typeof finirAnalyseSucces>[0]

/** Seam d'injection minimal — chaque fonction par défaut sur son
 * implémentation réelle (T-MFR.3A/3B). Substituable par fakes pour les
 * tests dynamiques, jamais utilisé pour changer le comportement réel. */
export interface LancerAnalyseMfrDeps {
  readonly obtenirOuCreerCycle: typeof obtenirOuCreerCycle
  readonly demarrerPremiereAnalyse: typeof demarrerPremiereAnalyse
  readonly construireMfrAnalysisContext: typeof construireMfrAnalysisContext
  readonly finirAnalyseEchec: typeof finirAnalyseEchec
  readonly finirAnalyseSucces: typeof finirAnalyseSucces
}

const DEPS_REELLES: LancerAnalyseMfrDeps = {
  obtenirOuCreerCycle,
  demarrerPremiereAnalyse,
  construireMfrAnalysisContext,
  finirAnalyseEchec,
  finirAnalyseSucces,
}

export type LancerAnalyseMfrResultat =
  | { readonly statut: 'SUCCES'; readonly analyseId: string }
  | { readonly statut: 'ECHEC'; readonly analyseId: string; readonly erreur: string }
  /** Aucune ligne `mfr_analyses` créée — rien à terminaliser. */
  | { readonly statut: 'ECHEC_AVANT_ANALYSE'; readonly erreur: string }
  /** FINISH (succès ou échec, y compris le fallback unique) a lui-même
   * échoué — l'analyse peut être restée `EN_COURS` en base. Aucun retry
   * automatique : intervention manuelle requise (hors périmètre 3D). */
  | { readonly statut: 'ERREUR_CRITIQUE_TERMINAISON'; readonly analyseId: string; readonly erreur: string }

export interface AppelProviderFn {
  (params: { readonly promptSysteme: string; readonly contexteSerialise: string; readonly timeoutMs: number }): Promise<ResultatAppelProvider>
}

export interface LancerAnalyseMfrParams {
  readonly supabaseAuthentifie: SupabaseAuthentifie
  readonly supabaseService: SupabaseService
  readonly etatLogiqueId: string
  readonly metadata: AnalyseMetadata
  readonly promptSysteme: string
  /** Injecté — jamais importé en dur, pour rester exerçable par fakes. */
  readonly appelerProvider: AppelProviderFn
  readonly timeoutMs: number
  /** Optionnel — par défaut les implémentations réelles (DEPS_REELLES).
   * Seam de test, jamais une variante de comportement métier. */
  readonly deps?: Partial<LancerAnalyseMfrDeps>
}

interface EnveloppeOutputBrut {
  readonly payload: unknown
  readonly provider: 'openai'
  readonly model: string | null
  readonly responseId: string | null
  readonly finishSignal: 'completed' | 'incomplete' | 'refusal' | 'payload_non_json' | 'payload_absent' | 'echec_provider'
  readonly incompleteReason: string | null
  readonly usage: MetadonneesAppelProvider['usage']
}

function construireEnveloppeOutputBrut(args: {
  readonly payload: unknown
  readonly finishSignal: EnveloppeOutputBrut['finishSignal']
  readonly metadonnees: MetadonneesAppelProvider
  readonly incompleteReason: string | null
}): EnveloppeOutputBrut {
  return {
    payload: args.payload,
    provider: 'openai',
    model: args.metadonnees.model,
    responseId: args.metadonnees.responseId,
    finishSignal: args.finishSignal,
    incompleteReason: args.incompleteReason,
    usage: args.metadonnees.usage,
  }
}

async function terminaliserEchec(
  deps: LancerAnalyseMfrDeps,
  service: SupabaseService,
  analyseId: string,
  erreur: string,
  outputBrut: unknown
): Promise<LancerAnalyseMfrResultat> {
  const resultat = await deps.finirAnalyseEchec(service, analyseId, erreur, outputBrut)
  if ('error' in resultat) {
    // Cas C (initial) ou B (fallback, voir terminaliserSucces) — aucun
    // retry automatique, erreur critique remontée explicitement.
    return { statut: 'ERREUR_CRITIQUE_TERMINAISON', analyseId, erreur: `finish_failure_echoue:${resultat.error}` }
  }
  return { statut: 'ECHEC', analyseId, erreur }
}

async function terminaliserSucces(
  deps: LancerAnalyseMfrDeps,
  service: SupabaseService,
  analyseId: string,
  outputBrut: unknown,
  graphe: AnalyseGrapheResolu
): Promise<LancerAnalyseMfrResultat> {
  const resultat = await deps.finirAnalyseSucces(service, analyseId, outputBrut, graphe)
  if (!('error' in resultat)) {
    return { statut: 'SUCCES', analyseId }
  }
  // Cas A : FINISH SUCCESS échoue → une seule tentative de fallback
  // FINISH FAILURE (règle QG verrouillée, T-MFR.3D §D) — jamais de
  // boucle, jamais un second essai de SUCCESS.
  const fallback = await deps.finirAnalyseEchec(service, analyseId, `finish_succes_echoue:${resultat.error}`, outputBrut)
  if ('error' in fallback) {
    return {
      statut: 'ERREUR_CRITIQUE_TERMINAISON',
      analyseId,
      erreur: `finish_succes_echoue_et_fallback_echoue:${resultat.error}|${fallback.error}`,
    }
  }
  return { statut: 'ECHEC', analyseId, erreur: `finish_succes_echoue:${resultat.error}` }
}

export async function lancerAnalyseMfr(params: LancerAnalyseMfrParams): Promise<LancerAnalyseMfrResultat> {
  const deps: LancerAnalyseMfrDeps = { ...DEPS_REELLES, ...params.deps }

  const cycleResultat = await deps.obtenirOuCreerCycle(params.supabaseAuthentifie, params.etatLogiqueId)
  if ('error' in cycleResultat) {
    return { statut: 'ECHEC_AVANT_ANALYSE', erreur: cycleResultat.error }
  }

  const demarrageResultat = await deps.demarrerPremiereAnalyse(params.supabaseAuthentifie, cycleResultat.cycleId, params.metadata)
  if ('error' in demarrageResultat) {
    return { statut: 'ECHEC_AVANT_ANALYSE', erreur: demarrageResultat.error }
  }
  const analyseId = demarrageResultat.analyseId

  // Après START, avant provider : toute anomalie doit terminaliser
  // l'analyse déjà EN_COURS — jamais la laisser orpheline (D-051).
  const contexteResultat = await deps.construireMfrAnalysisContext(params.supabaseAuthentifie, params.etatLogiqueId)
  if (!contexteResultat.ok) {
    return terminaliserEchec(deps, params.supabaseService, analyseId, `construction_contexte_echouee:${contexteResultat.anomalie.type}`, null)
  }

  const appelResultat = await params.appelerProvider({
    promptSysteme: params.promptSysteme,
    contexteSerialise: JSON.stringify(contexteResultat.context),
    timeoutMs: params.timeoutMs,
  })

  if (appelResultat.type === 'erreur_reseau') {
    // Aucune réponse provider — output_brut NULL explicite (D-054 §L).
    return terminaliserEchec(deps, params.supabaseService, analyseId, `erreur_reseau:${appelResultat.erreur}`, null)
  }

  if (appelResultat.type === 'echec_provider') {
    const enveloppe = construireEnveloppeOutputBrut({
      payload: null,
      finishSignal: 'echec_provider',
      metadonnees: appelResultat.metadonnees,
      incompleteReason: null,
    })
    return terminaliserEchec(deps, params.supabaseService, analyseId, `echec_provider:${appelResultat.code}:${appelResultat.message}`, enveloppe)
  }

  if (appelResultat.type === 'refusal') {
    const enveloppe = construireEnveloppeOutputBrut({
      payload: appelResultat.texte,
      finishSignal: 'refusal',
      metadonnees: appelResultat.metadonnees,
      incompleteReason: null,
    })
    return terminaliserEchec(deps, params.supabaseService, analyseId, 'refusal_provider', enveloppe)
  }

  if (appelResultat.type === 'incomplete') {
    const enveloppe = construireEnveloppeOutputBrut({
      payload: appelResultat.fragment,
      finishSignal: 'incomplete',
      metadonnees: appelResultat.metadonnees,
      incompleteReason: appelResultat.raison,
    })
    return terminaliserEchec(deps, params.supabaseService, analyseId, `incomplete:${appelResultat.raison ?? 'raison_inconnue'}`, enveloppe)
  }

  if (appelResultat.type === 'payload_non_json') {
    const enveloppe = construireEnveloppeOutputBrut({
      payload: appelResultat.texteBrut,
      finishSignal: 'payload_non_json',
      metadonnees: appelResultat.metadonnees,
      incompleteReason: null,
    })
    return terminaliserEchec(deps, params.supabaseService, analyseId, 'payload_non_json', enveloppe)
  }

  if (appelResultat.type === 'payload_absent') {
    const enveloppe = construireEnveloppeOutputBrut({
      payload: null,
      finishSignal: 'payload_absent',
      metadonnees: appelResultat.metadonnees,
      incompleteReason: null,
    })
    return terminaliserEchec(deps, params.supabaseService, analyseId, 'payload_absent', enveloppe)
  }

  // appelResultat.type === 'succes' — payload structurellement reçu,
  // jamais présupposé valide : validerEtResoudreSortieBrute tranche.
  const enveloppeRecue = construireEnveloppeOutputBrut({
    payload: appelResultat.payload,
    finishSignal: 'completed',
    metadonnees: appelResultat.metadonnees,
    incompleteReason: null,
  })

  const validation = validerEtResoudreSortieBrute(appelResultat.payload, contexteResultat.sourceBindings)
  if (!validation.ok) {
    const erreurSerialisee = validation.diagnostics.map(d => `${d.categorie}:${d.code}${d.chemin ? `@${d.chemin}` : ''}`).join('; ')
    return terminaliserEchec(deps, params.supabaseService, analyseId, erreurSerialisee, enveloppeRecue)
  }

  return terminaliserSucces(deps, params.supabaseService, analyseId, enveloppeRecue, validation.graphe)
}
