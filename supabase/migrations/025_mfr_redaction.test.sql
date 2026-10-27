-- ============================================================
-- Tests SQL isolés/réversibles — rédaction MFR (T-MFR.5A)
-- ============================================================
-- PRÉPARÉ, NON EXÉCUTÉ dans cette passe (GO QG explicite requis avant
-- exécution). Nécessite que la migration 025 soit déjà appliquée.
--
-- Méthode identique à 023/024 : un seul `BEGIN ... ROLLBACK`, toutes
-- les fixtures et tous les appels RPC vivent dans la même transaction,
-- jamais commités. Fixtures ancrées sur le compte test réel
-- (`user_id`/`dossier_id` réels pour les FK obligatoires), mais
-- `etat_logique_id`/`revision_dossier_capturee` entièrement fabriqués
-- (plage 999201+, distincte de 023/024), pour ne jamais entrer en
-- collision. Réutilise les vraies RPC déjà live (`mfr_retenir_analyse`
-- 023, `mfr_creer_curation` 024) pour construire l'état de départ —
-- jamais une mutation manuelle des tables qu'elles gouvernent.
--
-- Ne couvre QUE les RPC SQL (025) — la construction du
-- `MfrWritingContext`, l'appel provider et le validateur de rédaction
-- sont couverts séparément par les tests TS offline (redaction/
-- validator.test.ts, orchestration/lancerRedactionMfr.test.ts).

begin;

do $$
declare
  v_user_id    uuid := 'dd539d5c-5103-45b1-8e7e-579bff5b2f10';
  v_dossier_id uuid := '2e4ba803-3a4d-4d7f-91db-134967636cbb';

  v_etat_logique_x uuid;
  v_cycle_x        uuid;
  v_analyse_a      uuid;
  v_hp             uuid;
  v_curation_1     uuid;
  v_curation_2     uuid;

  v_etat_logique_z uuid;
  v_cycle_z        uuid;
  v_analyse_z      uuid;

  v_etat_logique_w uuid;
  v_cycle_w        uuid;
  v_analyse_w      uuid;

  v_etat_logique_publie uuid;
  v_cycle_publie        uuid;
  v_analyse_publie      uuid;
  v_hp_publie           uuid;
  v_curation_publie     uuid;
  v_redaction_publie    uuid;
  v_version_publie      uuid;

  v_resultat          jsonb;
  v_resultat_retenir   jsonb;
  v_resultat_curation  jsonb;
  v_redaction_1        uuid;
  v_nb_versions_avant  integer;
  v_nb_versions_apres  integer;
  v_numero_version     integer;
