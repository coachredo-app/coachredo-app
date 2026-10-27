// ============================================================
// MFR V1 — Provider OpenAI (Responses API, Structured Outputs) — T-MFR.3D
// ============================================================
// Module server-only minimal — jamais importé côté client. Même
// discipline que src/lib/mfr/stripe/client.ts : SDK officiel, clé en
// variable d'environnement, aucun wrapper superflu. Décision 0 fermée,
// non rouverte ici : OpenAI, Responses API, `gpt-6.1-sol` (modèle
// validé par le benchmark de décision provider, QG, 2026-10-20 —
// remplace la référence historique `gpt-6-astra`), Structured
// Outputs strict, aucun retry automatique, aucune réparation
// automatique — ce module ne fait qu'UN seul appel et retourne un
// résultat discriminé ; il ne décide jamais de retry ni n'interprète la
// doctrine MFR (ça reste le rôle de l'orchestrateur + du validator).
//
// Vérifié directement contre le SDK `openai` réellement installé
// (node_modules/openai, version 7.36.0, T-MFR.3D) — pas seulement la
// documentation web : `Response.status`, `Response.incomplete_details`,
// `ResponseOutputMessage.content: Array<ResponseOutputText |
// ResponseOutputRefusal>`, `Response.usage`, `Response.id`, option
// `timeout` par requête (internal/request-options.d.ts). Aucune
// garantie empirique au-delà de cette lecture de types — ce module n'a
// jamais été exercé contre un vrai appel (interdit dans cette passe).

import OpenAI from 'openai'
import { construireJsonSchemaAnalyseSortieBrute, NOM_SCHEMA_ANALYSE_SORTIE_BRUTE } from './schema'
import { construireJsonSchemaRedactionSortieBrute, NOM_SCHEMA_REDACTION_SORTIE_BRUTE } from './redactionSchema'

// Instancié paresseusement — jamais au chargement du module, pour ne
// jamais exiger OPENAI_API_KEY dans un contexte qui n'appelle pas
// réellement le provider (ex. tests fakes, cette passe incluse).
let client: OpenAI | undefined
function obtenirClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  }
  return client
}

export const MODELE_MFR_V1 = 'gpt-6.1-sol' as const

export interface MetadonneesAppelProvider {
  readonly responseId: string | null
  readonly model: string | null
  readonly usage: {
    readonly inputTokens: number
    readonly outputTokens: number
    readonly totalTokens: number
  } | null
}

/**
 * Résultat discriminé d'un appel provider — jamais une exception non
 * typée remontée à l'appelant (l'orchestrateur transforme cette union
 * en comportement FINISH, jamais ce module directement).
 */
export type ResultatAppelProvider =
  | { readonly type: 'succes'; readonly payload: unknown; readonly metadonnees: MetadonneesAppelProvider }
  | { readonly type: 'refusal'; readonly texte: string; readonly metadonnees: MetadonneesAppelProvider }
  | { readonly type: 'incomplete'; readonly raison: string | null; readonly fragment: unknown; readonly metadonnees: MetadonneesAppelProvider }
  /** `response.status === 'failed'` — échec signalé par le provider lui-même
   * (`response.error`), distinct d'une troncature ou d'un refus de contenu.
   * Trouvé en relisant le SDK réellement installé (T-MFR.3D, non anticipé
   * par la conception précédente) — voir rapport, divergence signalée. */
  | { readonly type: 'echec_provider'; readonly code: string; readonly message: string; readonly metadonnees: MetadonneesAppelProvider }
  /** Reçu mais pas du JSON valide — ne devrait normalement jamais
   * survenir en mode strict réel (décodage contraint par grammaire),
   * prévu défensivement (conception T-MFR.3D §10.G). */
  | { readonly type: 'payload_non_json'; readonly texteBrut: string; readonly metadonnees: MetadonneesAppelProvider }
  | { readonly type: 'payload_absent'; readonly metadonnees: MetadonneesAppelProvider }
  | { readonly type: 'erreur_reseau'; readonly erreur: string }

export interface AppelProviderParams {
  /** Prompt système/développeur complet — construit par provider/prompt.ts,
   * jamais assemblé ici (séparation contenu analytique / mécanique HTTP). */
  readonly promptSysteme: string
  /** Contexte MFR sérialisé — jamais `sourceBindings`, jamais un UUID DB
   * (garanti par l'appelant, pas revérifié ici). */
  readonly contexteSerialise: string
  readonly timeoutMs: number
}

function extraireUsage(usage: OpenAI.Responses.ResponseUsage | undefined): MetadonneesAppelProvider['usage'] {
  if (!usage) return null
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
  }
}

function extraireMetadonnees(response: OpenAI.Responses.Response): MetadonneesAppelProvider {
  return {
    responseId: response.id ?? null,
    model: typeof response.model === 'string' ? response.model : null,
    usage: extraireUsage(response.usage),
  }
}

