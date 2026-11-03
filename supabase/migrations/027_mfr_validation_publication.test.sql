-- ============================================================
-- Tests SQL isolés/réversibles — validation + publication MFR (027)
-- ============================================================
-- PRÉPARÉ, NON EXÉCUTÉ dans cette passe (GO QG explicite requis avant
-- exécution, et nécessite que 027 soit déjà appliquée). Un seul
-- `BEGIN ... ROLLBACK`, même méthode que 023/024/025/026.
--
-- Fixtures ancrées sur le compte test réel (`user_id`/`dossier_id`
-- réels pour les FK obligatoires), `etat_logique_id`/
-- `revision_dossier_capturee` entièrement fabriqués (plage 999401+,
-- distincte de 023/024/025/026). Réutilise les vraies RPC déjà live
-- pour construire l'état de départ (`mfr_retenir_analyse`,
-- `mfr_creer_curation`, `mfr_demarrer_redaction`,
-- `mfr_finir_redaction_succes`) — jamais une mutation manuelle des
-- tables qu'elles gouvernent. La seule exception délibérée : T12
-- fabrique une DEUXIÈME ligne `mfr_versions` par INSERT direct (aucune
-- RPC ne permet de créer un second brouillon après succès) uniquement
-- pour exercer le chemin `cycle_deja_publie`/`cycle_deja_publie_autre_version`
-- — jamais pour tester l'écriture de `mfr_versions` elle-même (déjà
-- couverte par le test 025).
--
-- Ce fichier couvre ce qui est VÉRIFIABLE dans une transaction unique
-- (idempotence logique, séquencement des vérifications, immutabilité).
-- Il ne couvre PAS la concurrence réelle entre deux sessions distinctes
-- (deux connexions séparées se disputant le même verrou `FOR UPDATE`) —
-- impossible à exercer dans un script mono-session ; une vérification
-- de ce type nécessiterait deux onglets SQL Editor simultanés ou un
-- harnais de test multi-connexion dédié, hors périmètre de ce fichier.
-- Les grants (`EXECUTE`/`SELECT` par rôle) ne sont pas non plus testés
-- ici — déjà couverts par les vérifications `supabase-js` (anon/
-- service_role) utilisées pour 026, à refaire après application de 027.

begin;

do $$
declare
  v_user_id    uuid := 'dd539d5c-5103-45b1-8e7e-579bff5b2f10';
  v_dossier_id uuid := '2e4ba803-3a4d-4d7f-91db-134967636cbb';

  -- Fixture 1 (cycle_x) — chemin heureux + idempotence malgré contexte
  -- devenu stale + conflit (deuxième brouillon après publication).
  v_etat_x      uuid;
  v_cycle_x     uuid;
  v_analyse_x1  uuid;
  v_analyse_x2  uuid;
  v_hp_x1       uuid;
  v_curation_x1 uuid;
  v_redaction_x1 uuid;
  v_version_x1   uuid;
  v_version_x2   uuid;

  -- Fixture 2 (cycle_y) — cycle nu, utilisé uniquement pour tester
  -- l'incohérence version/cycle.
  v_etat_y  uuid;
  v_cycle_y uuid;

  -- Fixture 3 (cycle_w) — validation refusée (analyse retenue changée
  -- AVANT la première tentative de validation).
  v_etat_w      uuid;
  v_cycle_w     uuid;
  v_analyse_w1  uuid;
  v_analyse_w2  uuid;
  v_hp_w1       uuid;
  v_curation_w1 uuid;
  v_redaction_w1 uuid;
  v_version_w1   uuid;

  -- Fixture 4 (cycle_v) — validation refusée (curation devenue non
  -- officielle AVANT la première tentative de validation).
  v_etat_v      uuid;
  v_cycle_v     uuid;
  v_analyse_v   uuid;
  v_hp_v1       uuid;
  v_curation_v1 uuid;
  v_curation_v2 uuid;
  v_redaction_v1 uuid;
  v_version_v1   uuid;

  -- Fixture 5 (cycle_p) — version validée, PUIS contexte devenu stale
  -- AVANT la toute première tentative de publication (jamais encore
  -- publiée) — distinct du cas T10/T11 où la publication/validation
  -- est déjà un fait acquis.
  v_etat_p      uuid;
  v_cycle_p     uuid;
  v_analyse_p1  uuid;
  v_analyse_p2  uuid;
  v_hp_p1       uuid;
  v_curation_p1 uuid;
  v_redaction_p1 uuid;
  v_version_p1   uuid;

  -- Fixture 6 (cycle_q) — version jamais validée.
  v_etat_q      uuid;
  v_cycle_q     uuid;
  v_analyse_q   uuid;
  v_hp_q1       uuid;
  v_curation_q1 uuid;
  v_redaction_q1 uuid;
  v_version_q1   uuid;

  -- Fixture 7 (cycle_r) — non-régression mfr_finir_redaction_succes
  -- après révocation service_role (027, section 3).
  v_etat_r      uuid;
  v_cycle_r     uuid;
  v_analyse_r   uuid;
  v_hp_r1       uuid;
  v_curation_r1 uuid;
  v_redaction_r1 uuid;

  v_resultat         jsonb;
  v_resultat_retenir  jsonb;
  v_resultat_curation jsonb;
  v_resultat_redaction jsonb;
  v_valide_le_t3      timestamptz;
  v_publication_id_t7 uuid;
  v_nb_versions       integer;
  v_nb_publications   integer;
  FAKE_OPERATEUR constant uuid := '00000000-0000-4000-8000-000000000001';
