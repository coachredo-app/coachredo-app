-- ============================================================
-- Test fonctionnel autonome T19 — migration 027 (T-MFR.5B-1)
-- ============================================================
-- SCRIPT DE VÉRIFICATION ISOLÉ, PAS UNE MIGRATION. BEGIN...ROLLBACK,
-- aucun COMMIT. Reprend fidèlement le scénario T19 de
-- `027_mfr_validation_publication.test.sql` (Fixture 7 + assertion
-- T19), extrait pour exécution ciblée après confirmation des
-- propriétaires (TEST 5, 2026-10-27 : les 4 RPC de rédaction
-- appartiennent à `postgres`, SECURITY DEFINER=true).
--
-- Objectif : vérifier RÉELLEMENT que `mfr_finir_redaction_succes`
-- (025) continue de fonctionner après que les écritures directes de
-- `service_role` sur `mfr_versions`/`mfr_publications` ont été
-- révoquées (027 §3) — preuve empirique que cette RPC s'exécute avec
-- les privilèges de son PROPRIÉTAIRE (`postgres`), jamais ceux de
-- l'appelant (`service_role`).
--
-- DÉPENDANCES / LIMITES (à lire avant exécution) :
--   1. Ce script applique lui-même, au début, les 4 instructions de
--      révocation de la section 3 de 027 — il ne suppose PAS que 027
--      est déjà appliquée en production. Si 027 est déjà réellement
--      appliquée au moment de l'exécution, ces 4 instructions sont
--      strictement redondantes et sans effet (REVOKE/GRANT sont
--      idempotents en PostgreSQL) — aucun risque dans les deux cas.
--   2. Ce script NE CRÉE PAS `mfr_valider_version`/`mfr_publier_version`
--      — inutile pour T19, qui ne les appelle jamais. Si tu veux
--      vérifier CES deux fonctions spécifiquement, utilise le dry-run
--      complet (`027_mfr_validation_publication.dryrun.sql`) ou le
--      fichier de tests complet (20 assertions).
--   3. Fixture entièrement fictive, compte test réel (`user_id`/
--      `dossier_id` déjà utilisés dans tout ce chantier) mais
--      `etat_logique_id` fabriqué à la révision 999407 — IDENTIQUE à
--      la Fixture 7 du fichier de tests complet, jamais le dossier/
--      cycle réel du client (`67310029-...`). Aucune donnée réelle
--      lue ni modifiée.
--   4. `ROLLBACK` final annule tout : la fixture ET les 4 révocations
--      appliquées en tête de script — aucune modification permanente,
--      y compris si 027 n'était pas déjà live.
--   5. Résultat explicite : `raise notice 'T19 PASS...'` en cas de
--      succès, `raise exception 'T19 FAIL...'` (visible comme erreur
--      bloquante dans le SQL Editor, transaction annulée) en cas
--      d'échec — jamais un résultat silencieux.

BEGIN;

-- Révocation (section 3 de 027) — condition « après révocation »
-- réellement en vigueur pour le test ci-dessous, pas seulement supposée.
revoke all on public.mfr_versions from service_role;
grant select on public.mfr_versions to service_role;

revoke all on public.mfr_publications from service_role;
grant select on public.mfr_publications to service_role;

-- Confirmation visible de la condition avant le test, sur les DEUX
-- tables (preuve, pas une hypothèse) — exigé pour chacune :
-- select_ok=true, insert_ok=false, update_ok=false, delete_ok=false.
-- EXCEPTION immédiate si une seule condition est incorrecte, sur
-- n'importe laquelle des deux tables.
do $$
declare
  v_table      text;
  v_select_ok  boolean;
  v_insert_ok  boolean;
  v_update_ok  boolean;
  v_delete_ok  boolean;
