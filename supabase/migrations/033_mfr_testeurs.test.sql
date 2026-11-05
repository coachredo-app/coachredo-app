-- ============================================================
-- Tests SQL isolés/réversibles — mfr_testeurs_evenements (gestion des testeurs MFR)
-- ============================================================
-- RÉELLEMENT EXÉCUTÉS (revue QG APP 2026-11-05) contre une base
-- PostgreSQL JETABLE et locale (jamais Supabase, jamais Production) —
-- voir `supabase/migrations/run-local-test-033.sh`. 9/9 assertions
-- PASS (T1-T9). Peut être rejoué par Coach Redouane de la même façon,
-- ou en `BEGIN...ROLLBACK` contre un projet Supabase réel, APRÈS
-- application de 033 (ce fichier teste les fonctions que 033
-- elle-même définit) — jamais avant, les fonctions testées doivent
-- exister. Autonome : ne dépend d'aucune fixture MFR (cycle/analyse/
-- redaction/version) — ces deux RPC n'exigent qu'un `user_id` réel
-- dans `auth.users` (FK), rien de plus.
-- Les scénarios croisant cette table avec `mfr_lire_version_publiee`
-- (gate de lecture, réautorisation, propriété croisée) sont désormais
-- RÉELLEMENT EXÉCUTÉS, pour leur part, dans
-- `supabase/migrations_candidates/test_integration_testeurs_lecture.sql`
-- (8 scénarios QG, via `run_test_integration.sh`) — ce fichier ne les
-- duplique pas. La concurrence réelle (deux connexions distinctes) est
-- couverte séparément par
-- `supabase/migrations_candidates/test_concurrence_testeurs.sh`.
--
-- Méthode identique au reste de la session : un seul `BEGIN...ROLLBACK`,
-- fixtures et appels RPC dans la même transaction, jamais commités.
-- Compte test réel déjà utilisé tout au long de cette session
-- (`dd539d5c-5103-45b1-8e7e-579bff5b2f10`) pour satisfaire la FK
-- `auth.users` — aucune donnée réelle modifiée (RPC jamais commitées).

begin;

do $$
declare
  v_user_id      uuid := 'dd539d5c-5103-45b1-8e7e-579bff5b2f10'; -- compte test réel
  v_inexistant   uuid := '44444444-4444-4444-4444-444444444444'; -- jamais dans auth.users
  v_resultat     json;
  v_id_1         bigint;
  v_id_2         bigint;
  v_nb_lignes    int;
  v_dernier      text;
