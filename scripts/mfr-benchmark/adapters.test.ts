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
import type { AppelAdapterParams, AppelQwenAdapterParams } from './adapters/types'
import { MAX_OUTPUT_TOKENS_SANITY, FIXTURE_ID_SANITY } from './sanityConfig'
import { TARIFS_CONSERVATEURS, estimerCoutConservateurUsd, type ProviderId } from './pricing'
import { Ledger, BudgetDepasseError } from './ledger/ledger'
import { FIXTURES } from './fixtures/index'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

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
    maxOutputTokens: MAX_OUTPUT_TOKENS_SANITY,
  }
}

// Endpoint de test délibérément distinct de toute URL plausible par
// défaut — prouve qu'aucun fallback silencieux n'existe : si l'adapter
// Qwen ignorait ce paramètre pour retomber sur une valeur figée, le
// test `3.` échouerait immédiatement (voir assertion dédiée).
const ENDPOINT_QWEN_DE_TEST = 'https://TEST-ENDPOINT-WORKSPACE-A-CONFIRMER.invalid/compatible-mode/v1/chat/completions'
function paramsQwenDeTest(model: string): AppelQwenAdapterParams {
  return { ...paramsDeTest(model), endpointUrl: ENDPOINT_QWEN_DE_TEST }
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
  verifier('1. OpenAI : max_output_tokens = 4096 (plafond réellement transmis)', (reqOpenAi.body as any).max_output_tokens === MAX_OUTPUT_TOKENS_SANITY)

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
  verifier('2. Gemini : generationConfig.maxOutputTokens = 4096', (reqGemini.body as any).generationConfig.maxOutputTokens === MAX_OUTPUT_TOKENS_SANITY)

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
  const reqQwen = QwenAdapter.construireRequete(paramsQwenDeTest('qwen3.7-plus'))
  verifier('3. Qwen : endpoint RÉELLEMENT paramétrable (URL = endpointUrl fourni par l’appelant, pas une valeur figée)', reqQwen.url === ENDPOINT_QWEN_DE_TEST)
  let qwenRefuseSansEndpoint = false
  try {
    QwenAdapter.construireRequete({ ...paramsDeTest('qwen3.7-plus'), endpointUrl: '' } as AppelQwenAdapterParams)
  } catch {
    qwenRefuseSansEndpoint = true
  }
  verifier('3. Qwen : aucun fallback silencieux — endpointUrl manquant/vide fait lever une erreur explicite', qwenRefuseSansEndpoint)
  verifier('3. Qwen : response_format.json_schema.strict=true', (reqQwen.body as any).response_format.json_schema.strict === true)
  verifier('3. Qwen : schéma transmis SANS transformation (NATIF)', (reqQwen.body as any).response_format.json_schema.schema === schemaCanonique)
  verifier('3. Qwen : max_completion_tokens = 4096 (max_tokens deprecated chez Alibaba)', (reqQwen.body as any).max_completion_tokens === MAX_OUTPUT_TOKENS_SANITY)
  verifier('3. Qwen : max_tokens (deprecated) n’est PAS envoyé', !('max_tokens' in (reqQwen.body as any)))
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
  verifier('4. Kimi : response_format.type = json_object (seul mode garanti)', (reqKimi.body as any).response_format.type === 'json_object')
  verifier('4. Kimi : AUCUN champ json_schema envoyé (jamais simulé comme strict)', !('json_schema' in (reqKimi.body as any).response_format))
  verifier('4. Kimi : max_completion_tokens = 4096 (max_tokens deprecated chez Moonshot)', (reqKimi.body as any).max_completion_tokens === MAX_OUTPUT_TOKENS_SANITY)
  verifier('4. Kimi : max_tokens (deprecated) n’est PAS envoyé', !('max_tokens' in (reqKimi.body as any)))
  verifier('4. Kimi : aucun paramètre reasoning_effort envoyé (décision QG, comportement par défaut conservé)', !('reasoning_effort' in (reqKimi.body as any)))
  const repKimiSucces = KimiAdapter.parserReponse(200, { choices: [{ message: { content: SORTIE_JSON_VALIDE }, finish_reason: 'stop' }], usage: { prompt_tokens: 300, completion_tokens: 100 } })
  verifier('4b. Kimi succès : statutTechnique=succes', repKimiSucces.statutTechnique === 'succes')
  const repKimiAbsent = KimiAdapter.parserReponse(200, { choices: [] })
  verifier('4c. Kimi choices vides : statutTechnique=payload_absent', repKimiAbsent.statutTechnique === 'payload_absent')
  const repKimiNonJson = KimiAdapter.parserReponse(200, { choices: [{ message: { content: 'Voici votre analyse : {referents: pas du JSON valide' }, finish_reason: 'stop' }] })
  verifier(
    '4d. Kimi texte techniquement "succes" mais non-JSON : rawText transmis BRUT, tel quel, AUCUNE tentative de réparation à ce niveau (le parsing/échec revient à l’ENGINE en aval)',
    repKimiNonJson.statutTechnique === 'succes' && repKimiNonJson.rawText === 'Voici votre analyse : {referents: pas du JSON valide'
  )

  // ============================================================
  // 5. Mistral — construireRequete + parserReponse
  // ============================================================
  const reqMistral = MistralAdapter.construireRequete(paramsDeTest('mistral-large-4'))
  verifier('5. Mistral : URL La Plateforme chat/completions', reqMistral.url === 'https://api.mistral.ai/v1/chat/completions')
  verifier('5. Mistral : schéma transmis SANS transformation (à vérifier expérimentalement, pas une incompatibilité confirmée)', (reqMistral.body as any).response_format.json_schema.schema === schemaCanonique)
  verifier('5. Mistral : max_tokens = 4096', (reqMistral.body as any).max_tokens === MAX_OUTPUT_TOKENS_SANITY)
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
  verifier('6. Anthropic : max_tokens = 4096 (plafond paramétré)', (reqAnthropic.body as any).max_tokens === MAX_OUTPUT_TOKENS_SANITY)
  verifier('6. Anthropic : max_tokens n’est PLUS la valeur en dur 8192', (reqAnthropic.body as any).max_tokens !== 8192)

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

  // ============================================================
  // 8. Tarifs conservateurs (QG, Phase 2B-PRE) — représentés exactement,
  // zéro tarif inventé.
  // ============================================================
  const TARIFS_ATTENDUS: Record<ProviderId, { in: number; out: number }> = {
    openai: { in: 2.0, out: 10.0 },
    gemini: { in: 0.75, out: 3.75 },
    qwen: { in: 0.4, out: 1.6 },
    anthropic: { in: 2.0, out: 10.0 },
    mistral: { in: 1.36, out: 4.18 }, // tarif NORMAL, pas la promotion temporaire
    kimi: { in: 3.0, out: 15.0 }, // input NON-CACHÉ, aucun crédit de cache
  }
  for (const id of Object.keys(TARIFS_ATTENDUS) as ProviderId[]) {
    const attendu = TARIFS_ATTENDUS[id]
    const reel = TARIFS_CONSERVATEURS[id]
    verifier(`8. Tarif ${id} : input = $${attendu.in}/M`, reel.inputUsdPerMillion === attendu.in)
    verifier(`8. Tarif ${id} : output = $${attendu.out}/M`, reel.outputUsdPerMillion === attendu.out)
  }

  // ============================================================
  // 9. Estimation conservatrice — calcul attendu vérifié manuellement.
  // ============================================================
  const estimationOpenAi = estimerCoutConservateurUsd('openai', 4000, MAX_OUTPUT_TOKENS_SANITY)
  const attenduOpenAi = (4000 / 1_000_000) * 2.0 + (4096 / 1_000_000) * 10.0
  verifier('9. estimerCoutConservateurUsd(openai, 4000, 4096) correspond au calcul attendu', Math.abs(estimationOpenAi - attenduOpenAi) < 1e-9)
  verifier('9. estimerCoutConservateurUsd augmente avec maxOutputTokens (jamais une estimation optimiste)', estimerCoutConservateurUsd('kimi', 4000, 8192) > estimerCoutConservateurUsd('kimi', 4000, 4096))

  // ============================================================
  // 10. Intégration ledger — fixture unique verrouillée, hard-cap
  // $20 toujours respecté pour une estimation réaliste des 6 sanity
  // calls, et refusé pour une estimation délibérément excessive.
  // ============================================================
  verifier('10. FIXTURE_ID_SANITY = GROUNDING_CIBLE (fixture unique verrouillée QG)', FIXTURE_ID_SANITY === 'GROUNDING_CIBLE')
  verifier('10. La fixture verrouillée existe réellement dans FIXTURES', FIXTURES[FIXTURE_ID_SANITY] !== undefined)

  const dossierTemp = mkdtempSync(join(tmpdir(), 'mfr-benchmark-sanity-ledger-test-'))
  const ledgerTest = Ledger.initialiserPremierRunReel(dossierTemp, 20)
  const providersSanity: ProviderId[] = ['openai', 'gemini', 'qwen', 'anthropic', 'mistral', 'kimi']
  let toutesReservationsOk = true
  for (const id of providersSanity) {
    const estimation = estimerCoutConservateurUsd(id, 4000, MAX_OUTPUT_TOKENS_SANITY)
    try {
      ledgerTest.reserverPending({ provider: id, model: `${id}-sanity`, fixtureId: FIXTURE_ID_SANITY, repetition: 1, estimatedCostUsd: estimation })
    } catch {
      toutesReservationsOk = false
    }
  }
  verifier('10. Les 6 réservations (estimation conservatrice réelle, cap 4096) tiennent sous le hard-cap 20 USD', toutesReservationsOk)
  verifier('10. Cumul réservé après les 6 sanity calls reste très inférieur à 20 USD', ledgerTest.cumulReserveUsd() < 1)

  let refusEstimationExcessive = false
  try {
    ledgerTest.verifierAvantAppel(25)
  } catch (e) {
    refusEstimationExcessive = e instanceof BudgetDepasseError
  }
  verifier('10. Une estimation qui dépasserait 20 USD est bien refusée (hard-cap toujours respecté)', refusEstimationExcessive)
  rmSync(dossierTemp, { recursive: true, force: true })

  console.log(`\n${total - echecs}/${total} vérifications passées.`)
  if (echecs > 0) {
    console.log(`${echecs} ÉCHEC(S).`)
    process.exitCode = 1
  } else {
    console.log('Toutes les vérifications sont passées.')
  }
}

main()
