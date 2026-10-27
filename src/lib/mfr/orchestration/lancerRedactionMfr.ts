// ============================================================
// MFR V1 — Orchestrateur de rédaction réelle — T-MFR.5A
// ============================================================
// Compose exactement : demarrerRedaction → construireMfrWritingContext
// → provider (injecté) → validerEtResoudreRedactionSortieBrute →
// finirRedactionSucces OU finirRedactionEchec. Même machine FINISH
// verrouillée que `lancerAnalyseMfr.ts` (T-MFR.3D) : aucune boucle,
// aucun retry caché.
//   A. FINISH SUCCESS échoue → UNE SEULE tentative de FINISH FAILURE.
//   B. ce fallback échoue → erreur critique, EN_COURS signalé explicitement.
//   C. FINISH FAILURE initial échoue → erreur critique, EN_COURS signalé.
//
// Reprise explicite après ÉCHEC (migration 026, exact pendant de
// `lancerAnalyseMfr.ts`/019) : `mode: 'REPRISE_APRES_ECHEC'` appelle
// `relancerRedactionApresEchec` au lieu de `demarrerRedaction` — tout
// le reste (contexte, provider, validation, FINISH) reste strictement
// identique quel que soit le mode. Jamais automatique : un geste
// explicite distinct, jamais déclenché par cette fonction elle-même.
//
// Injection minimale (`deps`), même discipline que `lancerAnalyseMfr.ts` :
// chaque brique DB est substituable pour les tests dynamiques, jamais
// pour changer le comportement réel.

import { construireMfrWritingContext } from '../context/writingBuilder'
import { demarrerRedaction, relancerRedactionApresEchec, finirRedactionEchec, finirRedactionSucces } from '../server/redaction'
import { validerEtResoudreRedactionSortieBrute } from '../redaction/validator'
import type { MetadonneesAppelProvider, ResultatAppelProvider } from '../provider/openai'

type SupabaseService = Parameters<typeof demarrerRedaction>[0]

export interface LancerRedactionMfrDeps {
  readonly demarrerRedaction: typeof demarrerRedaction
  readonly relancerRedactionApresEchec: typeof relancerRedactionApresEchec
  readonly construireMfrWritingContext: typeof construireMfrWritingContext
  readonly finirRedactionEchec: typeof finirRedactionEchec
  readonly finirRedactionSucces: typeof finirRedactionSucces
}

const DEPS_REELLES: LancerRedactionMfrDeps = {
  demarrerRedaction,
  relancerRedactionApresEchec,
  construireMfrWritingContext,
  finirRedactionEchec,
  finirRedactionSucces,
}

export type LancerRedactionMfrResultat =
  | { readonly statut: 'SUCCES'; readonly redactionId: string; readonly versionId: string; readonly numeroVersion: number }
  | { readonly statut: 'ECHEC'; readonly redactionId: string; readonly erreur: string }
  | { readonly statut: 'ECHEC_AVANT_REDACTION'; readonly erreur: string }
  | { readonly statut: 'ERREUR_CRITIQUE_TERMINAISON'; readonly redactionId: string; readonly erreur: string }

export interface AppelProviderFn {
  (params: { readonly promptSysteme: string; readonly contexteSerialise: string; readonly timeoutMs: number }): Promise<ResultatAppelProvider>
}

export interface LancerRedactionMfrParams {
  readonly service: SupabaseService
  readonly cycleId: string
  readonly analyseId: string
  readonly curationId: string
  readonly metadata: { readonly provider: string; readonly model: string; readonly promptVersion: string; readonly schemaVersion: string }
  /** Discriminant de démarrage — seul ce choix varie entre les deux
   * modes ; contexte/provider/validation/FINISH restent strictement
   * identiques (même arbitrage que `lancerAnalyseMfr.ts`, T-MFR.3D/5A).
   * Défaut PREMIERE_REDACTION. */
  readonly mode?: 'PREMIERE_REDACTION' | 'REPRISE_APRES_ECHEC'
  readonly promptSysteme: string
  readonly appelerProvider: AppelProviderFn
  readonly timeoutMs: number
  readonly deps?: Partial<LancerRedactionMfrDeps>
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
  deps: LancerRedactionMfrDeps,
  service: SupabaseService,
  redactionId: string,
  erreur: string,
  outputBrut: unknown
): Promise<LancerRedactionMfrResultat> {
  const resultat = await deps.finirRedactionEchec(service, redactionId, erreur, outputBrut)
  if ('error' in resultat) {
    return { statut: 'ERREUR_CRITIQUE_TERMINAISON', redactionId, erreur: `finish_failure_echoue:${resultat.error}` }
  }
  return { statut: 'ECHEC', redactionId, erreur }
}

