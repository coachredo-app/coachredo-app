// ============================================================
// Tests OFFLINE — validerVersionMfr / publierVersionMfr (T-MFR.5B-4)
// ============================================================
// Même discipline que lecture.test.ts : zéro réseau, zéro Supabase
// réel, client fictif n'exposant que `.rpc()` avec une réponse fixée.
// Données entièrement fictives. Couvre les invariants métier rappelés
// par le GO : version validée avant publication (erreur
// `version_non_validee` relayée fidèlement), aucune publication en
// double (`already_publiee`/`cycle_deja_publie_autre_version`), et
// l'idempotence de la validation (`already_valide`).

import { validerVersionMfr, publierVersionMfr, actionsMfrAdminActivees, LIBELLES_ERREUR_VALIDATION_PUBLICATION } from './validationPublication'

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

function serviceFictif(reponse: { data: unknown; error: unknown }) {
  return {
    rpc: async () => reponse,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

async function main(): Promise<void> {
  // ── Verrou MFR_ADMIN_ACTIONS_ENABLED — fail-closed par construction ──
  // Seule la valeur exacte 'true' active ; absente, 'false' ou toute
  // autre valeur (y compris une casse différente) => désactivé.
  {
    const original = process.env.MFR_ADMIN_ACTIONS_ENABLED
    try {
      delete process.env.MFR_ADMIN_ACTIONS_ENABLED
      verifier('Verrou — variable absente => désactivé (fail-closed)', actionsMfrAdminActivees() === false)

      process.env.MFR_ADMIN_ACTIONS_ENABLED = 'false'
      verifier("Verrou — 'false' => désactivé", actionsMfrAdminActivees() === false)

      process.env.MFR_ADMIN_ACTIONS_ENABLED = 'TRUE'
      verifier("Verrou — valeur invalide ('TRUE', casse différente) => désactivé", actionsMfrAdminActivees() === false)

      process.env.MFR_ADMIN_ACTIONS_ENABLED = '1'
      verifier("Verrou — valeur invalide ('1') => désactivé", actionsMfrAdminActivees() === false)

      process.env.MFR_ADMIN_ACTIONS_ENABLED = 'true'
      verifier("Verrou — exactement 'true' => activé", actionsMfrAdminActivees() === true)
    } finally {
      if (original === undefined) delete process.env.MFR_ADMIN_ACTIONS_ENABLED
      else process.env.MFR_ADMIN_ACTIONS_ENABLED = original
    }
  }

  // ── mfr_valider_version ──────────────────────────────────────

  {
    const r = await validerVersionMfr(serviceFictif({ data: null, error: { message: 'réseau' } }), 'v', 'c', 'op')
    verifier('Validation — erreur RPC => ERREUR erreur_technique', r.statut === 'ERREUR' && r.code === 'erreur_technique')
  }

  for (const code of ['cycle_introuvable', 'version_introuvable_pour_ce_cycle', 'cycle_deja_publie', 'aucune_analyse_retenue', 'analyse_retenue_a_change', 'aucune_curation', 'curation_non_officielle', 'operateur_introuvable']) {
    const r = await validerVersionMfr(serviceFictif({ data: { error: code }, error: null }), 'v', 'c', 'op')
    verifier(`Validation — ${code} relayé fidèlement`, r.statut === 'ERREUR' && r.code === code)
  }

  {
    // Idempotence — déjà validée, jamais rejugée.
    const r = await validerVersionMfr(
      serviceFictif({ data: { success: true, already_valide: true, valide_le: '2026-01-01T00:00:00Z' }, error: null }),
      'v', 'c', 'op'
    )
    verifier('Validation — already_valide=true relayé (idempotence)', r.statut === 'OK' && r.dejaValidee === true && r.valideLe === '2026-01-01T00:00:00Z')
  }

  {
    // Nouvelle validation.
    const r = await validerVersionMfr(
      serviceFictif({ data: { success: true, already_valide: false, valide_le: '2026-11-03T00:00:00Z' }, error: null }),
      'v', 'c', 'op'
    )
    verifier('Validation — already_valide=false (acte réellement nouveau)', r.statut === 'OK' && r.dejaValidee === false)
  }

  // ── mfr_publier_version ──────────────────────────────────────

  {
    // Invariant métier : aucune publication d'un brouillon non validé.
    const r = await publierVersionMfr(serviceFictif({ data: { error: 'version_non_validee' }, error: null }), 'v', 'c', 'op')
    verifier('Publication — version_non_validee relayé (invariant respecté)', r.statut === 'ERREUR' && r.code === 'version_non_validee')
  }

  {
    // Invariant métier : aucune publication en double (version différente).
    const r = await publierVersionMfr(serviceFictif({ data: { error: 'cycle_deja_publie_autre_version' }, error: null }), 'v', 'c', 'op')
    verifier('Publication — cycle_deja_publie_autre_version relayé (invariant respecté)', r.statut === 'ERREUR' && r.code === 'cycle_deja_publie_autre_version')
  }

  for (const code of ['cycle_introuvable', 'version_introuvable_pour_ce_cycle', 'aucune_analyse_retenue', 'analyse_retenue_a_change', 'aucune_curation', 'curation_non_officielle', 'operateur_introuvable']) {
    const r = await publierVersionMfr(serviceFictif({ data: { error: code }, error: null }), 'v', 'c', 'op')
    verifier(`Publication — ${code} relayé fidèlement`, r.statut === 'ERREUR' && r.code === code)
  }

  {
    // Idempotence — même version déjà publiée, jamais une erreur.
    const r = await publierVersionMfr(
      serviceFictif({ data: { success: true, already_publiee: true, publication_id: 'pub-1', publie_le: '2026-01-01T00:00:00Z' }, error: null }),
      'v', 'c', 'op'
    )
    verifier('Publication — already_publiee=true relayé (idempotence, jamais une erreur)', r.statut === 'OK' && r.dejaPubliee === true)
  }

  {
    const r = await publierVersionMfr(
      serviceFictif({ data: { success: true, already_publiee: false, publication_id: 'pub-2' }, error: null }),
      'v', 'c', 'op'
    )
    verifier('Publication — already_publiee=false (acte réellement nouveau)', r.statut === 'OK' && r.dejaPubliee === false && r.publicationId === 'pub-2')
  }

  // ── Libellés : chaque code relayé a une traduction, aucun oubli ──
  // Inclut `identifiant_invalide` (actions.ts, contrôle de forme
  // cycleId/versionId avant tout appel RPC — relecture QG 2026-11-03)
  // et `erreur_technique` (cette couche, réseau/absence de données).
  for (const code of [
    'cycle_introuvable', 'version_introuvable_pour_ce_cycle', 'cycle_deja_publie', 'cycle_deja_publie_autre_version',
    'version_non_validee', 'aucune_analyse_retenue', 'analyse_retenue_a_change', 'aucune_curation', 'curation_non_officielle', 'operateur_introuvable',
    'identifiant_invalide', 'erreur_technique', 'fonctionnalite_desactivee',
  ]) {
    verifier(`Libellé présent pour ${code}`, typeof LIBELLES_ERREUR_VALIDATION_PUBLICATION[code] === 'string')
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