begin
  foreach v_table in array array['public.mfr_versions', 'public.mfr_publications']
  loop
    v_select_ok := has_table_privilege('service_role', v_table, 'SELECT');
    v_insert_ok := has_table_privilege('service_role', v_table, 'INSERT');
    v_update_ok := has_table_privilege('service_role', v_table, 'UPDATE');
    v_delete_ok := has_table_privilege('service_role', v_table, 'DELETE');
    raise notice 'PRECONDITION %: select=% insert=% update=% delete=%', v_table, v_select_ok, v_insert_ok, v_update_ok, v_delete_ok;
    if v_select_ok is not true or v_insert_ok is not false or v_update_ok is not false or v_delete_ok is not false then
      raise exception 'PRECONDITION FAIL (%): attendu select=true/insert=false/update=false/delete=false, obtenu select=%/insert=%/update=%/delete=% — la révocation n''est pas effective, T19 ne peut pas prouver ce qu''il doit prouver', v_table, v_select_ok, v_insert_ok, v_update_ok, v_delete_ok;
    end if;
  end loop;
end $$;

do $$
declare
  v_user_id    uuid := 'dd539d5c-5103-45b1-8e7e-579bff5b2f10';
  v_dossier_id uuid := '2e4ba803-3a4d-4d7f-91db-134967636cbb';

  v_etat_r              uuid;
  v_cycle_r             uuid;
  v_analyse_r           uuid;
  v_hp_r1               uuid;
  v_curation_r1         uuid;
  v_redaction_r1        uuid;

  v_resultat            jsonb;
  v_resultat_retenir    jsonb;
  v_resultat_curation   jsonb;
  v_resultat_redaction  jsonb;
begin
  -- ════════════════════════════════════════════════════════════
  -- FIXTURE 7 — cycle_r : non-régression mfr_finir_redaction_succes
  -- après révocation service_role (027 §3) — doit continuer de créer
  -- une version normalement (SECURITY DEFINER, privilèges du
  -- propriétaire, jamais ceux de service_role).
  -- ════════════════════════════════════════════════════════════
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999407, 'fixture-027-test') returning id into v_etat_r;
  insert into public.mfr_cycles (user_id, etat_logique_id) values (v_user_id, v_etat_r) returning id into v_cycle_r;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_r, v_user_id, v_etat_r, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now()) returning id into v_analyse_r;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_r, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP R1') returning id into v_hp_r1;
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_r, v_hp_r1, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', true);
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_r, v_analyse_r);
  if v_resultat_retenir->>'success' <> 'true' then raise exception 'FIXTURE FAIL (r): retenir analyse — %', v_resultat_retenir; end if;
  v_resultat_curation := public.mfr_creer_curation(v_cycle_r, v_analyse_r, array[v_hp_r1], true);
  if v_resultat_curation->>'success' <> 'true' then raise exception 'FIXTURE FAIL (r): creer curation — %', v_resultat_curation; end if;
  v_curation_r1 := (v_resultat_curation->>'curation_id')::uuid;
  v_resultat_redaction := public.mfr_demarrer_redaction(v_cycle_r, v_analyse_r, v_curation_r1, 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat_redaction->>'success' <> 'true' then raise exception 'FIXTURE FAIL (r): demarrer redaction — %', v_resultat_redaction; end if;
  v_redaction_r1 := (v_resultat_redaction->>'redaction_id')::uuid;

  -- T19. mfr_finir_redaction_succes doit continuer de fonctionner après la
  -- révocation des écritures directes service_role (027 §3) — preuve que
  -- la RPC s'exécute avec les privilèges de son propriétaire, pas ceux de
  -- service_role.
  v_resultat := public.mfr_finir_redaction_succes(v_redaction_r1, '{"audit":true}'::jsonb, '{"contenuVersion":1,"directions":[]}'::jsonb);
  if v_resultat->>'success' <> 'true' then
    raise exception 'T19 FAIL: mfr_finir_redaction_succes cassée par la révocation service_role — %', v_resultat;
  end if;
  raise notice 'T19 PASS: mfr_finir_redaction_succes toujours fonctionnelle après révocation service_role';
end $$;

ROLLBACK;