/**
 * Mécanique générique d'un seul appel Responses API, Structured
 * Outputs strict — partagée par l'analyse et la rédaction (T-MFR.5A,
 * extraction minimale, aucun changement de comportement pour l'appel
 * d'analyse déjà en production). Aucun retry, aucune réparation —
 * Décision 0 fermée. Ne lève jamais : toute erreur (réseau, timeout,
 * HTTP) est capturée et retournée comme `{type:'erreur_reseau'}`,
 * jamais une exception non typée.
 */
async function appellerOpenAiResponsesApi(args: {
  readonly promptSysteme: string
  readonly contexteSerialise: string
  readonly etiquetteContexte: string
  readonly nomSchema: string
  readonly schema: Record<string, unknown>
  readonly timeoutMs: number
}): Promise<ResultatAppelProvider> {
  let response: OpenAI.Responses.Response
  try {
    response = await obtenirClient().responses.create(
      {
        model: MODELE_MFR_V1,
        input: `${args.promptSysteme}\n\n---\n\n${args.etiquetteContexte} (JSON) :\n${args.contexteSerialise}`,
        text: {
          format: {
            type: 'json_schema',
            name: args.nomSchema,
            strict: true,
            schema: args.schema,
          },
        },
      },
      { timeout: args.timeoutMs }
    )
  } catch (erreur) {
    return { type: 'erreur_reseau', erreur: erreur instanceof Error ? erreur.message : 'Erreur réseau inconnue.' }
  }

  const metadonnees = extraireMetadonnees(response)

  if (response.status === 'failed') {
    return {
      type: 'echec_provider',
      code: response.error?.code ?? 'inconnu',
      message: response.error?.message ?? 'Échec signalé par le provider, sans détail disponible.',
      metadonnees,
    }
  }

  if (response.status === 'incomplete') {
    return {
      type: 'incomplete',
      raison: response.incomplete_details?.reason ?? null,
      fragment: extraireFragmentDefensif(response),
      metadonnees,
    }
  }

  const message = response.output.find((item): item is OpenAI.Responses.ResponseOutputMessage => item.type === 'message')
  if (!message) {
    return { type: 'payload_absent', metadonnees }
  }

  const refus = message.content.find((c): c is OpenAI.Responses.ResponseOutputRefusal => c.type === 'refusal')
  if (refus) {
    return { type: 'refusal', texte: refus.refusal, metadonnees }
  }

  const texte = message.content.find((c): c is OpenAI.Responses.ResponseOutputText => c.type === 'output_text')
  if (!texte) {
    return { type: 'payload_absent', metadonnees }
  }

  try {
    const payload: unknown = JSON.parse(texte.text)
    return { type: 'succes', payload, metadonnees }
  } catch {
    // Défensif uniquement — ne devrait jamais survenir en mode strict
    // réel (conception T-MFR.3D §10.G), jamais observé, pas un cas
    // normal à attendre.
    return { type: 'payload_non_json', texteBrut: texte.text, metadonnees }
  }
}

/** Appel d'analyse — comportement strictement inchangé par rapport à
 * avant l'extraction T-MFR.5A (même modèle, même schéma, même
 * étiquette de contexte). */
export async function appellerOpenAiPourAnalyseMfr(params: AppelProviderParams): Promise<ResultatAppelProvider> {
  return appellerOpenAiResponsesApi({
    promptSysteme: params.promptSysteme,
    contexteSerialise: params.contexteSerialise,
    etiquetteContexte: 'MfrAnalysisContext',
    nomSchema: NOM_SCHEMA_ANALYSE_SORTIE_BRUTE,
    schema: construireJsonSchemaAnalyseSortieBrute(),
    timeoutMs: params.timeoutMs,
  })
}

/** Appel de rédaction — T-MFR.5A. Même mécanique HTTP/Structured
 * Outputs que l'analyse, schéma et étiquette de contexte propres à la
 * rédaction. */
export async function appellerOpenAiPourRedactionMfr(params: AppelProviderParams): Promise<ResultatAppelProvider> {
  return appellerOpenAiResponsesApi({
    promptSysteme: params.promptSysteme,
    contexteSerialise: params.contexteSerialise,
    etiquetteContexte: 'MfrWritingContext',
    nomSchema: NOM_SCHEMA_REDACTION_SORTIE_BRUTE,
    schema: construireJsonSchemaRedactionSortieBrute(),
    timeoutMs: params.timeoutMs,
  })
}

/** Fragment best-effort en cas de troncature — jamais une tentative de
 * réparation, uniquement pour `output_brut` (audit). */
function extraireFragmentDefensif(response: OpenAI.Responses.Response): unknown {
  const message = response.output.find((item): item is OpenAI.Responses.ResponseOutputMessage => item.type === 'message')
  const texte = message?.content.find((c): c is OpenAI.Responses.ResponseOutputText => c.type === 'output_text')
  return texte?.text ?? null
}