begin
  -- ── T1 — paramètres manquants rejetés avant toute écriture ───
  v_resultat := public.mfr_autoriser_testeur(null, v_user_id, null);
  if v_resultat->>'error' <> 'identifiant_invalide' then
    raise exception 'T1a ÉCHEC : p_user_id null, obtenu %', v_resultat;
  end if;
  v_resultat := public.mfr_autoriser_testeur(v_user_id, null, null);
  if v_resultat->>'error' <> 'identifiant_invalide' then
    raise exception 'T1b ÉCHEC : p_operateur_id null, obtenu %', v_resultat;
  end if;
  v_resultat := public.mfr_retirer_testeur(null, v_user_id, null);
  if v_resultat->>'error' <> 'identifiant_invalide' then
    raise exception 'T1c ÉCHEC : retrait p_user_id null, obtenu %', v_resultat;
  end if;
  if (select count(*) from public.mfr_testeurs_evenements) <> 0 then
    raise exception 'T1 ÉCHEC : aucune ligne ne devait avoir été insérée par ces appels invalides';
  end if;
  raise notice 'T1 PASS — paramètres manquants rejetés, zéro insertion';

  -- ── T2 — utilisateur cible inexistant rejeté ─────────────────
  v_resultat := public.mfr_autoriser_testeur(v_inexistant, v_user_id, null);
  if v_resultat->>'error' <> 'utilisateur_introuvable' then
    raise exception 'T2a ÉCHEC : utilisateur cible inexistant (autoriser), obtenu %', v_resultat;
  end if;
  v_resultat := public.mfr_retirer_testeur(v_inexistant, v_user_id, null);
  if v_resultat->>'error' <> 'utilisateur_introuvable' then
    raise exception 'T2b ÉCHEC : utilisateur cible inexistant (retirer), obtenu %', v_resultat;
  end if;
  raise notice 'T2 PASS — utilisateur cible inexistant rejeté proprement (autoriser ET retirer)';

  -- ── T3 — autorisation réelle : succès, un événement, append-only ──
  v_resultat := public.mfr_autoriser_testeur(v_user_id, v_user_id, 'fixture T3');
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'T3a ÉCHEC : autorisation, obtenu %', v_resultat;
  end if;
  v_id_1 := (v_resultat->>'evenementId')::bigint;
  if v_id_1 is null then
    raise exception 'T3b ÉCHEC : evenementId absent du retour';
  end if;
  select count(*) into v_nb_lignes from public.mfr_testeurs_evenements where user_id = v_user_id;
  if v_nb_lignes <> 1 then
    raise exception 'T3c ÉCHEC : attendu exactement 1 ligne après une autorisation, obtenu %', v_nb_lignes;
  end if;
  raise notice 'T3 PASS — autorisation insère exactement un événement, id retourné fidèlement';

  -- ── T4 — retrait réel : nouvel événement, jamais une mutation ────
  v_resultat := public.mfr_retirer_testeur(v_user_id, v_user_id, 'fixture T4');
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'T4a ÉCHEC : retrait, obtenu %', v_resultat;
  end if;
  v_id_2 := (v_resultat->>'evenementId')::bigint;
  if v_id_2 <= v_id_1 then
    raise exception 'T4b ÉCHEC : id du retrait (%) doit être strictement supérieur à celui de l''autorisation (%)', v_id_2, v_id_1;
  end if;
  select count(*) into v_nb_lignes from public.mfr_testeurs_evenements where user_id = v_user_id;
  if v_nb_lignes <> 2 then
    raise exception 'T4c ÉCHEC : attendu exactement 2 lignes après autorisation+retrait (append-only, jamais une mutation en place), obtenu %', v_nb_lignes;
  end if;
  select action into v_dernier from public.mfr_testeurs_evenements where user_id = v_user_id order by id desc limit 1;
  if v_dernier <> 'RETIRE' then
    raise exception 'T4d ÉCHEC : dernier événement attendu RETIRE, obtenu %', v_dernier;
  end if;
  raise notice 'T4 PASS — retrait ajoute un nouvel événement (jamais un UPDATE/DELETE), historique complet conservé';

  -- ── T5 — autorisation répétée (déjà autorisé) : permissif, sans effet nocif ──
  v_resultat := public.mfr_autoriser_testeur(v_user_id, v_user_id, null);
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'T5a ÉCHEC : réautorisation, obtenu %', v_resultat;
  end if;
  v_resultat := public.mfr_autoriser_testeur(v_user_id, v_user_id, null);
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'T5b ÉCHEC : seconde autorisation consécutive, obtenu %', v_resultat;
  end if;
  select count(*) into v_nb_lignes from public.mfr_testeurs_evenements where user_id = v_user_id;
  if v_nb_lignes <> 4 then
    raise exception 'T5c ÉCHEC : attendu 4 lignes au total (autoriser, retirer, autoriser, autoriser), obtenu %', v_nb_lignes;
  end if;
  raise notice 'T5 PASS — autoriser un testeur déjà autorisé reste sans effet nocif (statut courant inchangé : AUTORISE)';

  -- ── T6 — champ `commentaire` optionnel, transmis fidèlement quand fourni ──
  select commentaire into v_dernier from public.mfr_testeurs_evenements where user_id = v_user_id and action = 'AUTORISE' order by id asc limit 1;
  if v_dernier <> 'fixture T3' then
    raise exception 'T6 ÉCHEC : commentaire du premier événement non transmis fidèlement, obtenu %', v_dernier;
  end if;
  raise notice 'T6 PASS — commentaire transmis fidèlement, traçabilité complète par événement';

  raise notice '6/6 assertions fonctionnelles PASS.';
end $$;

