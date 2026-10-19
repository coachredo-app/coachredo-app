// ============================================================
// BENCHMARK-MFR V1 — Tests OFFLINE des 6 adapters — Phase 2A
// ============================================================
// Script plain (aucun framework de test, aucune nouvelle dépendance),
// même discipline que `offline.test.ts`/`ledger.test.ts`. Teste
// UNIQUEMENT les fonctions pures `construireRequete`/`parserReponse`
// de chaque adapter, avec des corps de réponse fictifs construits à la
// forme documentée (voir rapport matrice providers 2026-10-17) —
// JAMAIS un appel réseau réel. `appellerXxxPourBenchmark` n'est
// invoquée NULLE PART dans ce fichier (zéro `fetch` réellement exécuté
// dans toute cette passe).
//
// Schéma/prompt réutilisés par IMPORT DIRECT depuis la production
// (jamais copiés), même discipline que `offline.test.ts` Phase 1.

import { construireJsonSchemaAnalyseSortieBrute, NOM_SCHEMA_ANALYSE_SORTIE_BRUTE } from '../../src/lib/mfr/provider/schema'
import { construirePromptSystemeAnalyseMfr } from '../../src/lib/mfr/provider/prompt'
import type { AppelAdapterParams } from './adapters/types'

import * as OpenAiAdapter from './adapters/openai'
import * as GeminiAdapter from './adapters/gemini'
import * as QwenAdapter from './adapters/qwen'
import * as KimiAdapter from './adapters/kimi'
import * as MistralAdapter from './adapters/mistral'
import * as AnthropicAdapter from './adapters/anthropic'

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

const schemaCanonique = construireJsonSchemaAnalyseSortieBrute()
const promptSysteme = construirePromptSystemeAnalyseMfr()

function paramsDeTest(model: string): AppelAdapterParams {
  return {
    promptSysteme,
    contexteSerialise: JSON.stringify({ contextVersion: 1, sources: ['SRC_001', 'SRC_002'] }),
    schema: schemaCanonique,
    schemaName: NOM_SCHEMA_ANALYSE_SORTIE_BRUTE,
    model,
    apiKey: 'cle-de-test-jamais-une-vraie-cle',
    timeoutMs: 120000,
  }
}

const SORTIE_JSON_VALIDE = JSON.stringify({
  referents: [],
  propositionsAnalytiques: [],
  ancrages: [],
  hypotheses: [],
  pistes: [],
  evaluationsD025: [],
})

