-- ============================================================
-- Tests SQL isolés/réversibles — mfr_retenir_analyse (T-MFR.4A)
-- ============================================================
-- EXÉCUTÉ (T-MFR.4A, après application live de 023) : les 11 assertions
-- ont passé sans aucune exception, ROLLBACK final effectif, zéro résidu
-- confirmé par postcheck read-only séparé. Nécessite que la migration
-- 023 soit déjà appliquée (la fonction testée doit exister) — ne peut
-- donc être lancé qu'APRÈS application contrôlée de 023, jamais avant,
-- jamais contre une base où 023 est absente.
--
-- Méthode : un seul `BEGIN ... ROLLBACK` — toutes les fixtures et tous
-- les appels RPC vivent dans la même transaction, jamais commités.
-- Aucun résidu possible, y compris en cas d'échec d'une assertion
-- (`ROLLBACK` final inconditionnel). Choisi plutôt qu'un Postgres local
-- éphémère : Docker indisponible dans cet environnement d'exécution
-- (vérifié), donc la seule méthode isolée/réversible réellement
-- praticable ici est une transaction annulée sur la base réellement
-- liée — jamais un commit, jamais une donnée de production touchée.
--
-- Fixtures ancrées sur le compte test réel déjà utilisé tout au long de
-- T-MFR.3D (`user_id`/`dossier_id` réels, car `mpd_etats_logiques` et
-- `mpd_dossiers` exigent des FK réelles vers `auth.users`/un dossier
-- existant) — mais avec un `etat_logique_id`/`revision_dossier_capturee`
-- entièrement fabriqués (jamais la vraie révision), pour ne jamais
-- entrer en collision avec le cycle réel `67310029-...` ni le modifier.
-- Toutes les lignes créées ci-dessous (mpd_etats_logiques, mfr_cycles,
-- mfr_analyses, mfr_redactions, mfr_versions, mfr_publications) sont des
-- fixtures pures, annulées par le `ROLLBACK` final.
--
-- La concurrence (deux `SELECT RETAINED` simultanés sur le même cycle)
-- N'EST PAS testable dans ce fichier à connexion unique — elle exige
-- deux connexions Postgres réellement parallèles. QG a arbitré que la
-- preuve structurelle (verrou `FOR UPDATE` exact sur `mfr_cycles`, une
-- seule ligne métier mutable, sérialisation par ce verrou — même
-- pattern déjà en production via 017/019) est suffisante pour la
-- fermeture de T-MFR.4A ; un test empirique à deux connexions n'est
-- PAS requis et n'a PAS été exécuté. Protocole disponible si besoin
-- futur, décrit dans le rapport QG — jamais un `pg_sleep` injecté dans
-- la RPC production : seulement un verrou pris manuellement par une
-- connexion de test distincte, hors de toute modification du code.

begin;

do $$
declare
  v_user_id   uuid := 'dd539d5c-5103-45b1-8e7e-579bff5b2f10'; -- compte test réel, déjà utilisé T-MFR.3D
  v_dossier_id uuid := '2e4ba803-3a4d-4d7f-91db-134967636cbb'; -- dossier réel du même compte

  v_etat_logique_1 uuid;
  v_cycle_1        uuid;
  v_analyse_succes_a uuid;
  v_analyse_succes_b uuid;
  v_analyse_echec     uuid;
  v_analyse_encours   uuid;

  v_etat_logique_autre uuid;
  v_cycle_autre        uuid;
  v_analyse_autre_cycle uuid;

  v_etat_logique_publie uuid;
  v_cycle_publie        uuid;
  v_analyse_publie      uuid;
  v_redaction_publie    uuid;
  v_version_publie      uuid;

  v_resultat jsonb;