begin
  -- ════════════════════════════════════════════════════════════
  -- FIXTURES
  -- ════════════════════════════════════════════════════════════

  -- Cycle X : analyse A retenue, une curation (1 direction PRESENTER_MAINTENANT).
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999201, 'fixture-025-test')
  returning id into v_etat_logique_x;

  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_x)
  returning id into v_cycle_x;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_x, v_user_id, v_etat_logique_x, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_a;

  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_a, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP') returning id into v_hp;
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_a, v_hp, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', true);

  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_x, v_analyse_a);
  if v_resultat_retenir->>'success' <> 'true' then
    raise exception 'FIXTURE FAIL: impossible de retenir A sur le cycle X — %', v_resultat_retenir;
  end if;

  v_resultat_curation := public.mfr_creer_curation(v_cycle_x, v_analyse_a, array[v_hp], true);
  if v_resultat_curation->>'success' <> 'true' then
    raise exception 'FIXTURE FAIL: impossible de créer la curation 1 — %', v_resultat_curation;
  end if;
  v_curation_1 := (v_resultat_curation->>'curation_id')::uuid;

  -- Cycle Z : analyse retenue mais AUCUNE curation.
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999202, 'fixture-025-test')
  returning id into v_etat_logique_z;
  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_z)
  returning id into v_cycle_z;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_z, v_user_id, v_etat_logique_z, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_z;
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_z, v_analyse_z);
  if v_resultat_retenir->>'success' <> 'true' then
    raise exception 'FIXTURE FAIL: impossible de retenir Z — %', v_resultat_retenir;
  end if;

  -- Cycle W : AUCUNE analyse retenue du tout.
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999203, 'fixture-025-test')
  returning id into v_etat_logique_w;
  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_w)
  returning id into v_cycle_w;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_w, v_user_id, v_etat_logique_w, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_w;

  -- Cycle publié (chaîne complète).
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999204, 'fixture-025-test')
  returning id into v_etat_logique_publie;
  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_publie)
  returning id into v_cycle_publie;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_publie, v_user_id, v_etat_logique_publie, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_publie;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_publie, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP publiee') returning id into v_hp_publie;
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_publie, v_hp_publie, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', false);
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_publie, v_analyse_publie);
  if v_resultat_retenir->>'success' <> 'true' then
    raise exception 'FIXTURE FAIL: impossible de retenir analyse publiée — %', v_resultat_retenir;
  end if;
  v_resultat_curation := public.mfr_creer_curation(v_cycle_publie, v_analyse_publie, array[v_hp_publie], false);
  if v_resultat_curation->>'success' <> 'true' then
    raise exception 'FIXTURE FAIL: impossible de créer la curation publiée — %', v_resultat_curation;
  end if;
  v_curation_publie := (v_resultat_curation->>'curation_id')::uuid;

  insert into public.mfr_redactions (cycle_id, analyse_id, curation_id, user_id, provider, model, prompt_version, schema_version, statut, terminee_le)
  values (v_cycle_publie, v_analyse_publie, v_curation_publie, v_user_id, 'openai', 'gpt-6.1-sol', 'v1', '1', 'SUCCES', now())
  returning id into v_redaction_publie;
  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_publie, v_redaction_publie, v_user_id, 1, '{"fixture":true}'::jsonb)
  returning id into v_version_publie;
  insert into public.mfr_publications (cycle_id, version_id, user_id)
  values (v_cycle_publie, v_version_publie, v_user_id);

  -- ════════════════════════════════════════════════════════════
  -- TESTS
  -- ════════════════════════════════════════════════════════════

  -- T1. Cycle W sans analyse retenue → refus.
  v_resultat := public.mfr_demarrer_redaction(v_cycle_w, v_analyse_w, gen_random_uuid(), 'openai', 'gpt-6.1-sol', 'v1', '1');
  if v_resultat->>'error' <> 'aucune_analyse_retenue' then
    raise exception 'T1 FAIL: cycle sans analyse retenue pas refusé comme attendu — %', v_resultat;
  end if;
  raise notice 'T1 PASS: cycle sans analyse retenue refusé';

  -- T2. Cycle Z, analyse retenue mais aucune curation → refus.
  v_resultat := public.mfr_demarrer_redaction(v_cycle_z, v_analyse_z, gen_random_uuid(), 'openai', 'gpt-6.1-sol', 'v1', '1');
  if v_resultat->>'error' <> 'aucune_curation' then
    raise exception 'T2 FAIL: cycle sans curation pas refusé comme attendu — %', v_resultat;
  end if;
  raise notice 'T2 PASS: cycle sans curation refusé';

  -- T3. Analyse différente de celle retenue → refus.
  v_resultat := public.mfr_demarrer_redaction(v_cycle_x, v_analyse_z, v_curation_1, 'openai', 'gpt-6.1-sol', 'v1', '1');
  if v_resultat->>'error' <> 'analyse_retenue_a_change' then
    raise exception 'T3 FAIL: analyse non retenue pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T3 PASS: analyse différente de la retenue refusée';

  -- T4. Curation non officielle : créer une 2e curation sur A, puis tenter de démarrer avec la 1ère.
  v_resultat_curation := public.mfr_creer_curation(v_cycle_x, v_analyse_a, array[v_hp], false);
  if v_resultat_curation->>'success' <> 'true' then
    raise exception 'FIXTURE FAIL: impossible de créer la curation 2 — %', v_resultat_curation;
  end if;
  v_curation_2 := (v_resultat_curation->>'curation_id')::uuid;

  v_resultat := public.mfr_demarrer_redaction(v_cycle_x, v_analyse_a, v_curation_1, 'openai', 'gpt-6.1-sol', 'v1', '1');
  if v_resultat->>'error' <> 'curation_non_officielle' then
    raise exception 'T4 FAIL: curation non officielle pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T4 PASS: curation non officielle (curation_1, remplacée par curation_2) refusée';

  -- T5. Cycle publié → refus.
  v_resultat := public.mfr_demarrer_redaction(v_cycle_publie, v_analyse_publie, v_curation_publie, 'openai', 'gpt-6.1-sol', 'v1', '1');
  if v_resultat->>'error' <> 'cycle_publie' then
    raise exception 'T5 FAIL: cycle publié pas refusé comme attendu — %', v_resultat;
  end if;
  raise notice 'T5 PASS: cycle publié refusé';

  -- T6. Démarrage réel sur la curation officielle (curation_2) → succès.
  v_resultat := public.mfr_demarrer_redaction(v_cycle_x, v_analyse_a, v_curation_2, 'openai', 'gpt-6.1-sol', 'v1', '1');
  if v_resultat->>'success' <> 'true' then
    raise exception 'T6 FAIL: démarrage sur curation officielle refusé — %', v_resultat;
  end if;
  v_redaction_1 := (v_resultat->>'redaction_id')::uuid;
  raise notice 'T6 PASS: démarrage réel sur curation officielle';

  -- T7. Idempotence EN_COURS : rappeler demarrer_redaction avec la même curation → même redaction_id, created=false.
  v_resultat := public.mfr_demarrer_redaction(v_cycle_x, v_analyse_a, v_curation_2, 'openai', 'gpt-6.1-sol', 'v1', '1');
  if v_resultat->>'success' <> 'true' or (v_resultat->>'redaction_id')::uuid <> v_redaction_1 or v_resultat->>'created' <> 'false' then
    raise exception 'T7 FAIL: idempotence EN_COURS non respectée — %', v_resultat;
  end if;
  raise notice 'T7 PASS: idempotence EN_COURS (même redaction_id, created=false)';

  -- T8. FINISH SUCCES : création atomique de la version, numéro de version correct.
  select count(*) into v_nb_versions_avant from public.mfr_versions where cycle_id = v_cycle_x;

  v_resultat := public.mfr_finir_redaction_succes(
    v_redaction_1,
    '{"audit":true}'::jsonb,
    '{"contenuVersion":1,"directions":[]}'::jsonb
  );
  if v_resultat->>'success' <> 'true' or v_resultat->>'already_terminal' <> 'false' then
    raise exception 'T8 FAIL: FINISH SUCCES refusé — %', v_resultat;
  end if;
  v_numero_version := (v_resultat->>'numero_version')::integer;
  if v_numero_version <> 1 then
    raise exception 'T8 FAIL: numero_version attendu 1, reçu %', v_numero_version;
  end if;

  select count(*) into v_nb_versions_apres from public.mfr_versions where cycle_id = v_cycle_x;
  if v_nb_versions_apres <> v_nb_versions_avant + 1 then
    raise exception 'T8 FAIL: exactement une version aurait dû être créée';
  end if;

  if not exists (
    select 1 from public.mfr_redactions
    where id = v_redaction_1 and statut = 'SUCCES' and output_brut = '{"audit":true}'::jsonb
  ) then
    raise exception 'T8 FAIL: mfr_redactions pas correctement mise à SUCCES avec son output_brut';
  end if;

  if not exists (
    select 1 from public.mfr_versions
    where redaction_id = v_redaction_1 and contenu = '{"contenuVersion":1,"directions":[]}'::jsonb
  ) then
    raise exception 'T8 FAIL: mfr_versions.contenu ne correspond pas exactement au payload fourni (identité stricte attendue)';
  end if;
  raise notice 'T8 PASS: FINISH SUCCES atomique — version créée, contenu = payload exact, aucune transformation';

  -- T9. Idempotence terminale : rappeler FINISH SUCCES sur la même rédaction → already_terminal=true, aucune nouvelle version.
  v_resultat := public.mfr_finir_redaction_succes(v_redaction_1, '{"audit":true}'::jsonb, '{"contenuVersion":1,"directions":[]}'::jsonb);
  if v_resultat->>'already_terminal' <> 'true' then
    raise exception 'T9 FAIL: idempotence terminale non respectée — %', v_resultat;
  end if;
  select count(*) into v_nb_versions_apres from public.mfr_versions where cycle_id = v_cycle_x;
  if v_nb_versions_apres <> v_nb_versions_avant + 1 then
    raise exception 'T9 FAIL: une version supplémentaire a été créée à tort lors du second FINISH SUCCES';
  end if;
  raise notice 'T9 PASS: idempotence terminale, aucune version supplémentaire';

  -- T10. Redaction déjà tentée pour cette curation (désormais SUCCES) → refus d'une nouvelle tentative.
  v_resultat := public.mfr_demarrer_redaction(v_cycle_x, v_analyse_a, v_curation_2, 'openai', 'gpt-6.1-sol', 'v1', '1');
  if v_resultat->>'error' <> 'redaction_deja_tentee_pour_cette_curation' then
    raise exception 'T10 FAIL: nouvelle tentative sur curation déjà rédigée pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T10 PASS: redaction_deja_tentee_pour_cette_curation refusée';

  -- T11. FINISH ECHEC sur une rédaction distincte (démarrée sur un autre cycle fixture — ici on en crée une 2e via cycle Z après lui avoir fait une curation).
  v_resultat_curation := public.mfr_creer_curation(v_cycle_z, v_analyse_z, array[]::uuid[], false);
  if v_resultat_curation->>'success' <> 'true' then
    raise exception 'FIXTURE FAIL: impossible de créer une curation 0-direction sur Z — %', v_resultat_curation;
  end if;
  declare
    v_curation_z uuid := (v_resultat_curation->>'curation_id')::uuid;
    v_redaction_z uuid;
  begin
    v_resultat := public.mfr_demarrer_redaction(v_cycle_z, v_analyse_z, v_curation_z, 'openai', 'gpt-6.1-sol', 'v1', '1');
    if v_resultat->>'success' <> 'true' then
      raise exception 'T11 FAIL: démarrage sur Z refusé — %', v_resultat;
    end if;
    v_redaction_z := (v_resultat->>'redaction_id')::uuid;

    v_resultat := public.mfr_finir_redaction_echec(v_redaction_z, 'erreur_simulee', '{"finishSignal":"refusal"}'::jsonb);
    if v_resultat->>'success' <> 'true' or v_resultat->>'already_terminal' <> 'false' then
      raise exception 'T11 FAIL: FINISH ECHEC refusé — %', v_resultat;
    end if;
    if not exists (select 1 from public.mfr_redactions where id = v_redaction_z and statut = 'ECHEC') then
      raise exception 'T11 FAIL: mfr_redactions pas correctement mise à ECHEC';
    end if;
    if exists (select 1 from public.mfr_versions where redaction_id = v_redaction_z) then
      raise exception 'T11 FAIL: aucune version ne devrait exister pour une rédaction en ECHEC';
    end if;
  end;
  raise notice 'T11 PASS: FINISH ECHEC — statut ECHEC, aucune version créée';

  -- T12. Aucun impact sur le cycle/analyse/curation réels de production.
  if (select analyse_retenue_id from public.mfr_cycles where id = '67310029-a367-4816-95f7-35d0ae4d359c') <> 'b61a8f43-d4e4-48e0-8976-64f8ef9146b2' then
    raise exception 'T12 FAIL: le cycle réel de production a été altéré';
  end if;
  if (select count(*) from public.mfr_redactions where cycle_id = '67310029-a367-4816-95f7-35d0ae4d359c') <> 0 then
    raise exception 'T12 FAIL: une rédaction réelle serait apparue à tort sur le cycle de production';
  end if;
  raise notice 'T12 PASS: cycle réel de production non touché';

  raise notice '=== TOUS LES TESTS SQL ONT PASSÉ (ces fixtures seront annulées par ROLLBACK) ===';
end $$;

rollback;