async function terminaliserSucces(
  deps: LancerRedactionMfrDeps,
  service: SupabaseService,
  redactionId: string,
  outputBrut: unknown,
  contenu: unknown
): Promise<LancerRedactionMfrResultat> {
  const resultat = await deps.finirRedactionSucces(service, redactionId, outputBrut, contenu)
  if ('error' in resultat) {
    const fallback = await deps.finirRedactionEchec(service, redactionId, `finish_succes_echoue:${resultat.error}`, outputBrut)
    if ('error' in fallback) {
      return {
        statut: 'ERREUR_CRITIQUE_TERMINAISON',
        redactionId,
        erreur: `finish_succes_echoue_et_fallback_echoue:${resultat.error}|${fallback.error}`,
      }
    }
    return { statut: 'ECHEC', redactionId, erreur: `finish_succes_echoue:${resultat.error}` }
  }
  if (resultat.alreadyTerminal || resultat.versionId === null || resultat.numeroVersion === null) {
    // Idempotence : déjà terminale (ex. double appel) — pas un cas
    // d'usage normal pour un appel unique réel, mais jamais un crash.
    return { statut: 'ECHEC', redactionId, erreur: 'finish_succes_already_terminal_sans_version' }
  }
  return { statut: 'SUCCES', redactionId, versionId: resultat.versionId, numeroVersion: resultat.numeroVersion }
}

export async function lancerRedactionMfr(params: LancerRedactionMfrParams): Promise<LancerRedactionMfrResultat> {
  const deps: LancerRedactionMfrDeps = { ...DEPS_REELLES, ...params.deps }

  const demarrageResultat =
    params.mode === 'REPRISE_APRES_ECHEC'
      ? await deps.relancerRedactionApresEchec(params.service, params.cycleId, params.analyseId, params.curationId, params.metadata)
      : await deps.demarrerRedaction(params.service, params.cycleId, params.analyseId, params.curationId, params.metadata)
  if ('error' in demarrageResultat) {
    return { statut: 'ECHEC_AVANT_REDACTION', erreur: demarrageResultat.error }
  }
  const redactionId = demarrageResultat.redactionId

  const contexteResultat = await deps.construireMfrWritingContext(params.service, params.cycleId, params.analyseId, params.curationId)
  if (!contexteResultat.ok) {
    return terminaliserEchec(deps, params.service, redactionId, `construction_contexte_echouee:${contexteResultat.anomalie.type}`, null)
  }

  const appelResultat = await params.appelerProvider({
    promptSysteme: params.promptSysteme,
    contexteSerialise: JSON.stringify(contexteResultat.context),
    timeoutMs: params.timeoutMs,
  })

  if (appelResultat.type === 'erreur_reseau') {
    return terminaliserEchec(deps, params.service, redactionId, `erreur_reseau:${appelResultat.erreur}`, null)
  }
  if (appelResultat.type === 'echec_provider') {
    const enveloppe = construireEnveloppeOutputBrut({ payload: null, finishSignal: 'echec_provider', metadonnees: appelResultat.metadonnees, incompleteReason: null })
    return terminaliserEchec(deps, params.service, redactionId, `echec_provider:${appelResultat.code}:${appelResultat.message}`, enveloppe)
  }
  if (appelResultat.type === 'refusal') {
    const enveloppe = construireEnveloppeOutputBrut({ payload: appelResultat.texte, finishSignal: 'refusal', metadonnees: appelResultat.metadonnees, incompleteReason: null })
    return terminaliserEchec(deps, params.service, redactionId, 'refusal_provider', enveloppe)
  }
  if (appelResultat.type === 'incomplete') {
    const enveloppe = construireEnveloppeOutputBrut({ payload: appelResultat.fragment, finishSignal: 'incomplete', metadonnees: appelResultat.metadonnees, incompleteReason: appelResultat.raison })
    return terminaliserEchec(deps, params.service, redactionId, `incomplete:${appelResultat.raison ?? 'raison_inconnue'}`, enveloppe)
  }
  if (appelResultat.type === 'payload_non_json') {
    const enveloppe = construireEnveloppeOutputBrut({ payload: appelResultat.texteBrut, finishSignal: 'payload_non_json', metadonnees: appelResultat.metadonnees, incompleteReason: null })
    return terminaliserEchec(deps, params.service, redactionId, 'payload_non_json', enveloppe)
  }
  if (appelResultat.type === 'payload_absent') {
    const enveloppe = construireEnveloppeOutputBrut({ payload: null, finishSignal: 'payload_absent', metadonnees: appelResultat.metadonnees, incompleteReason: null })
    return terminaliserEchec(deps, params.service, redactionId, 'payload_absent', enveloppe)
  }

  // appelResultat.type === 'succes'
  const enveloppeRecue = construireEnveloppeOutputBrut({ payload: appelResultat.payload, finishSignal: 'completed', metadonnees: appelResultat.metadonnees, incompleteReason: null })

  const validation = validerEtResoudreRedactionSortieBrute(appelResultat.payload, contexteResultat.context, contexteResultat.hypothesisBindings, {
    cycleId: contexteResultat.cycleId,
    analyseId: contexteResultat.analyseId,
    curationId: contexteResultat.curationId,
    recommandationConfirmee: contexteResultat.recommandationConfirmee,
  })
  if (!validation.ok) {
    const erreurSerialisee = validation.diagnostics.map(d => `${d.categorie}:${d.code}${d.chemin ? `@${d.chemin}` : ''}`).join('; ')
    return terminaliserEchec(deps, params.service, redactionId, erreurSerialisee, enveloppeRecue)
  }

  return terminaliserSucces(deps, params.service, redactionId, enveloppeRecue, validation.contenu)
}
