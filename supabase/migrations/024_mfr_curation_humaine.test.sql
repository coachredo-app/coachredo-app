-- ============================================================
-- Tests SQL isolés/réversibles — mfr_creer_curation (T-MFR.4B)
-- ============================================================
-- EXÉCUTÉ (T-MFR.4B, le 2026-10-22, après application live de 024) : les
-- 18 assertions ont passé sans aucune exception, ROLLBACK final
-- effectif, zéro résidu confirmé par postcheck read-only séparé. Le
-- REAL E2E 4B (une curation réelle, hors de ce fichier de test) a été
-- validé séparément. Nécessite que la migration 024 soit déjà appliquée
-- (la fonction testée doit exister) — ne peut donc être lancé qu'APRÈS
-- application contrôlée de 024, jamais avant.
--
-- Méthode identique à 023_mfr_retenir_analyse.test.sql : un seul
-- `BEGIN ... ROLLBACK`, toutes les fixtures et tous les appels RPC
-- vivent dans la même transaction, jamais commités. Aucun résidu
-- possible, y compris en cas d'échec d'une assertion (`ROLLBACK` final
-- inconditionnel). Fixtures ancrées sur le compte test réel déjà
-- utilisé tout au long de T-MFR.3D/4A (`user_id`/`dossier_id` réels pour
-- satisfaire les FK obligatoires), mais `etat_logique_id`/
-- `revision_dossier_capturee` entièrement fabriqués (plage 999101+,
-- distincte de celle déjà utilisée par 023_*.test.sql), pour ne jamais
-- entrer en collision avec un cycle réel ni avec l'autre fichier de
-- test.
--
-- Le test A→B réutilise la RPC réelle `mfr_retenir_analyse` (023, déjà
-- appliquée live) pour faire transiter le cycle fixture de l'analyse A
-- vers B — jamais une mutation manuelle de `analyse_retenue_id`.
--
-- La concurrence n'est pas testée ici — même arbitrage que pour 023
-- (preuve structurelle du verrou `FOR UPDATE` acceptée par QG pour
-- cette fermeture, pas de test empirique à deux connexions requis).

begin;

do $$
declare
  v_user_id    uuid := 'dd539d5c-5103-45b1-8e7e-579bff5b2f10'; -- compte test réel
  v_dossier_id uuid := '2e4ba803-3a4d-4d7f-91db-134967636cbb'; -- dossier réel du même compte

  -- Cycle X : analyse A (SUCCES, retenue) puis analyse B (SUCCES) après bascule.
  v_etat_logique_x uuid;
  v_cycle_x        uuid;
  v_analyse_a      uuid;
  v_analyse_b      uuid;

  -- Hypothèses de l'analyse A : 4 PRESENTER_MAINTENANT (dont 1 recommandée),
  -- 1 DIRECTION_A_GARDER_EN_VUE, 1 NE_PAS_PRESENTER.
  v_hp  uuid; -- PRESENTER_MAINTENANT, recommandee_aujourdhui = true
  v_hp2 uuid; -- PRESENTER_MAINTENANT
  v_hp3 uuid; -- PRESENTER_MAINTENANT
  v_hp4 uuid; -- PRESENTER_MAINTENANT (4e, pour tester le refus >3 sans ambiguïté)
  v_hg  uuid; -- DIRECTION_A_GARDER_EN_VUE
  v_hn  uuid; -- NE_PAS_PRESENTER

  -- Hypothèses de l'analyse B : 1 recommandée, 1 non recommandée.
  v_hb1 uuid; -- PRESENTER_MAINTENANT, non recommandée
  v_hb2 uuid; -- PRESENTER_MAINTENANT, recommandee_aujourdhui = true

  -- Cycle Y : analyse C (SUCCES, retenue), aucune recommandation IA du tout.
  v_etat_logique_y uuid;
  v_cycle_y        uuid;
  v_analyse_c      uuid;
  v_hc1            uuid; -- PRESENTER_MAINTENANT, aucune recommandation sur toute l'analyse

  -- Cycle Z : analyse SUCCES existante mais jamais retenue (analyse_retenue_id reste NULL).
  v_etat_logique_z uuid;
  v_cycle_z        uuid;
  v_analyse_z      uuid;

  -- Cycle publié.
  v_etat_logique_publie uuid;
  v_cycle_publie         uuid;
  v_analyse_publie       uuid;
  v_hp_publie            uuid;
  v_redaction_publie     uuid;
  v_version_publie       uuid;

  v_resultat        jsonb;
  v_resultat_retenir jsonb;
  v_curation_1      uuid;
  v_curation_2      uuid;
  v_nb_directions   integer;
