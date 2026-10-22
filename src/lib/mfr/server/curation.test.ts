// ============================================================
// MFR V1 — Test OFFLINE du wrapper Curation humaine — T-MFR.4B
// ============================================================
// Script plain (aucun framework de test), même discipline que
// `retenue.test.ts`. Zéro Supabase réel : `serviceClient.rpc` est
// entièrement fake, injecté directement — ce fichier ne couvre QUE la
// traduction TypeScript (validation d'entrée + forme du retour), jamais
// la logique SQL de `mfr_creer_curation` elle-même (couverte par
// `024_mfr_curation_humaine.test.sql`, non exécuté dans cette passe).

import { creerCuration } from './curation'

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
const H1 = '11111111-1111-4111-8111-111111111111'
const H2 = '22222222-2222-4222-8222-222222222222'
const H3 = '33333333-3333-4333-8333-333333333333'
const H4 = '44444444-4444-4444-8444-444444444444'
const CURATION_ID = '55555555-5555-4555-8555-555555555555'

function fakeServiceClient(reponse: { data?: unknown; error?: unknown }) {
  let appels = 0
  const params: unknown[] = []
  return {
    client: {
      rpc: async (nom: string, p: unknown) => {
        appels += 1
        params.push({ nom, p })
        return reponse
      },
    } as unknown as Parameters<typeof creerCuration>[0],
    appels: () => appels,
    dernierAppel: () => params[params.length - 1],
  }
}