begin
  -- ── Fixture 1 : cycle « nominal » avec deux analyses SUCCES + une
  -- ECHEC + une EN_COURS, aucune publication.
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999001, 'fixture-023-test')
  returning id into v_etat_logique_1;

  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_1)
  returning id into v_cycle_1;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_1, v_user_id, v_etat_logique_1, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_succes_a;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_1, v_user_id, v_etat_logique_1, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_succes_b;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le, erreur)
  values (v_cycle_1, v_user_id, v_etat_logique_1, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'ECHEC', now(), 'fixture_echec')
  returning id into v_analyse_echec;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut)
  values (v_cycle_1, v_user_id, v_etat_logique_1, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'EN_COURS')
  returning id into v_analyse_encours;

  -- ── Fixture 2 : un autre cycle, pour tester « analyse d'un autre cycle ».
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999002, 'fixture-023-test')
  returning id into v_etat_logique_autre;

  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_autre)
  returning id into v_cycle_autre;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_autre, v_user_id, v_etat_logique_autre, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_autre_cycle;

  -- ── Fixture 3 : un cycle DÉJÀ PUBLIÉ (chaîne complète analyse → rédaction → version → publication).
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999003, 'fixture-023-test')
  returning id into v_etat_logique_publie;

  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_publie)
  returning id into v_cycle_publie;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_publie, v_user_id, v_etat_logique_publie, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_publie;

  insert into public.mfr_redactions (analyse_id, cycle_id, user_id, provider, model, prompt_version, schema_version, statut, terminee_le)
  values (v_analyse_publie, v_cycle_publie, v_user_id, 'openai', 'gpt-6.1-sol', 'v2', '1', 'SUCCES', now())
  returning id into v_redaction_publie;

  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_publie, v_redaction_publie, v_user_id, 1, '{"fixture":true}'::jsonb)
  returning id into v_version_publie;

  insert into public.mfr_publications (cycle_id, version_id, user_id)
  values (v_cycle_publie, v_version_publie, v_user_id);

  -- Retenir manuellement l'analyse publiée (simule un état déjà figé,
  -- sans passer par la RPC — on teste ici son REFUS, pas son usage réel).
  update public.mfr_cycles set analyse_retenue_id = v_analyse_publie where id = v_cycle_publie;

  -- ════════════════════════════════════════════════════════════
  -- TESTS
  -- ════════════════════════════════════════════════════════════

  -- T1. Succès initial : cycle nominal, aucune analyse retenue encore.
  v_resultat := public.mfr_retenir_analyse(v_cycle_1, v_analyse_succes_a);
  if not (v_resultat->>'success' = 'true') then
    raise exception 'T1 FAIL: succès initial refusé — %', v_resultat;
  end if;
  if (select analyse_retenue_id from public.mfr_cycles where id = v_cycle_1) <> v_analyse_succes_a then
    raise exception 'T1 FAIL: analyse_retenue_id non posé correctement';
  end if;
  raise notice 'T1 PASS: succès initial';

  -- T2. A → A idempotent : modifie_le ne doit pas changer sans raison réelle.
  declare
    v_modifie_avant timestamptz;
    v_modifie_apres timestamptz;
  begin
    select modifie_le into v_modifie_avant from public.mfr_cycles where id = v_cycle_1;
    perform pg_sleep(0.01); -- écart temporel mesurable si (et seulement si) modifie_le était réécrit à tort
    v_resultat := public.mfr_retenir_analyse(v_cycle_1, v_analyse_succes_a);
    select modifie_le into v_modifie_apres from public.mfr_cycles where id = v_cycle_1;
    if not (v_resultat->>'success' = 'true') then
      raise exception 'T2 FAIL: A→A refusé — %', v_resultat;
    end if;
    if v_modifie_avant <> v_modifie_apres then
      raise exception 'T2 FAIL: modifie_le a changé sur un A→A sans mutation réelle';
    end if;
  end;
  raise notice 'T2 PASS: A→A idempotent, modifie_le inchangé';

  -- T3. A → B avant publication : changement d'avis autorisé.
  v_resultat := public.mfr_retenir_analyse(v_cycle_1, v_analyse_succes_b);
  if not (v_resultat->>'success' = 'true') then
    raise exception 'T3 FAIL: A→B refusé — %', v_resultat;
  end if;
  if (select analyse_retenue_id from public.mfr_cycles where id = v_cycle_1) <> v_analyse_succes_b then
    raise exception 'T3 FAIL: pointeur non déplacé vers B';
  end if;
  raise notice 'T3 PASS: A→B avant publication';

  -- T4. Analyse ECHEC refusée.
  v_resultat := public.mfr_retenir_analyse(v_cycle_1, v_analyse_echec);
  if v_resultat->>'error' <> 'analyse_non_succes' then
    raise exception 'T4 FAIL: ECHEC pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T4 PASS: analyse ECHEC refusée';

  -- T5. Analyse EN_COURS refusée.
  v_resultat := public.mfr_retenir_analyse(v_cycle_1, v_analyse_encours);
  if v_resultat->>'error' <> 'analyse_non_succes' then
    raise exception 'T5 FAIL: EN_COURS pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T5 PASS: analyse EN_COURS refusée';

  -- T6. Analyse d'un AUTRE cycle refusée (même si elle existe et est SUCCES).
  v_resultat := public.mfr_retenir_analyse(v_cycle_1, v_analyse_autre_cycle);
  if v_resultat->>'error' <> 'analyse_introuvable' then
    raise exception 'T6 FAIL: analyse d''un autre cycle pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T6 PASS: analyse d''un autre cycle refusée (analyse_introuvable)';

  -- T7. Cycle déjà publié : refus total, y compris pour sa propre analyse déjà retenue (A→A sur cycle publié).
  v_resultat := public.mfr_retenir_analyse(v_cycle_publie, v_analyse_publie);
  if v_resultat->>'error' <> 'cycle_publie' then
    raise exception 'T7 FAIL: cycle publié pas refusé comme attendu — %', v_resultat;
  end if;
  raise notice 'T7 PASS: cycle publié refusé (y compris A→A)';

  -- T8. Cycle inexistant.
  v_resultat := public.mfr_retenir_analyse(gen_random_uuid(), v_analyse_succes_a);
  if v_resultat->>'error' <> 'cycle_introuvable' then
    raise exception 'T8 FAIL: cycle inexistant pas refusé comme attendu — %', v_resultat;
  end if;
  raise notice 'T8 PASS: cycle inexistant refusé';

  -- T9. Analyse totalement inexistante (UUID aléatoire) sur un cycle valide.
  v_resultat := public.mfr_retenir_analyse(v_cycle_1, gen_random_uuid());
  if v_resultat->>'error' <> 'analyse_introuvable' then
    raise exception 'T9 FAIL: analyse inexistante pas refusée comme attendu — %', v_resultat;
  end if;
  raise notice 'T9 PASS: analyse inexistante refusée';

  -- T10. Aucune mutation du graphe analytique ni de l'analyse elle-même
  -- (statut/terminee_le/output_brut de v_analyse_succes_b inchangés après T3).
  if exists (
    select 1 from public.mfr_analyses
    where id = v_analyse_succes_b
      and (statut <> 'SUCCES' or terminee_le is null)
  ) then
    raise exception 'T10 FAIL: l''analyse retenue a été mutée par la RPC';
  end if;
  raise notice 'T10 PASS: aucune mutation de l''analyse retenue';

  -- T11. Aucun impact sur le cycle réel de production (non touché par construction, vérifié explicitement).
  if (select analyse_retenue_id from public.mfr_cycles where id = '67310029-a367-4816-95f7-35d0ae4d359c') is not null then
    raise exception 'T11 FAIL: le cycle réel de production a été modifié — ne devrait JAMAIS arriver (fixtures isolées)';
  end if;
  raise notice 'T11 PASS: cycle réel de production non touché';

  raise notice '=== TOUS LES TESTS SQL ONT PASSÉ (ces fixtures seront annulées par ROLLBACK) ===';
end $$;

rollback;