begin
  -- ════════════════════════════════════════════════════════════
  -- FIXTURES
  -- ════════════════════════════════════════════════════════════

  -- Cycle X, analyse A (SUCCES, retenue par défaut via mfr_retenir_analyse).
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999101, 'fixture-024-test')
  returning id into v_etat_logique_x;

  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_x)
  returning id into v_cycle_x;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_x, v_user_id, v_etat_logique_x, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_a;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_x, v_user_id, v_etat_logique_x, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_b;

  -- Hypothèses + évaluations D025 de l'analyse A.
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_a, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP') returning id into v_hp;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_a, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP2') returning id into v_hp2;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_a, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP3') returning id into v_hp3;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_a, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP4') returning id into v_hp4;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_a, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HG') returning id into v_hg;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_a, v_user_id, 'REJETEE', 'Fixture HN') returning id into v_hn;

  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_a, v_hp, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', true);
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_a, v_hp2, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', false);
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_a, v_hp3, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', false);
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_a, v_hp4, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', false);
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_a, v_hg, v_user_id, true, true, 'CONSTRUCTIBLE_MAIS_PREMATUREE', null, 'DIRECTION_A_GARDER_EN_VUE', false);
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_a, v_hn, v_user_id, false, null, null, null, 'NE_PAS_PRESENTER', false);

  -- Hypothèses + évaluations D025 de l'analyse B (même cycle).
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_b, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HB1') returning id into v_hb1;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_b, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HB2') returning id into v_hb2;

  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_b, v_hb1, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', false);
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_b, v_hb2, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', true);

  -- Cycle Y, analyse C : aucune recommandation IA du tout (pour tester le refus dédié).
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999102, 'fixture-024-test')
  returning id into v_etat_logique_y;

  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_y)
  returning id into v_cycle_y;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_y, v_user_id, v_etat_logique_y, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_c;

  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_c, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HC1') returning id into v_hc1;
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_c, v_hc1, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', false);

  -- Cycle Z : une analyse SUCCES existe mais n'a jamais été retenue.
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999103, 'fixture-024-test')
  returning id into v_etat_logique_z;

  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_z)
  returning id into v_cycle_z;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_z, v_user_id, v_etat_logique_z, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_z;

  -- Cycle déjà publié (chaîne complète, analyse retenue).
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999104, 'fixture-024-test')
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

  insert into public.mfr_redactions (analyse_id, cycle_id, user_id, provider, model, prompt_version, schema_version, statut, terminee_le)
  values (v_analyse_publie, v_cycle_publie, v_user_id, 'openai', 'gpt-6.1-sol', 'v2', '1', 'SUCCES', now())
  returning id into v_redaction_publie;

  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_publie, v_redaction_publie, v_user_id, 1, '{"fixture":true}'::jsonb)
  returning id into v_version_publie;

  insert into public.mfr_publications (cycle_id, version_id, user_id)
  values (v_cycle_publie, v_version_publie, v_user_id);

  update public.mfr_cycles set analyse_retenue_id = v_analyse_publie where id = v_cycle_publie;

  -- Retenir A pour le cycle X (via la vraie RPC 023, déjà live) — jamais une mutation manuelle.
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_x, v_analyse_a);
  if v_resultat_retenir->>'success' <> 'true' then
    raise exception 'FIXTURE FAIL: impossible de retenir A sur le cycle X — %', v_resultat_retenir;
  end if;

  -- Retenir C pour le cycle Y.
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_y, v_analyse_c);
  if v_resultat_retenir->>'success' <> 'true' then
    raise exception 'FIXTURE FAIL: impossible de retenir C sur le cycle Y — %', v_resultat_retenir;
  end if;

  -- ════════════════════════════════════════════════════════════
  -- TESTS
  -- ════════════════════════════════════════════════════════════

  -- T1. Cycle sans analyse retenue (Z) → refus.
  v_resultat := public.mfr_creer_curation(v_cycle_z, v_analyse_z, array[]::uuid[], false);
  if v_resultat->>'error' <> 'aucune_analyse_retenue' then
    raise exception 'T1 FAIL: cycle sans analyse retenue pas refusé comme attendu — %', v_resultat;
  end if;
  raise notice 'T1 PASS: cycle sans analyse retenue refusé';

  -- T2. Analyse différente de celle retenue (B alors que A est retenue sur X) → refus.
  v_resultat := public.mfr_creer_curation(v_cycle_x, v_analyse_b, array[]::uuid[], false);
  if v_resultat->>'error' <> 'analyse_retenue_a_change' then
    raise exception 'T2 FAIL: analyse non retenue pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T2 PASS: analyse différente de celle retenue refusée';

  -- T3. Cycle publié → refus.
  v_resultat := public.mfr_creer_curation(v_cycle_publie, v_analyse_publie, array[]::uuid[], false);
  if v_resultat->>'error' <> 'cycle_publie' then
    raise exception 'T3 FAIL: cycle publié pas refusé comme attendu — %', v_resultat;
  end if;
  raise notice 'T3 PASS: cycle publié refusé';

  -- T4. 0 direction valide.
  v_resultat := public.mfr_creer_curation(v_cycle_x, v_analyse_a, array[]::uuid[], false);
  if v_resultat->>'success' <> 'true' then
    raise exception 'T4 FAIL: 0 direction refusée — %', v_resultat;
  end if;
  v_curation_1 := (v_resultat->>'curation_id')::uuid;
  select count(*) into v_nb_directions from public.mfr_curation_directions where curation_id = v_curation_1;
  if v_nb_directions <> 0 then
    raise exception 'T4 FAIL: 0 direction attendue, % trouvée(s)', v_nb_directions;
  end if;
  raise notice 'T4 PASS: 0 direction valide';

  -- T5. 1 direction valide.
  v_resultat := public.mfr_creer_curation(v_cycle_x, v_analyse_a, array[v_hp2], false);
  if v_resultat->>'success' <> 'true' then
    raise exception 'T5 FAIL: 1 direction refusée — %', v_resultat;
  end if;
  raise notice 'T5 PASS: 1 direction valide';

  -- T6. 3 directions valides.
  v_resultat := public.mfr_creer_curation(v_cycle_x, v_analyse_a, array[v_hp, v_hp2, v_hp3], true);
  if v_resultat->>'success' <> 'true' then
    raise exception 'T6 FAIL: 3 directions refusées — %', v_resultat;
  end if;
  v_curation_2 := (v_resultat->>'curation_id')::uuid;
  raise notice 'T6 PASS: 3 directions valides (avec recommandation confirmée)';

  -- T7. 4 directions → refus (cardinalité, toutes par ailleurs éligibles).
  v_resultat := public.mfr_creer_curation(v_cycle_x, v_analyse_a, array[v_hp, v_hp2, v_hp3, v_hp4], false);
  if v_resultat->>'error' <> 'trop_de_directions' then
    raise exception 'T7 FAIL: 4 directions pas refusées comme attendu — %', v_resultat;
  end if;
  raise notice 'T7 PASS: 4 directions refusées';

  -- T8. Doublon dans le tableau → refus.
  v_resultat := public.mfr_creer_curation(v_cycle_x, v_analyse_a, array[v_hp, v_hp], false);
  if v_resultat->>'error' <> 'doublon_direction' then
    raise exception 'T8 FAIL: doublon pas refusé comme attendu — %', v_resultat;
  end if;
  raise notice 'T8 PASS: doublon refusé';

  -- T9. Direction non PRESENTER_MAINTENANT (DIRECTION_A_GARDER_EN_VUE) → refus.
  v_resultat := public.mfr_creer_curation(v_cycle_x, v_analyse_a, array[v_hg], false);
  if v_resultat->>'error' <> 'direction_non_eligible' then
    raise exception 'T9 FAIL: direction GARDER_EN_VUE pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T9 PASS: direction non PRESENTER_MAINTENANT refusée';

  -- T10. Hypothèse d'une AUTRE analyse (B) alors que A est retenue → refus.
  v_resultat := public.mfr_creer_curation(v_cycle_x, v_analyse_a, array[v_hb1], false);
  if v_resultat->>'error' <> 'direction_non_eligible' then
    raise exception 'T10 FAIL: hypothèse d''une autre analyse pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T10 PASS: hypothèse d''une autre analyse refusée';

  -- T11. Recommandation confirmée valide (HP est recommandee_aujourdhui=true).
  v_resultat := public.mfr_creer_curation(v_cycle_x, v_analyse_a, array[v_hp], true);
  if v_resultat->>'success' <> 'true' then
    raise exception 'T11 FAIL: recommandation confirmée valide refusée — %', v_resultat;
  end if;
  raise notice 'T11 PASS: recommandation confirmée valide';

  -- T12. Recommandation confirmée sans AUCUNE recommandation IA sur l'analyse (cycle Y / analyse C) → refus.
  v_resultat := public.mfr_creer_curation(v_cycle_y, v_analyse_c, array[v_hc1], true);
  if v_resultat->>'error' <> 'aucune_recommandation_proposee' then
    raise exception 'T12 FAIL: confirmation sans recommandation IA pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T12 PASS: recommandation confirmée sans recommandation IA refusée';

  -- T13. Recommandation IA (HB2) proposée mais NON sélectionnée, confirmation=true → refus.
  -- (nécessite que B soit retenue — bascule via la vraie RPC 023, testée ensuite comme A→B)
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_x, v_analyse_b);
  if v_resultat_retenir->>'success' <> 'true' then
    raise exception 'FIXTURE FAIL: bascule A→B impossible — %', v_resultat_retenir;
  end if;

  v_resultat := public.mfr_creer_curation(v_cycle_x, v_analyse_b, array[v_hb1], true);
  if v_resultat->>'error' <> 'recommandation_non_selectionnee' then
    raise exception 'T13 FAIL: recommandation IA non sélectionnée pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T13 PASS: recommandation IA non sélectionnée + confirmation=true refusée';

  -- T14. Recommandation retirée (confirmation=false) sur B, HB2 sélectionnée → valide.
  v_resultat := public.mfr_creer_curation(v_cycle_x, v_analyse_b, array[v_hb2], false);
  if v_resultat->>'success' <> 'true' then
    raise exception 'T14 FAIL: recommandation retirée valide refusée — %', v_resultat;
  end if;
  raise notice 'T14 PASS: recommandation retirée (confirmation=false) valide';

  -- T15. A→B : la curation faite sur A (v_curation_2, 3 directions) reste intacte,
  -- et le cycle X porte désormais B comme analyse retenue — B a bien exigé (et
  -- reçu, T13/T14) sa propre curation, distincte de celle de A.
  if not exists (select 1 from public.mfr_curations where id = v_curation_2 and analyse_id = v_analyse_a) then
    raise exception 'T15 FAIL: curation faite sur A a disparu ou a été mutée';
  end if;
  select count(*) into v_nb_directions from public.mfr_curation_directions where curation_id = v_curation_2;
  if v_nb_directions <> 3 then
    raise exception 'T15 FAIL: curation sur A devrait toujours avoir 3 directions, en a %', v_nb_directions;
  end if;
  if (select analyse_retenue_id from public.mfr_cycles where id = v_cycle_x) <> v_analyse_b then
    raise exception 'T15 FAIL: le cycle X devrait désormais avoir B comme analyse retenue, pas A';
  end if;
  if not exists (select 1 from public.mfr_curations where cycle_id = v_cycle_x and analyse_id = v_analyse_b) then
    raise exception 'T15 FAIL: aucune curation n''existe pour B — T13/T14 auraient dû en créer une';
  end if;
  raise notice 'T15 PASS: curation A conservée intacte, B exige (et a reçu) sa propre curation distincte';

  -- T16. Append-only : la toute première curation sur A (0 direction, T4) n'a
  -- JAMAIS été mutée malgré les curations suivantes sur la même analyse (T5, T6,
  -- T11) — plusieurs curations coexistent bien pour une même analyse (append-only
  -- réel, aucun UPDATE/remplacement). La résolution « officielle » (ORDER BY
  -- cree_le DESC, id DESC LIMIT 1) retourne exactement UNE ligne, jamais une
  -- ambiguïté/erreur.
  --
  -- LIMITE HONNÊTE DE CE TEST, vérifiée empiriquement avant correction : `now()`
  -- (= `transaction_timestamp()`) est FIGÉE pour toute la durée d'une transaction
  -- Postgres — confirmé par une requête directe (`now()` strictement identique
  -- avant/après un `pg_sleep(1.5)`, alors que `clock_timestamp()` avance
  -- réellement). Toutes les curations créées par CE script partagent donc
  -- exactement le même `cree_le`, et le tri `ORDER BY cree_le DESC, id DESC` ne
  -- peut alors se résoudre que par `id` (un UUID aléatoire, sans rapport avec
  -- l'ordre de création) — il est donc IMPOSSIBLE de prouver ici, de façon fiable,
  -- que la résolution retourne spécifiquement « la plus récemment soumise » parmi
  -- des curations créées dans une même transaction. Ce scénario exact (deux
  -- curations humaines réelles dans la même transaction) ne se produit jamais en
  -- usage réel : chaque appel RPC est sa propre transaction, avec son propre
  -- `transaction_timestamp()` réellement distinct. Ce test vérifie donc
  -- uniquement ce qui est réellement démontrable ici — pas l'exactitude du
  -- tri lui-même, déjà couverte par le même mécanisme exact et déjà prouvé par
  -- 019 (`mfr_relancer_analyse_apres_echec`, en production).
  if not exists (select 1 from public.mfr_curations where id = v_curation_1 and analyse_id = v_analyse_a) then
    raise exception 'T16 FAIL: la toute première curation sur A (0 direction) a disparu';
  end if;
  select count(*) into v_nb_directions from public.mfr_curation_directions where curation_id = v_curation_1;
  if v_nb_directions <> 0 then
    raise exception 'T16 FAIL: la première curation sur A devrait toujours avoir 0 direction, en a %', v_nb_directions;
  end if;
  select count(*) into v_nb_directions from public.mfr_curations where cycle_id = v_cycle_x and analyse_id = v_analyse_a;
  if v_nb_directions < 2 then
    raise exception 'T16 FAIL: plusieurs curations devraient coexister pour A (append-only), trouvé %', v_nb_directions;
  end if;
  select count(*) into v_nb_directions from (
    select id from public.mfr_curations
    where cycle_id = v_cycle_x and analyse_id = v_analyse_a
    order by cree_le desc, id desc limit 1
  ) as resolution;
  if v_nb_directions <> 1 then
    raise exception 'T16 FAIL: la résolution « officielle » devrait retourner exactement une ligne, en a %', v_nb_directions;
  end if;
  raise notice 'T16 PASS: révisions append-only (coexistence + non-mutation confirmées), résolution officielle non ambiguë (voir limite documentée ci-dessus)';

  -- T17. Aucune mutation du graphe analytique (vérification large sur l'analyse A).
  if exists (
    select 1 from public.mfr_hypotheses where analyse_id = v_analyse_a and formulation not like 'Fixture %'
  ) then
    raise exception 'T17 FAIL: le graphe de l''analyse A semble avoir été altéré';
  end if;
  raise notice 'T17 PASS: aucune mutation du graphe analytique';

  -- T18. Aucun impact sur le cycle réel de production.
  if (select analyse_retenue_id from public.mfr_cycles where id = '67310029-a367-4816-95f7-35d0ae4d359c') <> 'b61a8f43-d4e4-48e0-8976-64f8ef9146b2' then
    raise exception 'T18 FAIL: le cycle réel de production a été altéré — ne devrait JAMAIS arriver (fixtures isolées)';
  end if;
  raise notice 'T18 PASS: cycle réel de production non touché';

  raise notice '=== TOUS LES TESTS SQL ONT PASSÉ (ces fixtures seront annulées par ROLLBACK) ===';
end $$;

rollback;