async function main() {
  // 1. UUID cycle invalide → refus avant tout appel RPC.
  {
    const fake = fakeServiceClient({ data: { success: true } })
    const resultat = await creerCuration(fake.client, 'pas-un-uuid', ANALYSE_ID, [], false)
    verifier('1. cycleId invalide → identifiant_invalide', 'error' in resultat && resultat.error === 'identifiant_invalide')
    verifier('1. rpc jamais appelé', fake.appels() === 0)
  }

  // 2. UUID analyse invalide → refus avant tout appel RPC.
  {
    const fake = fakeServiceClient({ data: { success: true } })
    const resultat = await creerCuration(fake.client, CYCLE_ID, 'pas-un-uuid', [], false)
    verifier('2. analyseId invalide → identifiant_invalide', 'error' in resultat && resultat.error === 'identifiant_invalide')
    verifier('2. rpc jamais appelé', fake.appels() === 0)
  }

  // 3. Tableau de plus de 3 directions → refus avant tout appel RPC.
  {
    const fake = fakeServiceClient({ data: { success: true } })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [H1, H2, H3, H4], false)
    verifier('3. >3 directions → trop_de_directions', 'error' in resultat && resultat.error === 'trop_de_directions')
    verifier('3. rpc jamais appelé', fake.appels() === 0)
  }

  // 4. UUID de direction invalide dans le tableau → refus avant tout appel RPC.
  {
    const fake = fakeServiceClient({ data: { success: true } })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [H1, 'pas-un-uuid'], false)
    verifier('4. direction invalide → identifiant_invalide', 'error' in resultat && resultat.error === 'identifiant_invalide')
    verifier('4. rpc jamais appelé', fake.appels() === 0)
  }

  // 5. Doublon dans le tableau de directions → refus avant tout appel RPC.
  {
    const fake = fakeServiceClient({ data: { success: true } })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [H1, H1], false)
    verifier('5. doublon → doublon_direction', 'error' in resultat && resultat.error === 'doublon_direction')
    verifier('5. rpc jamais appelé', fake.appels() === 0)
  }

  // 6. Succès strict → traduction correcte, un seul appel, bons paramètres transmis.
  {
    const fake = fakeServiceClient({ data: { success: true, curation_id: CURATION_ID, cycle_id: CYCLE_ID, analyse_id: ANALYSE_ID } })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [H1, H2], true)
    verifier('6. succès → ok=true', 'ok' in resultat && resultat.ok === true)
    verifier('6. succès → curationId correct', 'ok' in resultat && resultat.curationId === CURATION_ID)
    verifier('6. succès → cycleId correct', 'ok' in resultat && resultat.cycleId === CYCLE_ID)
    verifier('6. succès → analyseId correct', 'ok' in resultat && resultat.analyseId === ANALYSE_ID)
    verifier('6. rpc appelé exactement une fois', fake.appels() === 1)
    const appel = fake.dernierAppel() as {
      nom: string
      p: { p_cycle_id: string; p_analyse_id: string; p_hypothese_ids: readonly string[]; p_recommandation_confirmee: boolean }
    }
    verifier('6. rpc appelé avec le bon nom', appel.nom === 'mfr_creer_curation')
    verifier(
      '6. rpc appelé avec les bons paramètres',
      appel.p.p_cycle_id === CYCLE_ID &&
        appel.p.p_analyse_id === ANALYSE_ID &&
        appel.p.p_hypothese_ids.length === 2 &&
        appel.p.p_hypothese_ids[0] === H1 &&
        appel.p.p_hypothese_ids[1] === H2 &&
        appel.p.p_recommandation_confirmee === true
    )
  }

  // 7. Tableau vide (0 direction) → succès transmis tel quel, cas valide.
  {
    const fake = fakeServiceClient({ data: { success: true, curation_id: CURATION_ID, cycle_id: CYCLE_ID, analyse_id: ANALYSE_ID } })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [], false)
    verifier('7. 0 direction → ok=true (cas valide)', 'ok' in resultat && resultat.ok === true)
    const appel = fake.dernierAppel() as { p: { p_hypothese_ids: readonly string[] } }
    verifier('7. tableau vide bien transmis', appel.p.p_hypothese_ids.length === 0)
  }

  // 8. RPC retourne une erreur métier (ex. recommandation_non_selectionnee) → propagée telle quelle.
  {
    const fake = fakeServiceClient({ data: { error: 'recommandation_non_selectionnee' } })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [H1], true)
    verifier('8. erreur métier propagée telle quelle', 'error' in resultat && resultat.error === 'recommandation_non_selectionnee')
  }

  // 9. Erreur réseau/transport → message générique, jamais le détail brut.
  {
    const fake = fakeServiceClient({ error: { message: 'connection reset' } })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [H1], false)
    verifier('9. erreur transport → message générique', 'error' in resultat && resultat.error.includes('Erreur lors de la création'))
  }

  // ════════════════════════════════════════════════════════════
  // Jamais de faux succès — mêmes principes que l'audit T-MFR.4A.
  // ════════════════════════════════════════════════════════════

  // 10. Objet vide — ne doit jamais devenir un succès.
  {
    const fake = fakeServiceClient({ data: {} })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [H1], false)
    verifier('10. {} → reponse_rpc_invalide, jamais ok:true', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // 11. success:false sans error — ne doit jamais devenir un succès.
  {
    const fake = fakeServiceClient({ data: { success: false } })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [H1], false)
    verifier('11. success:false sans error → reponse_rpc_invalide', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // 12. success:true mais champs attendus absents — ne doit jamais devenir un succès.
  {
    const fake = fakeServiceClient({ data: { success: true } })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [H1], false)
    verifier('12. success:true sans curation_id/cycle_id/analyse_id → reponse_rpc_invalide', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // 13. success:true avec champs présents mais UUID invalide — ne doit jamais devenir un succès.
  {
    const fake = fakeServiceClient({ data: { success: true, curation_id: 'pas-un-uuid', cycle_id: CYCLE_ID, analyse_id: ANALYSE_ID } })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [H1], false)
    verifier('13. curation_id non-UUID → reponse_rpc_invalide, jamais ok:true', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
  }

  // 14. data null → reponse_rpc_invalide, jamais un crash, jamais un succès.
  {
    const fake = fakeServiceClient({ data: null })
    const resultat = await creerCuration(fake.client, CYCLE_ID, ANALYSE_ID, [H1], false)
    verifier('14. data null → reponse_rpc_invalide', 'error' in resultat && resultat.error === 'reponse_rpc_invalide')
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