async function main() {
  // ============================================================
  // 0. Sanity check sur le schéma canonique réel (fonde les
  // affirmations des commentaires des adapters, pas seulement
  // supposées) — racine objet, jamais un tableau (pertinent pour Kimi).
  // ============================================================
  verifier('0. schéma canonique réel : racine type=object (jamais un tableau, pertinent pour Kimi)', (schemaCanonique as Record<string, unknown>).type === 'object')
  verifier('0. schéma canonique réel : additionalProperties:false à la racine', (schemaCanonique as Record<string, unknown>).additionalProperties === false)
  verifier('0. schéma canonique réel : $defs présent (9 définitions attendues)', Object.keys((schemaCanonique as Record<string, unknown>).$defs as Record<string, unknown>).length === 9)

  // ============================================================
  // 1. OpenAI — construireRequete
  // ============================================================
  const reqOpenAi = OpenAiAdapter.construireRequete(paramsDeTest('gpt-6.1-sol'))
  verifier('1. OpenAI : URL Responses API', reqOpenAi.url === 'https://api.openai.com/v1/responses')
  verifier('1. OpenAI : Authorization Bearer présent', reqOpenAi.headers.Authorization === 'Bearer cle-de-test-jamais-une-vraie-cle')
  verifier('1. OpenAI : text.format.strict=true', (reqOpenAi.body as any).text.format.strict === true)
  verifier('1. OpenAI : schéma transmis SANS transformation (référence identique au schéma canonique)', (reqOpenAi.body as any).text.format.schema === schemaCanonique)
  verifier('1. OpenAI : modèle transmis tel que fourni par l’appelant (gpt-6.1-sol)', (reqOpenAi.body as any).model === 'gpt-6.1-sol')

  // 1b. OpenAI — parserReponse : succès
  const repOpenAiSucces = OpenAiAdapter.parserReponse(200, {
    id: 'resp_123',
    model: 'gpt-6.1-sol',
    status: 'completed',
    output: [{ type: 'message', content: [{ type: 'output_text', text: SORTIE_JSON_VALIDE }] }],
    usage: { input_tokens: 1000, output_tokens: 300 },
  })
  verifier('1b. OpenAI succès : statutTechnique=succes', repOpenAiSucces.statutTechnique === 'succes')
  verifier('1b. OpenAI succès : rawText transmis tel quel', repOpenAiSucces.rawText === SORTIE_JSON_VALIDE)
  verifier('1b. OpenAI succès : usage.inputTokens=1000', repOpenAiSucces.usage.inputTokens === 1000)

  // 1c. OpenAI — parserReponse : refusal
  const repOpenAiRefusal = OpenAiAdapter.parserReponse(200, {
    status: 'completed',
    output: [{ type: 'message', content: [{ type: 'refusal', text: 'Je ne peux pas traiter cette demande.' }] }],
  })
  verifier('1c. OpenAI refusal : statutTechnique=refusal', repOpenAiRefusal.statutTechnique === 'refusal')

  // 1d. OpenAI — parserReponse : incomplete
  const repOpenAiIncomplete = OpenAiAdapter.parserReponse(200, {
    status: 'incomplete',
    incomplete_details: { reason: 'max_output_tokens' },
    output: [{ type: 'message', content: [{ type: 'output_text', text: '{"referents":[' }] }],
  })
  verifier('1d. OpenAI incomplete : statutTechnique=incomplete', repOpenAiIncomplete.statutTechnique === 'incomplete')

  // 1e. OpenAI — parserReponse : failed (échec provider)
  const repOpenAiFailed = OpenAiAdapter.parserReponse(200, { status: 'failed', error: { code: 'server_error', message: 'oops' } })
  verifier('1e. OpenAI failed : statutTechnique=echec_provider', repOpenAiFailed.statutTechnique === 'echec_provider')

  // 1f. OpenAI — parserReponse : erreur HTTP (4xx/5xx)
  const repOpenAiHttp500 = OpenAiAdapter.parserReponse(500, { error: { message: 'internal error' } })
  verifier('1f. OpenAI HTTP 500 : statutTechnique=echec_provider', repOpenAiHttp500.statutTechnique === 'echec_provider')

  // ============================================================
  // 2. Gemini — construireRequete
  // ============================================================
  const reqGemini = GeminiAdapter.construireRequete(paramsDeTest('gemini-3.8-flash'))
  verifier('2. Gemini : URL generateContent avec modèle dans le chemin', reqGemini.url.includes('gemini-3.8-flash:generateContent'))
  verifier('2. Gemini : header x-goog-api-key présent', reqGemini.headers['x-goog-api-key'] === 'cle-de-test-jamais-une-vraie-cle')
  verifier('2. Gemini : responseMimeType=application/json', (reqGemini.body as any).generationConfig.responseMimeType === 'application/json')
  verifier('2. Gemini : schéma transmis SANS transformation (NATIF)', (reqGemini.body as any).generationConfig.responseSchema === schemaCanonique)

  // 2b. Gemini — parserReponse : succès
  const repGeminiSucces = GeminiAdapter.parserReponse(200, {
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: SORTIE_JSON_VALIDE }] } }],
    usageMetadata: { promptTokenCount: 500, candidatesTokenCount: 200, totalTokenCount: 700 },
  })
  verifier('2b. Gemini succès : statutTechnique=succes', repGeminiSucces.statutTechnique === 'succes')
  verifier('2b. Gemini succès : usage.outputTokens=200', repGeminiSucces.usage.outputTokens === 200)

  // 2c. Gemini — parserReponse : MAX_TOKENS (incomplete)
  const repGeminiTrunc = GeminiAdapter.parserReponse(200, { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"ref' }] } }] })
  verifier('2c. Gemini MAX_TOKENS : statutTechnique=incomplete', repGeminiTrunc.statutTechnique === 'incomplete')

  // 2d. Gemini — parserReponse : SAFETY (mappé en refusal, mapping interprétatif explicite)
  const repGeminiSafety = GeminiAdapter.parserReponse(200, { candidates: [{ finishReason: 'SAFETY' }] })
  verifier('2d. Gemini SAFETY : statutTechnique=refusal (mapping interprétatif)', repGeminiSafety.statutTechnique === 'refusal')

  // 2e. Gemini — parserReponse : payload absent
  const repGeminiAbsent = GeminiAdapter.parserReponse(200, { candidates: [] })
  verifier('2e. Gemini candidats vides : statutTechnique=payload_absent', repGeminiAbsent.statutTechnique === 'payload_absent')

  // ============================================================
  // 3. Qwen — construireRequete + parserReponse (chat completions compatible)
  // ============================================================
  const reqQwen = QwenAdapter.construireRequete(paramsDeTest('qwen3.7-plus'))
  verifier('3. Qwen : URL dashscope compatible-mode', reqQwen.url === 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions')
  verifier('3. Qwen : response_format.json_schema.strict=true', (reqQwen.body as any).response_format.json_schema.strict === true)
  verifier('3. Qwen : schéma transmis SANS transformation (NATIF)', (reqQwen.body as any).response_format.json_schema.schema === schemaCanonique)
  const repQwenSucces = QwenAdapter.parserReponse(200, { id: 'q1', model: 'qwen3.7-plus', choices: [{ message: { content: SORTIE_JSON_VALIDE }, finish_reason: 'stop' }], usage: { prompt_tokens: 400, completion_tokens: 150 } })
  verifier('3b. Qwen succès : statutTechnique=succes', repQwenSucces.statutTechnique === 'succes')
  const repQwenLength = QwenAdapter.parserReponse(200, { choices: [{ message: { content: '{"ref' }, finish_reason: 'length' }] })
  verifier('3c. Qwen finish_reason=length : statutTechnique=incomplete', repQwenLength.statutTechnique === 'incomplete')
  const repQwenRefusal = QwenAdapter.parserReponse(200, { choices: [{ message: { refusal: 'non merci' } }] })
  verifier('3d. Qwen refusal explicite : statutTechnique=refusal', repQwenRefusal.statutTechnique === 'refusal')
  const repQwenErreur = QwenAdapter.parserReponse(401, { error: { message: 'invalid api key', code: 'invalid_api_key' } })
  verifier('3e. Qwen HTTP 401 : statutTechnique=echec_provider', repQwenErreur.statutTechnique === 'echec_provider')

  // ============================================================
  // 4. Kimi — construireRequete + parserReponse
  // ============================================================
  const reqKimi = KimiAdapter.construireRequete(paramsDeTest('kimi-k3'))
  verifier('4. Kimi : URL moonshot chat/completions', reqKimi.url === 'https://api.moonshot.ai/v1/chat/completions')
  verifier('4. Kimi : schéma transmis SANS transformation (handicap = garantie, pas incompatibilité confirmée)', (reqKimi.body as any).response_format.json_schema.schema === schemaCanonique)
  const repKimiSucces = KimiAdapter.parserReponse(200, { choices: [{ message: { content: SORTIE_JSON_VALIDE }, finish_reason: 'stop' }], usage: { prompt_tokens: 300, completion_tokens: 100 } })
  verifier('4b. Kimi succès : statutTechnique=succes', repKimiSucces.statutTechnique === 'succes')
  const repKimiAbsent = KimiAdapter.parserReponse(200, { choices: [] })
  verifier('4c. Kimi choices vides : statutTechnique=payload_absent', repKimiAbsent.statutTechnique === 'payload_absent')

  // ============================================================
  // 5. Mistral — construireRequete + parserReponse
  // ============================================================
  const reqMistral = MistralAdapter.construireRequete(paramsDeTest('mistral-large-4'))
  verifier('5. Mistral : URL La Plateforme chat/completions', reqMistral.url === 'https://api.mistral.ai/v1/chat/completions')
  verifier('5. Mistral : schéma transmis SANS transformation (à vérifier expérimentalement, pas une incompatibilité confirmée)', (reqMistral.body as any).response_format.json_schema.schema === schemaCanonique)
  const repMistralSucces = MistralAdapter.parserReponse(200, { choices: [{ message: { content: SORTIE_JSON_VALIDE }, finish_reason: 'stop' }], usage: { prompt_tokens: 350, completion_tokens: 120 } })
  verifier('5b. Mistral succès : statutTechnique=succes', repMistralSucces.statutTechnique === 'succes')
  const repMistral503 = MistralAdapter.parserReponse(503, { error: { message: 'service unavailable (public preview)' } })
  verifier('5c. Mistral HTTP 503 (risque preview) : statutTechnique=echec_provider', repMistral503.statutTechnique === 'echec_provider')

  // ============================================================
  // 6. Anthropic — construireRequete + parserReponse
  // ============================================================
  const reqAnthropic = AnthropicAdapter.construireRequete(paramsDeTest('claude-sonnet-5-5'))
  verifier('6. Anthropic : URL Messages API', reqAnthropic.url === 'https://api.anthropic.com/v1/messages')
  verifier('6. Anthropic : header x-api-key présent', reqAnthropic.headers['x-api-key'] === 'cle-de-test-jamais-une-vraie-cle')
  verifier('6. Anthropic : schéma transmis SANS transformation (NATIF sous réserve)', (reqAnthropic.body as any).output_config.format.json_schema.schema === schemaCanonique)

  const repAnthropicSucces = AnthropicAdapter.parserReponse(200, { id: 'msg_1', model: 'claude-sonnet-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: SORTIE_JSON_VALIDE }], usage: { input_tokens: 600, output_tokens: 250 } })
  verifier('6b. Anthropic end_turn : statutTechnique=succes', repAnthropicSucces.statutTechnique === 'succes')

  const repAnthropicMaxTokens = AnthropicAdapter.parserReponse(200, { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"ref' }] })
  verifier('6c. Anthropic max_tokens : statutTechnique=incomplete', repAnthropicMaxTokens.statutTechnique === 'incomplete')

  const repAnthropicRefusal = AnthropicAdapter.parserReponse(200, { stop_reason: 'refusal' })
  verifier('6d. Anthropic refusal : statutTechnique=refusal', repAnthropicRefusal.statutTechnique === 'refusal')

  const repAnthropicInconnu = AnthropicAdapter.parserReponse(200, { stop_reason: 'tool_use' })
  verifier('6e. Anthropic stop_reason non reconnu (tool_use) : statutTechnique=echec_provider (défensif, jamais présumé succès)', repAnthropicInconnu.statutTechnique === 'echec_provider')

  const repAnthropicHttp400 = AnthropicAdapter.parserReponse(400, { error: { type: 'invalid_request_error', message: 'bad schema' } })
  verifier('6f. Anthropic HTTP 400 : statutTechnique=echec_provider', repAnthropicHttp400.statutTechnique === 'echec_provider')

  // ============================================================
  // 7. No-repair transversal — aucun adapter ne tente de réparer un
  // payload tronqué/absent/refusé : le rawText renvoyé dans ces cas
  // reste soit `null`, soit le fragment défensif BRUT, jamais complété.
  // ============================================================
  verifier('7. OpenAI incomplete : rawText = fragment brut, jamais complété en JSON valide', repOpenAiIncomplete.rawText === '{"referents":[')
  verifier('7. Qwen incomplete : rawText = fragment brut, jamais complété', repQwenLength.rawText === '{"ref')
  verifier('7. Gemini payload_absent : rawText = null, jamais une chaîne vide substituée', repGeminiAbsent.rawText === null)
  verifier('7. Anthropic refusal : aucune tentative de ré-appeler ou de corriger — rawText conservé tel quel (null ici, aucun content fourni)', repAnthropicRefusal.rawText === null)

  console.log(`\n${total - echecs}/${total} vérifications passées.`)
  if (echecs > 0) {
    console.log(`${echecs} ÉCHEC(S).`)
    process.exitCode = 1
  } else {
    console.log('Toutes les vérifications sont passées.')
  }
}

main()
