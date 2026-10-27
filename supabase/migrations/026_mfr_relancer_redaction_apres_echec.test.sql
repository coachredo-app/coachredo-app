-- ============================================================
-- Tests SQL isolés/réversibles — reprise de rédaction (T-MFR.5A/026)
-- ============================================================
-- EXÉCUTÉ MANUELLEMENT EN PRODUCTION le 2026-10-27, PASS (14/14
-- assertions, T1-T14, aucune exception levée, bloc allé jusqu'au
-- ROLLBACK — "Success. No rows returned"). Document reflète exactement
-- la version validée, pas une version antérieure.
--
-- Méthode identique à 023/024/025 : un seul `BEGIN ... ROLLBACK`.
-- Fixtures ancrées sur le compte test réel (`user_id`/`dossier_id`
-- réels pour les FK obligatoires), `etat_logique_id`/
-- `revision_dossier_capturee` entièrement fabriqués (plage 999301+,
-- distincte de 023/024/025). Réutilise les vraies RPC déjà live
-- (`mfr_retenir_analyse` 023, `mfr_creer_curation` 024,
-- `mfr_demarrer_redaction`/`mfr_finir_redaction_echec` 025/026) pour
-- construire l'état de départ — jamais une mutation manuelle des
-- tables qu'elles gouvernent.
--
-- T7 (invariant DB actif, ajouté après audit QG du 2026-10-27) :
-- l'ancien T10 ne faisait qu'un CONSTAT indirect (absence de résidu
-- EN_COURS après coup) — pas une preuve que l'index partiel
-- `idx_mfr_redactions_curation_en_cours_unique` (026) protège
-- réellement contre deux lignes EN_COURS simultanées pour une même
-- curation. T7 provoque maintenant activement cette situation (INSERT
-- direct, hors RPC, hors garde applicative) PENDANT que `v_redaction_2`
-- est encore EN_COURS, capture l'exception `unique_violation` dans un
-- sous-bloc PL/pgSQL, et vérifie qu'il ne reste bien qu'UNE seule ligne
-- EN_COURS ensuite. L'ancien constat indirect est conservé (désormais
-- T11, après le FINISH SUCCES) — il vérifie une chose différente
-- (l'état après un cycle de vie complet), pas redondant.

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

  v_resultat           jsonb;
  v_resultat_retenir    jsonb;
  v_resultat_curation   jsonb;
  v_redaction_1         uuid;
  v_redaction_2         uuid;
  v_nb_versions_avant   integer;
  v_nb_versions_apres   integer;
  v_nb_redactions       integer;
  v_t7_violation        boolean := false;
  v_t7_nb_en_cours       integer;
begin
  -- ════════════════════════════════════════════════════════════
  -- FIXTURE : cycle X, analyse A retenue, curation 1 (1 direction PRESENTER_MAINTENANT)
  -- ════════════════════════════════════════════════════════════
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999301, 'fixture-026-test')
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
    raise exception 'FIXTURE FAIL: impossible de retenir A — %', v_resultat_retenir;
  end if;

  v_resultat_curation := public.mfr_creer_curation(v_cycle_x, v_analyse_a, array[v_hp], true);
  if v_resultat_curation->>'success' <> 'true' then
    raise exception 'FIXTURE FAIL: impossible de créer la curation 1 — %', v_resultat_curation;
  end if;
  v_curation_1 := (v_resultat_curation->>'curation_id')::uuid;

  -- ════════════════════════════════════════════════════════════
  -- TESTS
  -- ════════════════════════════════════════════════════════════

  -- T1. Reprise AVANT toute première tentative → aucune_redaction_precedente.
  v_resultat := public.mfr_relancer_redaction_apres_echec(v_cycle_x, v_analyse_a, v_curation_1, 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat->>'error' <> 'aucune_redaction_precedente' then
    raise exception 'T1 FAIL: reprise sans tentative précédente pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T1 PASS: reprise sans tentative précédente refusée';

  -- T2. Première tentative réelle, puis FINISH ECHEC.
  v_resultat := public.mfr_demarrer_redaction(v_cycle_x, v_analyse_a, v_curation_1, 'openai', 'gpt-6.1-sol', 'v1', '1');
  if v_resultat->>'success' <> 'true' then
    raise exception 'T2 FAIL: première tentative refusée — %', v_resultat;
  end if;
  v_redaction_1 := (v_resultat->>'redaction_id')::uuid;

  -- T3. Reprise pendant que la tentative est EN_COURS → redaction_en_cours.
  v_resultat := public.mfr_relancer_redaction_apres_echec(v_cycle_x, v_analyse_a, v_curation_1, 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat->>'error' <> 'redaction_en_cours' then
    raise exception 'T3 FAIL: reprise pendant EN_COURS pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T3 PASS: reprise refusée tant que la précédente est EN_COURS';

  v_resultat := public.mfr_finir_redaction_echec(v_redaction_1, 'erreur_schema_simulee', '{"finishSignal":"payload_non_json"}'::jsonb);
  if v_resultat->>'success' <> 'true' then
    raise exception 'T2 FAIL: FINISH ECHEC de la première tentative refusé — %', v_resultat;
  end if;
  raise notice 'T2 PASS: première tentative démarrée puis terminée en ECHEC';

  -- T4. Reprise maintenant que la dernière est ECHEC → succès, nouvelle ligne EN_COURS distincte.
  select count(*) into v_nb_redactions from public.mfr_redactions where curation_id = v_curation_1;
  if v_nb_redactions <> 1 then
    raise exception 'T4 FAIL: une seule rédaction devrait exister avant la reprise, trouvé %', v_nb_redactions;
  end if;

  v_resultat := public.mfr_relancer_redaction_apres_echec(v_cycle_x, v_analyse_a, v_curation_1, 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat->>'success' <> 'true' then
    raise exception 'T4 FAIL: reprise après ECHEC refusée — %', v_resultat;
  end if;
  v_redaction_2 := (v_resultat->>'redaction_id')::uuid;
  if v_redaction_2 = v_redaction_1 then
    raise exception 'T4 FAIL: la reprise doit créer une NOUVELLE ligne, distincte de la première';
  end if;
  raise notice 'T4 PASS: reprise après ECHEC acceptée, nouvelle ligne distincte créée';

  -- T5. L'ancienne rédaction ECHEC reste intacte (append-only strict).
  if not exists (
    select 1 from public.mfr_redactions
    where id = v_redaction_1 and statut = 'ECHEC' and erreur = 'erreur_schema_simulee'
  ) then
    raise exception 'T5 FAIL: la première rédaction (ECHEC) a été altérée par la reprise';
  end if;
  raise notice 'T5 PASS: ancienne rédaction ECHEC intacte, jamais mutée';

  -- T6. Aucune nouvelle curation n'a été nécessaire — toujours la même curation_1.
  if (select curation_id from public.mfr_redactions where id = v_redaction_2) <> v_curation_1 then
    raise exception 'T6 FAIL: la reprise devrait utiliser la MÊME curation, jamais une nouvelle';
  end if;
  if (select count(*) from public.mfr_curations where cycle_id = v_cycle_x) <> 1 then
    raise exception 'T6 FAIL: une seule curation devrait exister — aucune nouvelle curation créée pour la reprise';
  end if;
  raise notice 'T6 PASS: aucune nouvelle curation créée, même curation réutilisée pour la reprise';

  -- T7. Invariant DB ACTIF : pendant que v_redaction_2 est ENCORE EN_COURS,
  -- tentative d'INSERT DIRECT (hors RPC, hors garde applicative) d'une
  -- deuxième ligne EN_COURS pour la MÊME curation. Doit être rejetée par
  -- l'index partiel idx_mfr_redactions_curation_en_cours_unique (026),
  -- pas seulement par la logique métier des RPC.
  begin
    insert into public.mfr_redactions (
      cycle_id, analyse_id, curation_id, user_id, provider, model,
      prompt_version, schema_version, statut
    )
    values (
      v_cycle_x, v_analyse_a, v_curation_1, v_user_id, 'openai', 'gpt-6.1-sol',
      'v2', '2', 'EN_COURS'
    );
  exception
    when unique_violation then
      v_t7_violation := true;
  end;

  if not v_t7_violation then
    raise exception 'T7 FAIL: une deuxième ligne EN_COURS a été insérée sans violation — invariant DB (index 026) non appliqué';
  end if;

  select count(*) into v_t7_nb_en_cours
  from public.mfr_redactions
  where curation_id = v_curation_1 and statut = 'EN_COURS';

  if v_t7_nb_en_cours <> 1 then
    raise exception 'T7 FAIL: attendu exactement 1 ligne EN_COURS après la tentative rejetée, trouvé %', v_t7_nb_en_cours;
  end if;
  raise notice 'T7 PASS: insertion directe d''une 2e ligne EN_COURS rejetée par l''index partiel (unique_violation), invariant DB confirmé activement';

  -- T8. Zéro version créée avant tout FINISH SUCCES de la reprise.
  select count(*) into v_nb_versions_avant from public.mfr_versions where cycle_id = v_cycle_x;
  if v_nb_versions_avant <> 0 then
    raise exception 'T8 FAIL: aucune version ne devrait exister avant le FINISH SUCCES de la reprise';
  end if;
  raise notice 'T8 PASS: zéro version avant le FINISH SUCCES de la reprise';

  -- T9. FINISH SUCCES de la reprise → exactement 1 version créée, pour la bonne rédaction.
  v_resultat := public.mfr_finir_redaction_succes(v_redaction_2, '{"audit":true}'::jsonb, '{"contenuVersion":2,"directions":[]}'::jsonb);
  if v_resultat->>'success' <> 'true' then
    raise exception 'T9 FAIL: FINISH SUCCES de la reprise refusé — %', v_resultat;
  end if;
  select count(*) into v_nb_versions_apres from public.mfr_versions where cycle_id = v_cycle_x;
  if v_nb_versions_apres <> 1 then
    raise exception 'T9 FAIL: exactement une version aurait dû être créée, trouvé %', v_nb_versions_apres;
  end if;
  if not exists (select 1 from public.mfr_versions where redaction_id = v_redaction_2) then
    raise exception 'T9 FAIL: la version créée devrait référencer la rédaction de la REPRISE';
  end if;
  raise notice 'T9 PASS: FINISH SUCCES de la reprise crée exactement une version, pour la bonne rédaction';

  -- T10. Reprise sur une dernière tentative déjà SUCCES → refus.
  v_resultat := public.mfr_relancer_redaction_apres_echec(v_cycle_x, v_analyse_a, v_curation_1, 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat->>'error' <> 'derniere_tentative_deja_succes' then
    raise exception 'T10 FAIL: reprise après SUCCES pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T10 PASS: reprise après SUCCES refusée';

  -- T11. Aucune rédaction EN_COURS résiduelle après le cycle de vie complet (SUCCES).
  if exists (select 1 from public.mfr_redactions where curation_id = v_curation_1 and statut = 'EN_COURS') then
    raise exception 'T11 FAIL: aucune rédaction EN_COURS ne devrait rester pour cette curation';
  end if;
  raise notice 'T11 PASS: aucune rédaction EN_COURS résiduelle après SUCCES';

  -- T12. Stale analysis rejetée : analyse différente de celle retenue.
  v_resultat := public.mfr_relancer_redaction_apres_echec(v_cycle_x, gen_random_uuid(), v_curation_1, 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat->>'error' <> 'analyse_retenue_a_change' then
    raise exception 'T12 FAIL: analyse stale pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T12 PASS: analyse stale (non retenue) refusée';

  -- T13. Stale curation rejetée : curation inexistante/non officielle (UUID aléatoire).
  v_resultat := public.mfr_relancer_redaction_apres_echec(v_cycle_x, v_analyse_a, gen_random_uuid(), 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat->>'error' <> 'curation_non_officielle' then
    raise exception 'T13 FAIL: curation stale pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T13 PASS: curation stale refusée';

  -- T14. Aucun impact sur la curation/analyse/rédaction réelles de production.
  if (select analyse_retenue_id from public.mfr_cycles where id = '67310029-a367-4816-95f7-35d0ae4d359c') <> 'b61a8f43-d4e4-48e0-8976-64f8ef9146b2' then
    raise exception 'T14 FAIL: le cycle réel de production a été altéré';
  end if;
  if (select statut from public.mfr_redactions where id = '8e94d5f0-dda5-402f-bd06-a1df97723b8b') <> 'ECHEC' then
    raise exception 'T14 FAIL: la rédaction réelle ECHEC#1 a été altérée';
  end if;
  if (select count(*) from public.mfr_versions where cycle_id = '67310029-a367-4816-95f7-35d0ae4d359c') <> 0 then
    raise exception 'T14 FAIL: aucune version ne devrait exister sur le cycle réel de production';
  end if;
  raise notice 'T14 PASS: cycle/rédaction réels de production non touchés';

  raise notice '=== TOUS LES TESTS SQL ONT PASSÉ (ces fixtures seront annulées par ROLLBACK) ===';
end $$;

rollback;