begin
  -- ════════════════════════════════════════════════════════════
  -- FIXTURE 1 — cycle_x : analyse A retenue, curation 1, rédaction 1 → version 1
  -- ════════════════════════════════════════════════════════════
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999401, 'fixture-027-test') returning id into v_etat_x;
  insert into public.mfr_cycles (user_id, etat_logique_id) values (v_user_id, v_etat_x) returning id into v_cycle_x;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_x, v_user_id, v_etat_x, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now()) returning id into v_analyse_x1;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_x1, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP X1') returning id into v_hp_x1;
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_x1, v_hp_x1, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', true);

  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_x, v_analyse_x1);
  if v_resultat_retenir->>'success' <> 'true' then raise exception 'FIXTURE FAIL (x): retenir A1 — %', v_resultat_retenir; end if;

  v_resultat_curation := public.mfr_creer_curation(v_cycle_x, v_analyse_x1, array[v_hp_x1], true);
  if v_resultat_curation->>'success' <> 'true' then raise exception 'FIXTURE FAIL (x): creer curation 1 — %', v_resultat_curation; end if;
  v_curation_x1 := (v_resultat_curation->>'curation_id')::uuid;

  v_resultat_redaction := public.mfr_demarrer_redaction(v_cycle_x, v_analyse_x1, v_curation_x1, 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat_redaction->>'success' <> 'true' then raise exception 'FIXTURE FAIL (x): demarrer redaction 1 — %', v_resultat_redaction; end if;
  v_redaction_x1 := (v_resultat_redaction->>'redaction_id')::uuid;

  v_resultat := public.mfr_finir_redaction_succes(v_redaction_x1, '{"audit":true}'::jsonb, '{"contenuVersion":1,"directions":[]}'::jsonb);
  if v_resultat->>'success' <> 'true' then raise exception 'FIXTURE FAIL (x): finir redaction succes 1 — %', v_resultat; end if;
  v_version_x1 := (v_resultat->>'version_id')::uuid;

  -- Fixture 2 — cycle nu, pour tester l'incohérence version/cycle.
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999402, 'fixture-027-test') returning id into v_etat_y;
  insert into public.mfr_cycles (user_id, etat_logique_id) values (v_user_id, v_etat_y) returning id into v_cycle_y;

  -- ════════════════════════════════════════════════════════════
  -- TESTS — cycle_x
  -- ════════════════════════════════════════════════════════════

  -- T1. Validation : version appartenant à un AUTRE cycle → rejet inconditionnel.
  v_resultat := public.mfr_valider_version(v_version_x1, v_cycle_y, v_user_id);
  if v_resultat->>'error' <> 'version_introuvable_pour_ce_cycle' then
    raise exception 'T1 FAIL: incohérence version/cycle (validation) pas détectée — %', v_resultat;
  end if;
  raise notice 'T1 PASS: validation refusée — version d''un autre cycle';

  -- T2. Validation : opérateur inexistant, contexte par ailleurs valide.
  v_resultat := public.mfr_valider_version(v_version_x1, v_cycle_x, FAKE_OPERATEUR);
  if v_resultat->>'error' <> 'operateur_introuvable' then
    raise exception 'T2 FAIL: opérateur inexistant pas détecté — %', v_resultat;
  end if;
  raise notice 'T2 PASS: validation refusée — opérateur inexistant';

  -- T3. Validation réelle, contexte frais → succès.
  v_resultat := public.mfr_valider_version(v_version_x1, v_cycle_x, v_user_id);
  if v_resultat->>'success' <> 'true' or v_resultat->>'already_valide' <> 'false' then
    raise exception 'T3 FAIL: validation initiale refusée — %', v_resultat;
  end if;
  v_valide_le_t3 := (v_resultat->>'valide_le')::timestamptz;
  raise notice 'T3 PASS: validation initiale acceptée';

  -- T4. Double validation (même opérateur) → idempotent, AUCUNE mutation
  -- (même valide_le qu'à T3, pas une nouvelle valeur).
  v_resultat := public.mfr_valider_version(v_version_x1, v_cycle_x, v_user_id);
  if v_resultat->>'already_valide' <> 'true' or (v_resultat->>'valide_le')::timestamptz <> v_valide_le_t3 then
    raise exception 'T4 FAIL: double validation pas idempotente — %', v_resultat;
  end if;
  raise notice 'T4 PASS: double validation idempotente, valide_le inchangé';

  -- T5. Publication : version d'un AUTRE cycle → rejet inconditionnel.
  v_resultat := public.mfr_publier_version(v_version_x1, v_cycle_y, v_user_id);
  if v_resultat->>'error' <> 'version_introuvable_pour_ce_cycle' then
    raise exception 'T5 FAIL: incohérence version/cycle (publication) pas détectée — %', v_resultat;
  end if;
  raise notice 'T5 PASS: publication refusée — version d''un autre cycle';

  -- T6. Publication : opérateur inexistant, version déjà validée fraîche.
  v_resultat := public.mfr_publier_version(v_version_x1, v_cycle_x, FAKE_OPERATEUR);
  if v_resultat->>'error' <> 'operateur_introuvable' then
    raise exception 'T6 FAIL: opérateur inexistant (publication) pas détecté — %', v_resultat;
  end if;
  raise notice 'T6 PASS: publication refusée — opérateur inexistant';

  -- T7. Publication réelle, contexte frais → succès.
  v_resultat := public.mfr_publier_version(v_version_x1, v_cycle_x, v_user_id);
  if v_resultat->>'success' <> 'true' or v_resultat->>'already_publiee' <> 'false' then
    raise exception 'T7 FAIL: publication initiale refusée — %', v_resultat;
  end if;
  v_publication_id_t7 := (v_resultat->>'publication_id')::uuid;
  raise notice 'T7 PASS: publication initiale acceptée';

  -- T8. Double publication (même opérateur) → idempotent, AUCUNE seconde ligne.
  select count(*) into v_nb_publications from public.mfr_publications where cycle_id = v_cycle_x;
  if v_nb_publications <> 1 then raise exception 'T8 FAIL: plus d''une publication avant le second appel — %', v_nb_publications; end if;
  v_resultat := public.mfr_publier_version(v_version_x1, v_cycle_x, v_user_id);
  if v_resultat->>'already_publiee' <> 'true' or (v_resultat->>'publication_id')::uuid <> v_publication_id_t7 then
    raise exception 'T8 FAIL: double publication pas idempotente — %', v_resultat;
  end if;
  select count(*) into v_nb_publications from public.mfr_publications where cycle_id = v_cycle_x;
  if v_nb_publications <> 1 then raise exception 'T8 FAIL: une seconde ligne a été insérée — %', v_nb_publications; end if;
  raise notice 'T8 PASS: double publication idempotente, zéro seconde ligne';

  -- T9. Revalidation après publication (déjà validée ET publiée) → idempotent.
  v_resultat := public.mfr_valider_version(v_version_x1, v_cycle_x, v_user_id);
  if v_resultat->>'already_valide' <> 'true' or (v_resultat->>'valide_le')::timestamptz <> v_valide_le_t3 then
    raise exception 'T9 FAIL: revalidation après publication pas idempotente — %', v_resultat;
  end if;
  raise notice 'T9 PASS: revalidation après publication idempotente';

  -- ── Injection de contexte stale sur cycle_x, APRÈS publication ──
  -- `mfr_retenir_analyse` (023) refuse déjà `cycle_publie` une fois le
  -- cycle publié (vérifié) — l'état « analyse retenue change après
  -- publication » est donc STRUCTURELLEMENT IMPOSSIBLE via la RPC
  -- réelle, garantie déjà assurée par 023/024, indépendante de 027.
  -- Ce test vise une protection EN PROFONDEUR de 027 lui-même (si cette
  -- garantie amont venait un jour à changer) — on fabrique donc l'état
  -- par UPDATE brut, délibérément hors RPC, uniquement pour exercer le
  -- court-circuit terminal de mfr_valider_version/mfr_publier_version,
  -- jamais pour prétendre que ce chemin est atteignable aujourd'hui en
  -- usage normal.
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_x, v_user_id, v_etat_x, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now()) returning id into v_analyse_x2;
  update public.mfr_cycles set analyse_retenue_id = v_analyse_x2 where id = v_cycle_x;

  -- T10. Revalidation (déjà validée) APRÈS que le contexte soit devenu stale
  -- → DOIT RESTER idempotente — un fait déjà acquis n'est jamais rejugé.
  v_resultat := public.mfr_valider_version(v_version_x1, v_cycle_x, v_user_id);
  if v_resultat->>'already_valide' <> 'true' or (v_resultat->>'valide_le')::timestamptz <> v_valide_le_t3 then
    raise exception 'T10 FAIL: revalidation après contexte stale aurait dû rester idempotente — %', v_resultat;
  end if;
  raise notice 'T10 PASS: revalidation idempotente malgré contexte devenu stale (fait acquis jamais rejugé)';

  -- T11. Republication (déjà publiée) APRÈS que le contexte soit devenu stale
  -- → DOIT RESTER idempotente — la publication est un fait historique définitif.
  v_resultat := public.mfr_publier_version(v_version_x1, v_cycle_x, v_user_id);
  if v_resultat->>'already_publiee' <> 'true' or (v_resultat->>'publication_id')::uuid <> v_publication_id_t7 then
    raise exception 'T11 FAIL: republication après contexte stale aurait dû rester idempotente — %', v_resultat;
  end if;
  raise notice 'T11 PASS: republication idempotente malgré contexte devenu stale (publication jamais rejugée)';

  -- T12. Fixture : fabrication directe d'un DEUXIÈME brouillon pour cycle_x
  -- (aucune RPC ne permet d'en créer un après SUCCES — nécessaire
  -- uniquement pour exercer T13/T14 ci-dessous).
  select coalesce(max(numero_version),0)+1 into v_nb_versions from public.mfr_versions where cycle_id = v_cycle_x;
  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_x, v_redaction_x1, v_user_id, v_nb_versions, '{"contenuVersion":1,"directions":[],"fixture":"second-draft"}'::jsonb)
  returning id into v_version_x2;

  -- T13. Validation d'un second brouillon alors que le cycle est DÉJÀ publié
  -- (avec une autre version) → conflit, jamais idempotent.
  v_resultat := public.mfr_valider_version(v_version_x2, v_cycle_x, v_user_id);
  if v_resultat->>'error' <> 'cycle_deja_publie' then
    raise exception 'T13 FAIL: validation d''un second brouillon sur cycle déjà publié pas refusée — %', v_resultat;
  end if;
  raise notice 'T13 PASS: validation refusée — cycle déjà publié (autre version)';

  -- T14. Publication d'un second brouillon (même non validé) sur un cycle déjà
  -- publié avec une AUTRE version → conflit détecté AVANT même le contrôle de
  -- validation (ordre exact : terminal/conflit publications précède
  -- version_non_validee).
  v_resultat := public.mfr_publier_version(v_version_x2, v_cycle_x, v_user_id);
  if v_resultat->>'error' <> 'cycle_deja_publie_autre_version' then
    raise exception 'T14 FAIL: publication d''un second brouillon sur cycle déjà publié pas refusée — %', v_resultat;
  end if;
  raise notice 'T14 PASS: publication refusée — cycle_deja_publie_autre_version (précède version_non_validee)';

  -- ════════════════════════════════════════════════════════════
  -- FIXTURE 3 — cycle_w : validation refusée par analyse retenue changée
  -- AVANT la toute première tentative de validation (jamais encore validée).
  -- ════════════════════════════════════════════════════════════
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999403, 'fixture-027-test') returning id into v_etat_w;
  insert into public.mfr_cycles (user_id, etat_logique_id) values (v_user_id, v_etat_w) returning id into v_cycle_w;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_w, v_user_id, v_etat_w, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now()) returning id into v_analyse_w1;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_w1, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP W1') returning id into v_hp_w1;
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_w1, v_hp_w1, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', true);
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_w, v_analyse_w1);
  if v_resultat_retenir->>'success' <> 'true' then raise exception 'FIXTURE FAIL (w): retenir A1 — %', v_resultat_retenir; end if;
  v_resultat_curation := public.mfr_creer_curation(v_cycle_w, v_analyse_w1, array[v_hp_w1], true);
  if v_resultat_curation->>'success' <> 'true' then raise exception 'FIXTURE FAIL (w): creer curation — %', v_resultat_curation; end if;
  v_curation_w1 := (v_resultat_curation->>'curation_id')::uuid;
  v_resultat_redaction := public.mfr_demarrer_redaction(v_cycle_w, v_analyse_w1, v_curation_w1, 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat_redaction->>'success' <> 'true' then raise exception 'FIXTURE FAIL (w): demarrer redaction — %', v_resultat_redaction; end if;
  v_redaction_w1 := (v_resultat_redaction->>'redaction_id')::uuid;
  v_resultat := public.mfr_finir_redaction_succes(v_redaction_w1, '{"audit":true}'::jsonb, '{"contenuVersion":1,"directions":[]}'::jsonb);
  if v_resultat->>'success' <> 'true' then raise exception 'FIXTURE FAIL (w): finir redaction succes — %', v_resultat; end if;
  v_version_w1 := (v_resultat->>'version_id')::uuid;

  -- Analyse retenue change AVANT toute tentative de validation.
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_w, v_user_id, v_etat_w, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now()) returning id into v_analyse_w2;
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_w, v_analyse_w2);
  if v_resultat_retenir->>'success' <> 'true' then raise exception 'FIXTURE FAIL (w): retenir A2 — %', v_resultat_retenir; end if;

  -- T15. Première validation réelle avec contexte déjà stale → refus
  -- (distinct de T10 : ici c'est un acte réellement NOUVEAU, jamais
  -- encore validé — la fraîcheur doit bloquer).
  v_resultat := public.mfr_valider_version(v_version_w1, v_cycle_w, v_user_id);
  if v_resultat->>'error' <> 'analyse_retenue_a_change' then
    raise exception 'T15 FAIL: validation nouvelle avec analyse stale pas refusée — %', v_resultat;
  end if;
  raise notice 'T15 PASS: première validation refusée — analyse retenue a changé';

  -- ════════════════════════════════════════════════════════════
  -- FIXTURE 4 — cycle_v : validation refusée par curation devenue non
  -- officielle AVANT la toute première tentative de validation.
  -- ════════════════════════════════════════════════════════════
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999404, 'fixture-027-test') returning id into v_etat_v;
  insert into public.mfr_cycles (user_id, etat_logique_id) values (v_user_id, v_etat_v) returning id into v_cycle_v;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_v, v_user_id, v_etat_v, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now()) returning id into v_analyse_v;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_v, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP V1') returning id into v_hp_v1;
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_v, v_hp_v1, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', true);
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_v, v_analyse_v);
  if v_resultat_retenir->>'success' <> 'true' then raise exception 'FIXTURE FAIL (v): retenir analyse — %', v_resultat_retenir; end if;
  v_resultat_curation := public.mfr_creer_curation(v_cycle_v, v_analyse_v, array[v_hp_v1], true);
  if v_resultat_curation->>'success' <> 'true' then raise exception 'FIXTURE FAIL (v): creer curation 1 — %', v_resultat_curation; end if;
  v_curation_v1 := (v_resultat_curation->>'curation_id')::uuid;
  v_resultat_redaction := public.mfr_demarrer_redaction(v_cycle_v, v_analyse_v, v_curation_v1, 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat_redaction->>'success' <> 'true' then raise exception 'FIXTURE FAIL (v): demarrer redaction — %', v_resultat_redaction; end if;
  v_redaction_v1 := (v_resultat_redaction->>'redaction_id')::uuid;
  v_resultat := public.mfr_finir_redaction_succes(v_redaction_v1, '{"audit":true}'::jsonb, '{"contenuVersion":1,"directions":[]}'::jsonb);
  if v_resultat->>'success' <> 'true' then raise exception 'FIXTURE FAIL (v): finir redaction succes — %', v_resultat; end if;
  v_version_v1 := (v_resultat->>'version_id')::uuid;

  -- Nouvelle curation (même analyse) AVANT toute tentative de validation —
  -- curation_v1 devient non officielle (append-only, dernière gagne).
  v_resultat_curation := public.mfr_creer_curation(v_cycle_v, v_analyse_v, array[v_hp_v1], true);
  if v_resultat_curation->>'success' <> 'true' then raise exception 'FIXTURE FAIL (v): creer curation 2 — %', v_resultat_curation; end if;
  v_curation_v2 := (v_resultat_curation->>'curation_id')::uuid;
  if v_curation_v2 = v_curation_v1 then raise exception 'FIXTURE FAIL (v): curation 2 devrait être distincte'; end if;

  -- T16. Première validation réelle, curation devenue non officielle → refus.
  v_resultat := public.mfr_valider_version(v_version_v1, v_cycle_v, v_user_id);
  if v_resultat->>'error' <> 'curation_non_officielle' then
    raise exception 'T16 FAIL: validation nouvelle avec curation non officielle pas refusée — %', v_resultat;
  end if;
  raise notice 'T16 PASS: première validation refusée — curation non officielle';

  -- ════════════════════════════════════════════════════════════
  -- FIXTURE 5 — cycle_p : version validée AVANT la staleness, puis
  -- contexte devenu stale AVANT la toute première publication (jamais
  -- encore publiée) — distinct de T11 (publication déjà faite).
  -- ════════════════════════════════════════════════════════════
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999405, 'fixture-027-test') returning id into v_etat_p;
  insert into public.mfr_cycles (user_id, etat_logique_id) values (v_user_id, v_etat_p) returning id into v_cycle_p;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_p, v_user_id, v_etat_p, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now()) returning id into v_analyse_p1;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_p1, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP P1') returning id into v_hp_p1;
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_p1, v_hp_p1, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', true);
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_p, v_analyse_p1);
  if v_resultat_retenir->>'success' <> 'true' then raise exception 'FIXTURE FAIL (p): retenir A1 — %', v_resultat_retenir; end if;
  v_resultat_curation := public.mfr_creer_curation(v_cycle_p, v_analyse_p1, array[v_hp_p1], true);
  if v_resultat_curation->>'success' <> 'true' then raise exception 'FIXTURE FAIL (p): creer curation — %', v_resultat_curation; end if;
  v_curation_p1 := (v_resultat_curation->>'curation_id')::uuid;
  v_resultat_redaction := public.mfr_demarrer_redaction(v_cycle_p, v_analyse_p1, v_curation_p1, 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat_redaction->>'success' <> 'true' then raise exception 'FIXTURE FAIL (p): demarrer redaction — %', v_resultat_redaction; end if;
  v_redaction_p1 := (v_resultat_redaction->>'redaction_id')::uuid;
  v_resultat := public.mfr_finir_redaction_succes(v_redaction_p1, '{"audit":true}'::jsonb, '{"contenuVersion":1,"directions":[]}'::jsonb);
  if v_resultat->>'success' <> 'true' then raise exception 'FIXTURE FAIL (p): finir redaction succes — %', v_resultat; end if;
  v_version_p1 := (v_resultat->>'version_id')::uuid;

  v_resultat := public.mfr_valider_version(v_version_p1, v_cycle_p, v_user_id);
  if v_resultat->>'success' <> 'true' then raise exception 'FIXTURE FAIL (p): validation initiale — %', v_resultat; end if;

  -- Analyse retenue change APRÈS validation, AVANT toute publication.
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_p, v_user_id, v_etat_p, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now()) returning id into v_analyse_p2;
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_p, v_analyse_p2);
  if v_resultat_retenir->>'success' <> 'true' then raise exception 'FIXTURE FAIL (p): retenir A2 — %', v_resultat_retenir; end if;

  -- T17. Première publication réelle, version déjà validée mais contexte
  -- devenu stale ENTRE validation et publication → refus (distinct de
  -- T11 : ici la publication n'a JAMAIS encore eu lieu).
  v_resultat := public.mfr_publier_version(v_version_p1, v_cycle_p, v_user_id);
  if v_resultat->>'error' <> 'analyse_retenue_a_change' then
    raise exception 'T17 FAIL: première publication avec contexte stale pas refusée — %', v_resultat;
  end if;
  raise notice 'T17 PASS: première publication refusée — analyse retenue changée entre validation et publication';

  -- ════════════════════════════════════════════════════════════
  -- FIXTURE 6 — cycle_q : version jamais validée.
  -- ════════════════════════════════════════════════════════════
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999406, 'fixture-027-test') returning id into v_etat_q;
  insert into public.mfr_cycles (user_id, etat_logique_id) values (v_user_id, v_etat_q) returning id into v_cycle_q;
  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_q, v_user_id, v_etat_q, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now()) returning id into v_analyse_q;
  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_q, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP Q1') returning id into v_hp_q1;
  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_q, v_hp_q1, v_user_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', true);
  v_resultat_retenir := public.mfr_retenir_analyse(v_cycle_q, v_analyse_q);
  if v_resultat_retenir->>'success' <> 'true' then raise exception 'FIXTURE FAIL (q): retenir analyse — %', v_resultat_retenir; end if;
  v_resultat_curation := public.mfr_creer_curation(v_cycle_q, v_analyse_q, array[v_hp_q1], true);
  if v_resultat_curation->>'success' <> 'true' then raise exception 'FIXTURE FAIL (q): creer curation — %', v_resultat_curation; end if;
  v_curation_q1 := (v_resultat_curation->>'curation_id')::uuid;
  v_resultat_redaction := public.mfr_demarrer_redaction(v_cycle_q, v_analyse_q, v_curation_q1, 'openai', 'gpt-6.1-sol', 'v2', '2');
  if v_resultat_redaction->>'success' <> 'true' then raise exception 'FIXTURE FAIL (q): demarrer redaction — %', v_resultat_redaction; end if;
  v_redaction_q1 := (v_resultat_redaction->>'redaction_id')::uuid;
  v_resultat := public.mfr_finir_redaction_succes(v_redaction_q1, '{"audit":true}'::jsonb, '{"contenuVersion":1,"directions":[]}'::jsonb);
  if v_resultat->>'success' <> 'true' then raise exception 'FIXTURE FAIL (q): finir redaction succes — %', v_resultat; end if;
  v_version_q1 := (v_resultat->>'version_id')::uuid;

  -- T18. Publication d'un brouillon jamais validé → refus.
  v_resultat := public.mfr_publier_version(v_version_q1, v_cycle_q, v_user_id);
  if v_resultat->>'error' <> 'version_non_validee' then
    raise exception 'T18 FAIL: publication d''un brouillon non validé pas refusée — %', v_resultat;
  end if;
  raise notice 'T18 PASS: publication refusée — version non validée';

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

  -- T20. Aucun impact sur le cycle/rédaction/versions RÉELS de production.
  if (select analyse_retenue_id from public.mfr_cycles where id = '67310029-a367-4816-95f7-35d0ae4d359c') <> 'b61a8f43-d4e4-48e0-8976-64f8ef9146b2' then
    raise exception 'T20 FAIL: le cycle réel de production a été altéré';
  end if;
  if (select statut from public.mfr_redactions where id = '8e94d5f0-dda5-402f-bd06-a1df97723b8b') <> 'ECHEC' then
    raise exception 'T20 FAIL: la rédaction réelle ECHEC#1 a été altérée';
  end if;
  if not exists (select 1 from public.mfr_versions where id = 'd9dde670-2533-4d18-94ee-dfe73df2b271' and valide_le is null) then
    raise exception 'T20 FAIL: la version réelle d9dde670 a été validée/modifiée par ce test';
  end if;
  if (select count(*) from public.mfr_publications where cycle_id = '67310029-a367-4816-95f7-35d0ae4d359c') <> 0 then
    raise exception 'T20 FAIL: une publication est apparue sur le cycle réel de production';
  end if;
  raise notice 'T20 PASS: cycle/rédaction/version réels de production non touchés';

  raise notice '=== TOUS LES TESTS SQL ONT PASSÉ (ces fixtures seront annulées par ROLLBACK) ===';
end $$;

rollback;