-- ── T9 — pg_advisory_xact_lock réellement présent dans le code exécutable ──
-- Inspection statique du corps RÉELLEMENT exécutable (pg_get_functiondef,
-- jamais le fichier source relu comme du texte) — garantit que le
-- mécanisme de sérialisation (revue QG APP 2026-11-05) est bien câblé
-- dans les deux fonctions. Ne prouve pas, à lui seul, le comportement
-- sous charge concurrente réelle — cette preuve dynamique est apportée
-- séparément par `migrations_candidates/test_concurrence_testeurs.sh`
-- (deux connexions réelles, exécuté avec succès dans cette même revue).
do $$
declare
  v_corps_autoriser text;
  v_corps_retirer   text;
begin
  v_corps_autoriser := pg_get_functiondef('public.mfr_autoriser_testeur(uuid, uuid, text)'::regprocedure);
  v_corps_retirer   := pg_get_functiondef('public.mfr_retirer_testeur(uuid, uuid, text)'::regprocedure);

  if v_corps_autoriser not ilike '%pg_advisory_xact_lock%' then
    raise exception 'T9 ÉCHEC : mfr_autoriser_testeur ne contient aucun appel à pg_advisory_xact_lock';
  end if;
  if v_corps_retirer not ilike '%pg_advisory_xact_lock%' then
    raise exception 'T9 ÉCHEC : mfr_retirer_testeur ne contient aucun appel à pg_advisory_xact_lock';
  end if;
  raise notice 'T9 PASS — pg_advisory_xact_lock présent dans le code exécutable des deux fonctions';
end $$;

-- ── Privilèges EXECUTE par rôle (statique) ───────────────────────
do $$
declare
  v_anon          boolean;
  v_authenticated boolean;
  v_service_role  boolean;
  v_public        boolean;
begin
  v_anon          := has_function_privilege('anon', 'public.mfr_autoriser_testeur(uuid, uuid, text)', 'EXECUTE');
  v_authenticated := has_function_privilege('authenticated', 'public.mfr_autoriser_testeur(uuid, uuid, text)', 'EXECUTE');
  v_service_role  := has_function_privilege('service_role', 'public.mfr_autoriser_testeur(uuid, uuid, text)', 'EXECUTE');
  v_public        := has_function_privilege('public', 'public.mfr_autoriser_testeur(uuid, uuid, text)', 'EXECUTE');
  if v_anon is not false or v_authenticated is not false or v_public is not false or v_service_role is not true then
    raise exception 'T7a ÉCHEC : mfr_autoriser_testeur doit être EXECUTE=service_role uniquement — anon=%, authenticated=%, service_role=%, public=%', v_anon, v_authenticated, v_service_role, v_public;
  end if;

  v_anon          := has_function_privilege('anon', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');
  v_authenticated := has_function_privilege('authenticated', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');
  v_service_role  := has_function_privilege('service_role', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');
  v_public        := has_function_privilege('public', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');
  if v_anon is not false or v_authenticated is not false or v_public is not false or v_service_role is not true then
    raise exception 'T7b ÉCHEC : mfr_retirer_testeur doit être EXECUTE=service_role uniquement — anon=%, authenticated=%, service_role=%, public=%', v_anon, v_authenticated, v_service_role, v_public;
  end if;

  raise notice 'T7 PASS — les deux RPC réservées service_role exclusivement, jamais authenticated/anon/public';
end $$;

-- ── Aucun accès direct à la table pour les utilisateurs ordinaires ──
do $$
declare
  v_anon          boolean;
  v_authenticated boolean;
begin
  v_anon          := has_table_privilege('anon', 'public.mfr_testeurs_evenements', 'SELECT');
  v_authenticated := has_table_privilege('authenticated', 'public.mfr_testeurs_evenements', 'SELECT');
  if v_anon is not false or v_authenticated is not false then
    raise exception 'T8 ÉCHEC : aucun privilège direct sur la table ne doit être accordé à anon/authenticated — anon=%, authenticated=%', v_anon, v_authenticated;
  end if;
  raise notice 'T8 PASS — zéro accès direct à mfr_testeurs_evenements pour un utilisateur ordinaire';
end $$;

rollback;
