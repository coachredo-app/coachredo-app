// ============================================================
// BENCHMARK-MFR V1 — Adapter benchmark Anthropic Claude — Phase 2A
// ============================================================
// Candidat QG : Claude Sonnet 5.5, classification NATIF SOUS RÉSERVE
// de disponibilité effective du feature sur ce modèle précis (voir
// rapport matrice providers 2026-10-17) — points encore NON VÉRIFIÉS :
//   (1) la documentation trouvée liste le mode Structured Outputs natif
//       comme GA pour Claude 4.5/4.6/4.7 + Haiku 4.5 — Sonnet 5.5
//       n'apparaît pas nommément dans cette liste précise ;
//   (2) « pas de `$ref` externe » — nos `$ref` sont INTERNES
//       (`#/$defs/...`), portée exacte de « externe » non confirmée.
//
// DOCTRINE VERROUILLÉE (QG, micro-correctif post-audit Phase 2A) :
// Anthropic reçoit le schéma canonique INCHANGÉ, sans exception et sans
// fonction d'adaptation disponible — aucune transformation, aucun
// retrait de contrainte (y compris `minItems`), quelle que soit la
// justification technique invoquée. Si Claude Sonnet 5.5 ne respecte
// pas réellement ce schéma lors d'un futur sanity call, c'est un
// handicap/échec de ce provider à MESURER, jamais une raison
// d'affaiblir le contrat envoyé. Les incertitudes ci-dessus seront
// vérifiées avant ou pendant les sanity calls, pas résolues ici.

import type { AppelAdapterParams, RequeteHttp, ResultatAdapterBenchmark } from './types'

export function construireRequete(params: AppelAdapterParams): RequeteHttp {
  return {
    url: 'https://api.anthropic.com/v1/messages',
    method: 'POST',
    headers: {
      'x-api-key': params.apiKey,
      // Version d'API figée au moment de la rédaction — NON VÉRIFIÉ
      // que cette valeur soit toujours la version courante en 2026 ;
      // à confirmer avant tout sanity call réel.
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: {
      model: params.model,
      max_tokens: params.maxOutputTokens,
      system: params.promptSysteme,
      messages: [{ role: 'user', content: params.contexteSerialise }],
      output_config: {
        format: {
          type: 'json_schema',
          json_schema: { name: params.schemaName, schema: params.schema },
        },
      },
    },
  }
}

interface ReponseAnthropic {
  readonly id?: string
  readonly model?: string
  readonly stop_reason?: string
  readonly error?: { readonly type?: string; readonly message?: string }
  readonly content?: ReadonlyArray<{ readonly type?: string; readonly text?: string }>
  readonly usage?: { readonly input_tokens?: number; readonly output_tokens?: number }
}

export function parserReponse(statusHttp: number, body: unknown): ResultatAdapterBenchmark {
  const usageVide = { inputTokens: null, outputTokens: null, reasoningTokens: null, coutUsd: null }
  const reponse = body as ReponseAnthropic

  if (statusHttp >= 400) {
    return {
      statutTechnique: 'echec_provider',
      rawText: null,
      usage: usageVide,
      metadonnees: { responseId: null, modelRetourne: null, brut: reponse?.error ? { ...reponse.error } : { statusHttp } },
    }
  }

  const usage = {
    inputTokens: reponse.usage?.input_tokens ?? null,
    outputTokens: reponse.usage?.output_tokens ?? null,
    reasoningTokens: null,
    coutUsd: null,
  }
  const metadonnees = { responseId: reponse.id ?? null, modelRetourne: reponse.model ?? null }

  const texteItem = reponse.content?.find(c => c.type === 'text')

  if (reponse.stop_reason === 'max_tokens') {
    return { statutTechnique: 'incomplete', rawText: texteItem?.text ?? null, usage, metadonnees: { ...metadonnees, brut: { stop_reason: reponse.stop_reason } } }
  }
  if (reponse.stop_reason === 'refusal') {
    return { statutTechnique: 'refusal', rawText: texteItem?.text ?? null, usage, metadonnees }
  }
  // `end_turn` = succès attendu. Tout autre `stop_reason` non reconnu
  // (ex. `tool_use`, `stop_sequence`, ou une valeur future inconnue) :
  // classé par défaut comme `echec_provider` plutôt que silencieusement
  // supposé réussi — jamais deviner qu'un statut inconnu signifie un
  // succès (discipline défensive explicite, pas une réparation).
  if (reponse.stop_reason !== 'end_turn') {
    return {
      statutTechnique: 'echec_provider',
      rawText: null,
      usage,
      metadonnees: { ...metadonnees, brut: { stop_reason_non_reconnu: reponse.stop_reason ?? null } },
    }
  }
  if (!texteItem?.text) {
    return { statutTechnique: 'payload_absent', rawText: null, usage, metadonnees }
  }
  return { statutTechnique: 'succes', rawText: texteItem.text, usage, metadonnees }
}

/** Exécuteur réel — JAMAIS invoqué dans cette phase. */
export async function appellerAnthropicPourBenchmark(params: AppelAdapterParams): Promise<ResultatAdapterBenchmark> {
  const requete = construireRequete(params)
  const controleur = new AbortController()
  const timeout = setTimeout(() => controleur.abort(), params.timeoutMs)
  try {
    const reponseHttp = await fetch(requete.url, {
      method: requete.method,
      headers: requete.headers,
      body: JSON.stringify(requete.body),
      signal: controleur.signal,
    })
    const corpsJson = await reponseHttp.json()
    return parserReponse(reponseHttp.status, corpsJson)
  } catch (erreur) {
    return {
      statutTechnique: 'erreur_reseau',
      rawText: null,
      usage: { inputTokens: null, outputTokens: null, reasoningTokens: null, coutUsd: null },
      metadonnees: { responseId: null, modelRetourne: null, brut: { erreur: erreur instanceof Error ? erreur.message : String(erreur) } },
    }
  } finally {
    clearTimeout(timeout)
  }
}
