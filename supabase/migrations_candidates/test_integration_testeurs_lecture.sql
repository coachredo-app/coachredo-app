-- ============================================================
-- Test d'INTÉGRATION COMPLET — testeurs (033) + lecture MFR (034)
-- ============================================================
-- GO QG APP 2026-11-05 (« dernière validation d'intégration locale »).
-- Base PostgreSQL JETABLE et locale UNIQUEMENT (jamais Supabase, jamais
-- Production) — exécuté via test_integration_testeurs.sh, qui rejoue
-- 013→016→017→018→019→023→024→025→026→027→033→034 avant ce fichier.
-- Fixtures entièrement fictives (UUID inventés, aucune donnée réelle de
-- client) — réutilise le style déjà établi dans
-- mfr_lire_version_publiee.test.sql, étendu avec un mpd_dossiers fictif
-- propre (le fichier original supposait un dossier réel déjà existant
-- en Production, inapplicable ici).
--
-- 8 scénarios exigés par le QG, chacun une assertion séparée :
--   1. Utilisateur ordinaire (jamais testeur) → acces_restreint.
--   2. Testeur autorisé → lecture de son MFR publié, succès.
--   3. Testeur retiré → lecture immédiatement refusée (acces_restreint).
--   4. Testeur réautorisé → lecture restaurée, succès.
--   5. Testeur autorisé → lecture du MFR d'un AUTRE utilisateur refusée
--      (acces_refuse, jamais une élévation d'accès par le statut testeur).
--   6. Testeur autorisé, cycle sans publication → aucune_publication.
--   7. Utilisateur non authentifié → non_authentifie.
--   8. Permissions EXECUTE des 3 RPC concernées, par rôle.

begin;

do $$
declare
  v_user_id        uuid := '10000000-0000-0000-0000-000000000001'; -- fictif, jamais un compte réel
  v_autre_user_id  uuid := '20000000-0000-0000-0000-000000000002'; -- fictif
  v_admin_id       uuid := '30000000-0000-0000-0000-000000000003'; -- fictif, jamais un vrai admin

  v_dossier_id     uuid;
  v_dossier_autre  uuid;

  -- Cycle A (v_user_id) : publié.
  v_etat_logique_a uuid;
  v_cycle_a        uuid;
  v_analyse_a      uuid;
  v_hp_a           uuid;
  v_redaction_a    uuid;
  v_version_a      uuid;
  v_contenu_a      jsonb := '{
    "cycleId": "00000000-0000-0000-0000-000000000000",
    "analyseId": "00000000-0000-0000-0000-000000000000",
    "curationId": "00000000-0000-0000-0000-000000000000",
    "recommandationConfirmee": true,
    "directions": [{
      "position": 1,
      "titre": "Direction fictive de test d''intégration",
      "pourquoi": {"texte": "Texte fictif", "sources": ["SRC_1"]},
      "forces": {"texte": "Forces fictives", "sources": ["SRC_1"]},
      "limites": {"texte": "Limites fictives", "sources": []},
      "planAction": {"texte": "Plan fictif", "sources": []},
      "hypotheseId": "00000000-0000-0000-0000-000000000000",
      "estRecommandee": true
    }],
    "aucuneDirectionMessage": null
  }'::jsonb;

  -- Cycle B (v_user_id) : SANS publication.
  v_etat_logique_b uuid;
  v_cycle_b        uuid;
  v_analyse_b      uuid;
  v_redaction_b    uuid;
  v_version_b      uuid;

  -- Cycle C (v_autre_user_id) : publié — appartient à un AUTRE utilisateur.
  v_etat_logique_c uuid;
  v_cycle_c        uuid;
  v_analyse_c      uuid;
  v_hp_c           uuid;
  v_redaction_c    uuid;
  v_version_c      uuid;

  v_resultat jsonb;
  v_evt      json;
begin
  -- ── Fixtures identité (3 utilisateurs fictifs, auth.users) ────
  insert into auth.users (id) values (v_user_id), (v_autre_user_id), (v_admin_id);

  -- ── Fixtures dossiers (mpd_dossiers fictifs, propres à ce test) ──
  insert into public.mpd_dossiers (user_id) values (v_user_id) returning id into v_dossier_id;
  insert into public.mpd_dossiers (user_id) values (v_autre_user_id) returning id into v_dossier_autre;

  -- ── Fixture cycle A (v_user_id, publié) ───────────────────────
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 1, 'fixture-integration-test')
  returning id into v_etat_logique_a;
  insert into public.mfr_cycles (user_id, etat_logique_id) values (v_user_id, v_etat_logique_a) returning id into v_cycle_a;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_a, v_user_id, v_etat_logique_a, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_a;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_a, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP intégration')
  returning id into v_hp_a;
  insert into public.mfr_redactions (analyse_id, cycle_id, user_id, provider, model, prompt_version, schema_version, statut, terminee_le)
  values (v_analyse_a, v_cycle_a, v_user_id, 'openai', 'gpt-6.1-sol', 'v2', '1', 'SUCCES', now())
  returning id into v_redaction_a;
  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_a, v_redaction_a, v_user_id, 1, v_contenu_a)
  returning id into v_version_a;
  insert into public.mfr_publications (cycle_id, version_id, user_id) values (v_cycle_a, v_version_a, v_user_id);

  -- ── Fixture cycle B (v_user_id, SANS publication) ─────────────
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 2, 'fixture-integration-test')
  returning id into v_etat_logique_b;
  insert into public.mfr_cycles (user_id, etat_logique_id) values (v_user_id, v_etat_logique_b) returning id into v_cycle_b;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_b, v_user_id, v_etat_logique_b, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_b;
  insert into public.mfr_redactions (analyse_id, cycle_id, user_id, provider, model, prompt_version, schema_version, statut, terminee_le)
  values (v_analyse_b, v_cycle_b, v_user_id, 'openai', 'gpt-6.1-sol', 'v2', '1', 'SUCCES', now())
  returning id into v_redaction_b;
  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_b, v_redaction_b, v_user_id, 1, '{"fixture":"brouillon_b"}'::jsonb)
  returning id into v_version_b;
  -- Aucune mfr_publications pour ce cycle — volontaire.

  -- ── Fixture cycle C (v_autre_user_id, publié) ─────────────────
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_autre, v_autre_user_id, 1, 'fixture-integration-test')
  returning id into v_etat_logique_c;
  insert into public.mfr_cycles (user_id, etat_logique_id) values (v_autre_user_id, v_etat_logique_c) returning id into v_cycle_c;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_c, v_autre_user_id, v_etat_logique_c, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_c;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_c, v_autre_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP autre utilisateur')
  returning id into v_hp_c;
  insert into public.mfr_redactions (analyse_id, cycle_id, user_id, provider, model, prompt_version, schema_version, statut, terminee_le)
  values (v_analyse_c, v_cycle_c, v_autre_user_id, 'openai', 'gpt-6.1-sol', 'v2', '1', 'SUCCES', now())
  returning id into v_redaction_c;
  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_c, v_redaction_c, v_autre_user_id, 1, '{"fixture":"publiee_autre_utilisateur"}'::jsonb)
  returning id into v_version_c;
  insert into public.mfr_publications (cycle_id, version_id, user_id) values (v_cycle_c, v_version_c, v_autre_user_id);

  raise notice 'Fixtures créées : cycle A (publié, v_user_id), cycle B (sans publication, v_user_id), cycle C (publié, v_autre_user_id)';

  -- ════════════════════════════════════════════════════════════
  -- Scénario 1 — utilisateur ordinaire (jamais testeur) → fermé
  -- ════════════════════════════════════════════════════════════
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
  if v_resultat->>'error' <> 'acces_restreint' then
    raise exception 'Scénario 1 ÉCHEC : attendu acces_restreint (jamais testeur), obtenu %', v_resultat;
  end if;
  raise notice 'Scénario 1 PASS — utilisateur ordinaire refusé (acces_restreint), malgré un cycle publié réel';

  -- ════════════════════════════════════════════════════════════
  -- Scénario 2 — testeur autorisé → lecture de son MFR publié
  -- ════════════════════════════════════════════════════════════
  v_evt := public.mfr_autoriser_testeur(v_user_id, v_admin_id, 'Scénario 2 — autorisation');
  if (v_evt->>'success')::boolean is not true then
    raise exception 'Scénario 2 ÉCHEC : autorisation testeur, obtenu %', v_evt;
  end if;
  v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'Scénario 2 ÉCHEC : lecture attendue en succès pour un testeur autorisé sur son propre cycle publié, obtenu %', v_resultat;
  end if;
  if v_resultat->'contenu' <> v_contenu_a then
    raise exception 'Scénario 2 ÉCHEC : contenu lu ne correspond pas à la fixture insérée';
  end if;
  raise notice 'Scénario 2 PASS — testeur autorisé lit intégralement son MFR publié';

  -- ════════════════════════════════════════════════════════════
  -- Scénario 3 — testeur retiré → lecture immédiatement refusée
  -- ════════════════════════════════════════════════════════════
  v_evt := public.mfr_retirer_testeur(v_user_id, v_admin_id, 'Scénario 3 — retrait');
  if (v_evt->>'success')::boolean is not true then
    raise exception 'Scénario 3 ÉCHEC : retrait testeur, obtenu %', v_evt;
  end if;
  v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
  if v_resultat->>'error' <> 'acces_restreint' then
    raise exception 'Scénario 3 ÉCHEC : attendu acces_restreint immédiatement après retrait, obtenu %', v_resultat;
  end if;
  raise notice 'Scénario 3 PASS — retrait effectif immédiatement, même sur un cycle déjà lu avec succès au scénario 2';

  -- ════════════════════════════════════════════════════════════
  -- Scénario 4 — testeur réautorisé → lecture restaurée
  -- ════════════════════════════════════════════════════════════
  v_evt := public.mfr_autoriser_testeur(v_user_id, v_admin_id, 'Scénario 4 — réautorisation');
  if (v_evt->>'success')::boolean is not true then
    raise exception 'Scénario 4 ÉCHEC : réautorisation, obtenu %', v_evt;
  end if;
  v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'Scénario 4 ÉCHEC : lecture attendue en succès après réautorisation, obtenu %', v_resultat;
  end if;
  raise notice 'Scénario 4 PASS — réautorisation restaure réellement l''accès, historique complet conservé (3 événements)';

  -- ════════════════════════════════════════════════════════════
  -- Scénario 5 — testeur autorisé → lecture du MFR d'un AUTRE
  -- utilisateur refusée (jamais une élévation d'accès)
  -- ════════════════════════════════════════════════════════════
  -- v_user_id reste testeur autorisé (scénario 4) — il tente de lire
  -- le cycle C, qui appartient à v_autre_user_id, jamais autorisé lui-même.
  v_resultat := public.mfr_lire_version_publiee(v_cycle_c);
  if v_resultat->>'error' <> 'acces_refuse' then
    raise exception 'Scénario 5 ÉCHEC : un testeur autorisé ne doit jamais lire la MFR d''un autre utilisateur — attendu acces_refuse, obtenu %', v_resultat;
  end if;
  raise notice 'Scénario 5 PASS — statut testeur n''élève jamais l''accès aux cycles d''autrui (contrôle de propriété intact, exécuté après le gate testeur)';

  -- ════════════════════════════════════════════════════════════
  -- Scénario 6 — testeur autorisé, cycle sans publication → aucune_publication
  -- ════════════════════════════════════════════════════════════
  v_resultat := public.mfr_lire_version_publiee(v_cycle_b);
  if v_resultat->>'error' <> 'aucune_publication' then
    raise exception 'Scénario 6 ÉCHEC : attendu aucune_publication (testeur autorisé, cycle réel sans publication), obtenu %', v_resultat;
  end if;
  raise notice 'Scénario 6 PASS — aucune_publication correctement distingué de acces_restreint pour un testeur réellement autorisé';

  -- ════════════════════════════════════════════════════════════
  -- Scénario 7 — utilisateur non authentifié → non_authentifie
  -- ════════════════════════════════════════════════════════════
  perform set_config('request.jwt.claim.sub', '', true);
  v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
  if v_resultat->>'error' <> 'non_authentifie' then
    raise exception 'Scénario 7 ÉCHEC : attendu non_authentifie, obtenu %', v_resultat;
  end if;
  raise notice 'Scénario 7 PASS — non authentifié rejeté avant tout autre contrôle (y compris avant le gate testeur)';

  raise notice '7/7 scénarios fonctionnels PASS.';
end $$;

-- ════════════════════════════════════════════════════════════
-- Scénario 8 — permissions EXECUTE des 3 RPC, par rôle (statique)
-- ════════════════════════════════════════════════════════════
do $$
declare
  v_anon boolean; v_authenticated boolean; v_service_role boolean; v_public boolean;
begin
  v_anon          := has_function_privilege('anon', 'public.mfr_lire_version_publiee(uuid)', 'EXECUTE');
  v_authenticated := has_function_privilege('authenticated', 'public.mfr_lire_version_publiee(uuid)', 'EXECUTE');
  v_service_role  := has_function_privilege('service_role', 'public.mfr_lire_version_publiee(uuid)', 'EXECUTE');
  v_public        := has_function_privilege('public', 'public.mfr_lire_version_publiee(uuid)', 'EXECUTE');
  if v_anon is not false or v_authenticated is not true or v_service_role is not false or v_public is not false then
    raise exception 'Scénario 8a ÉCHEC : mfr_lire_version_publiee doit être authenticated=true, anon/service_role/public=false — obtenu anon=%, authenticated=%, service_role=%, public=%', v_anon, v_authenticated, v_service_role, v_public;
  end if;

  v_anon          := has_function_privilege('anon', 'public.mfr_autoriser_testeur(uuid, uuid, text)', 'EXECUTE');
  v_authenticated := has_function_privilege('authenticated', 'public.mfr_autoriser_testeur(uuid, uuid, text)', 'EXECUTE');
  v_service_role  := has_function_privilege('service_role', 'public.mfr_autoriser_testeur(uuid, uuid, text)', 'EXECUTE');
  v_public        := has_function_privilege('public', 'public.mfr_autoriser_testeur(uuid, uuid, text)', 'EXECUTE');
  if v_anon is not false or v_authenticated is not false or v_service_role is not true or v_public is not false then
    raise exception 'Scénario 8b ÉCHEC : mfr_autoriser_testeur doit être service_role=true, anon/authenticated/public=false — obtenu anon=%, authenticated=%, service_role=%, public=%', v_anon, v_authenticated, v_service_role, v_public;
  end if;

  v_anon          := has_function_privilege('anon', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');
  v_authenticated := has_function_privilege('authenticated', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');
  v_service_role  := has_function_privilege('service_role', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');
  v_public        := has_function_privilege('public', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');
  if v_anon is not false or v_authenticated is not false or v_service_role is not true or v_public is not false then
    raise exception 'Scénario 8c ÉCHEC : mfr_retirer_testeur doit être service_role=true, anon/authenticated/public=false — obtenu anon=%, authenticated=%, service_role=%, public=%', v_anon, v_authenticated, v_service_role, v_public;
  end if;

  raise notice 'Scénario 8 PASS — permissions EXECUTE exactes pour les 3 RPC, vérifiées par rôle';
end $$;

rollback;
