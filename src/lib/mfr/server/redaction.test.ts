// ============================================================
// MFR V1 — Test OFFLINE des wrappers de rédaction — T-MFR.5A
// ============================================================
// Script plain, même discipline que retenue.test.ts/curation.test.ts.
// Zéro Supabase réel : `service.rpc` entièrement fake.

import { demarrerRedaction, relancerRedactionApresEchec, finirRedactionEchec, finirRedactionSucces } from './redaction'

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

const CYCLE_ID = '67310029-a367-4816-95f7-35d0ae4d359c'
const ANALYSE_ID = 'b61a8f43-d4e4-48e0-8976-64f8ef9146b2'
const CURATION_ID = 'cdf773f0-6eeb-4fad-bbdd-bc63a9aaf3c1'
const REDACTION_ID = '11111111-1111-4111-8111-111111111111'
const VERSION_ID = '22222222-2222-4222-8222-222222222222'

function fakeServiceClient(reponse: { data?: unknown; error?: unknown }) {
  let appels = 0
  return {
    client: { rpc: async () => { appels += 1; return reponse } } as unknown as Parameters<typeof demarrerRedaction>[0],
    appels: () => appels,
  }
}

async function main() {
  // demarrerRedaction
  {
    const fake = fakeServiceClient({ data: { success: true, redaction_id: REDACTION_ID, created: true } })
    const r = await demarrerRedaction(fake.client, CYCLE_ID, ANALYSE_ID, CURATION_ID, { provider: 'openai', model: 'gpt-6.1-sol', promptVersion: 'v1', schemaVersion: '1' })
    verifier('demarrerRedaction: succès → ok=true', 'ok' in r && r.ok === true)
    verifier('demarrerRedaction: redactionId correct', 'ok' in r && r.redactionId === REDACTION_ID)
  }
  {
    const fake = fakeServiceClient({ data: { success: true, redaction_id: REDACTION_ID, created: true } })
    const r = await demarrerRedaction(fake.client, 'pas-un-uuid', ANALYSE_ID, CURATION_ID, { provider: 'openai', model: 'm', promptVersion: 'v', schemaVersion: '1' })
    verifier('demarrerRedaction: cycleId invalide → identifiant_invalide', 'error' in r && r.error === 'identifiant_invalide')
    verifier('demarrerRedaction: rpc jamais appelé si invalide', fake.appels() === 0)
  }
  {
    const fake = fakeServiceClient({ data: { error: 'curation_non_officielle' } })
    const r = await demarrerRedaction(fake.client, CYCLE_ID, ANALYSE_ID, CURATION_ID, { provider: 'openai', model: 'm', promptVersion: 'v', schemaVersion: '1' })
    verifier('demarrerRedaction: erreur métier propagée telle quelle', 'error' in r && r.error === 'curation_non_officielle')
  }
  {
    const fake = fakeServiceClient({ data: { success: true } })
    const r = await demarrerRedaction(fake.client, CYCLE_ID, ANALYSE_ID, CURATION_ID, { provider: 'openai', model: 'm', promptVersion: 'v', schemaVersion: '1' })
    verifier('demarrerRedaction: succès sans redaction_id → reponse_rpc_invalide, jamais ok:true', 'error' in r && r.error === 'reponse_rpc_invalide')
  }

  // relancerRedactionApresEchec
  {
    const fake = fakeServiceClient({ data: { success: true, redaction_id: REDACTION_ID, created: true } })
    const r = await relancerRedactionApresEchec(fake.client, CYCLE_ID, ANALYSE_ID, CURATION_ID, { provider: 'openai', model: 'gpt-6.1-sol', promptVersion: 'v2', schemaVersion: '2' })
    verifier('relancerRedactionApresEchec: succès → ok=true', 'ok' in r && r.ok === true)
    verifier('relancerRedactionApresEchec: redactionId correct', 'ok' in r && r.redactionId === REDACTION_ID)
  }
  {
    const fake = fakeServiceClient({ data: { error: 'redaction_en_cours' } })
    const r = await relancerRedactionApresEchec(fake.client, CYCLE_ID, ANALYSE_ID, CURATION_ID, { provider: 'openai', model: 'm', promptVersion: 'v', schemaVersion: '1' })
    verifier('relancerRedactionApresEchec: erreur métier propagée telle quelle', 'error' in r && r.error === 'redaction_en_cours')
  }
  {
    const fake = fakeServiceClient({ data: { success: true, redaction_id: REDACTION_ID, created: true } })
    const r = await relancerRedactionApresEchec(fake.client, 'pas-un-uuid', ANALYSE_ID, CURATION_ID, { provider: 'openai', model: 'm', promptVersion: 'v', schemaVersion: '1' })
    verifier('relancerRedactionApresEchec: cycleId invalide → identifiant_invalide', 'error' in r && r.error === 'identifiant_invalide')
    verifier('relancerRedactionApresEchec: rpc jamais appelé si invalide', fake.appels() === 0)
  }

  // finirRedactionEchec
  {
    const fake = fakeServiceClient({ data: { success: true, already_terminal: false } })
    const r = await finirRedactionEchec(fake.client, REDACTION_ID, 'une erreur', null)
    verifier('finirRedactionEchec: succès → ok=true', 'ok' in r && r.ok === true && r.alreadyTerminal === false)
  }
  {
    const fake = fakeServiceClient({ data: {} })
    const r = await finirRedactionEchec(fake.client, REDACTION_ID, 'une erreur', null)
    verifier('finirRedactionEchec: payload vide → reponse_rpc_invalide, jamais ok:true', 'error' in r && r.error === 'reponse_rpc_invalide')
  }

  // finirRedactionSucces
  {
    const fake = fakeServiceClient({ data: { success: true, already_terminal: false, version_id: VERSION_ID, numero_version: 1 } })
    const r = await finirRedactionSucces(fake.client, REDACTION_ID, { payload: null }, { contenuVersion: 1 })
    verifier('finirRedactionSucces: succès → ok=true', 'ok' in r && r.ok === true)
    verifier('finirRedactionSucces: versionId correct', 'ok' in r && r.versionId === VERSION_ID)
    verifier('finirRedactionSucces: numeroVersion correct', 'ok' in r && r.numeroVersion === 1)
  }
  {
    const fake = fakeServiceClient({ data: { success: true, already_terminal: true } })
    const r = await finirRedactionSucces(fake.client, REDACTION_ID, { payload: null }, { contenuVersion: 1 })
    verifier('finirRedactionSucces: already_terminal → ok=true sans version', 'ok' in r && r.ok === true && r.alreadyTerminal === true && r.versionId === null)
  }
  {
    const fake = fakeServiceClient({ data: { success: true, already_terminal: false, version_id: 'pas-un-uuid', numero_version: 1 } })
    const r = await finirRedactionSucces(fake.client, REDACTION_ID, { payload: null }, { contenuVersion: 1 })
    verifier('finirRedactionSucces: version_id non-UUID → reponse_rpc_invalide, jamais ok:true', 'error' in r && r.error === 'reponse_rpc_invalide')
  }
  {
    const fake = fakeServiceClient({ data: null })
    const r = await finirRedactionSucces(fake.client, REDACTION_ID, { payload: null }, { contenuVersion: 1 })
    verifier('finirRedactionSucces: data null → reponse_rpc_invalide', 'error' in r && r.error === 'reponse_rpc_invalide')
  }

  console.log(`\n${total - echecs}/${total} vérifications passées.`)
  if (echecs > 0) {
    console.log(`${echecs} ÉCHEC(S).`)
    process.exitCode = 1
  } else {
    console.log('Toutes les vérifications sont passées.')
  }
}

main()
