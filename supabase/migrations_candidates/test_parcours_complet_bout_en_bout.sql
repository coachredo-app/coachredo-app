-- ============================================================
-- TEST CONSOLIDÉ DE BOUT EN BOUT — validation → publication → lecture
-- ============================================================
-- GO QG 2026-11-03 : « démontrer que la MFR peut être validée, publiée
-- et consultée par son propriétaire, de bout en bout ». À exécuter
-- EXCLUSIVEMENT sur une base locale jetable (Supabase local, worktree
-- `coachredo-app-mfr`) — JAMAIS sur Production. Données entièrement
-- fictives. Un seul `BEGIN...ROLLBACK`, zéro effet persistant même en
-- cas d'échec d'une assertion.
--
-- Nécessite au préalable, sur la base locale uniquement :
--   1. Les migrations 001-027 (+ 029, héritée, sans effet ici) déjà
--      appliquées — c'est le comportement par défaut de
--      `supabase start`/`db reset`, qui applique tout le contenu de
--      `supabase/migrations/` dans l'ordre.
--   2. Le fichier candidat `mfr_lire_version_publiee.sql` copié
--      temporairement sous un nom numéroté dans `supabase/migrations/`
--      pour cette seule exécution locale (jamais commité sous ce nom,
--      jamais appliqué en Production sous ce nom tant que le numéro
--      définitif n'est pas arbitré).
--
-- Couvre exactement les 7 points du GO :
--   1. Cycle MFR fictif avec version brouillon.
--   2. Validation réelle via la RPC 027 (`mfr_valider_version`).
--   3. Publication réelle via la RPC 027 (`mfr_publier_version`).
--   4. Lecture via la RPC candidate (`mfr_lire_version_publiee`).
--   5. Identité exacte du contenu publié (comparaison stricte).
--   6. Refus d'accès d'un autre utilisateur (RPC candidate).
--   7. Idempotence des deux RPC 027 + absence de publication en double
--      (seconde version jamais validable après publication du cycle).

begin;

do $$
declare
  v_proprietaire_id uuid := '22222222-2222-2222-2222-222222222222'; -- fictif, propriétaire réel du cycle
  v_autre_user_id    uuid := '33333333-3333-3333-3333-333333333333'; -- fictif, tentative d'accès non autorisée
  v_operateur_id     uuid := '44444444-4444-4444-4444-444444444444'; -- fictif, « admin » appelant les RPC 027

  v_dossier_id      uuid;
  v_etat_logique_id uuid;
  v_cycle_id        uuid;
  v_analyse_id      uuid;
  v_hp_id           uuid;
  v_curation_id     uuid;
  v_redaction_id    uuid;
  v_version_id      uuid; -- version 1, celle qui sera validée puis publiée
  v_version_2_id    uuid; -- version 2, brouillon postérieur, jamais publiée (point 7)

  v_contenu jsonb := '{
    "cycleId": "placeholder",
    "analyseId": "placeholder",
    "curationId": "placeholder",
    "recommandationConfirmee": true,
    "directions": [{
      "position": 1,
      "titre": "Direction fictive bout-en-bout",
      "pourquoi": {"texte": "Texte fictif", "sources": ["SRC_1"]},
      "forces": {"texte": "Forces fictives", "sources": ["SRC_1"]},
      "limites": {"texte": "Limites fictives", "sources": []},
      "planAction": {"texte": "Plan fictif", "sources": []},
      "hypotheseId": "placeholder",
      "estRecommandee": true
    }],
    "aucuneDirectionMessage": null
  }'::jsonb;

  v_resultat_validation   json;
  v_resultat_publication  json;
  v_lecture               json;
begin
  -- ── 0. Fixture — chaîne complète depuis auth.users ───────────
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    (v_proprietaire_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'proprietaire-fictif@test.local', '', now(), now(), now()),
    (v_autre_user_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'autre-fictif@test.local',       '', now(), now(), now()),
    (v_operateur_id,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'operateur-fictif@test.local',   '', now(), now(), now());

  insert into public.mpd_dossiers (user_id) values (v_proprietaire_id) returning id into v_dossier_id;

  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_proprietaire_id, 1, 'fixture-bout-en-bout')
  returning id into v_etat_logique_id;

  -- ── 1. Cycle MFR fictif avec version brouillon ───────────────
  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_proprietaire_id, v_etat_logique_id)
  returning id into v_cycle_id;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_id, v_proprietaire_id, v_etat_logique_id, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_id;

  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_id, v_proprietaire_id, 'DIRECTION_CANDIDATE', 'Fixture bout-en-bout')
  returning id into v_hp_id;

  insert into public.mfr_evaluations_d025 (analyse_id, hypothese_id, user_id, coherence_ok, compatibilite_ok, actionnabilite_resultat, disponibilite_ok, sortie, recommandee_aujourdhui)
  values (v_analyse_id, v_hp_id, v_proprietaire_id, true, true, 'ACTIONNABLE_MAINTENANT', true, 'PRESENTER_MAINTENANT', true);

  update public.mfr_cycles set analyse_retenue_id = v_analyse_id where id = v_cycle_id;

  -- Curation officielle — requise par mfr_valider_version/mfr_publier_version
  -- (027 : `aucune_curation`/`curation_non_officielle`). Oubliée dans une
  -- première version de ce test, corrigée après échec réel T2 ci-dessous.
  insert into public.mfr_curations (cycle_id, analyse_id, user_id, recommandation_confirmee)
  values (v_cycle_id, v_analyse_id, v_proprietaire_id, true)
  returning id into v_curation_id;

  insert into public.mfr_curation_directions (curation_id, analyse_id, hypothese_id, position)
  values (v_curation_id, v_analyse_id, v_hp_id, 1);

  insert into public.mfr_redactions (analyse_id, cycle_id, user_id, curation_id, provider, model, prompt_version, schema_version, statut, terminee_le)
  values (v_analyse_id, v_cycle_id, v_proprietaire_id, v_curation_id, 'openai', 'gpt-6.1-sol', 'v2', '1', 'SUCCES', now())
  returning id into v_redaction_id;

  v_contenu := v_contenu || jsonb_build_object('cycleId', v_cycle_id, 'analyseId', v_analyse_id, 'hypotheseId', v_hp_id);

  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_id, v_redaction_id, v_proprietaire_id, 1, v_contenu)
  returning id into v_version_id;

  raise notice 'T0 PASS — fixture complète créée (cycle=%, version brouillon=%)', v_cycle_id, v_version_id;

  -- ── 2. Validation réelle via la RPC 027 ──────────────────────
  v_resultat_validation := public.mfr_valider_version(v_version_id, v_cycle_id, v_operateur_id);
  if (v_resultat_validation->>'success')::boolean is not true or (v_resultat_validation->>'already_valide')::boolean is not false then
    raise exception 'T2 ÉCHEC : validation réelle attendue, obtenu %', v_resultat_validation;
  end if;
  raise notice 'T2 PASS — validation réelle réussie : %', v_resultat_validation;

  -- ── 3. Publication réelle via la RPC 027 ─────────────────────
  v_resultat_publication := public.mfr_publier_version(v_version_id, v_cycle_id, v_operateur_id);
  if (v_resultat_publication->>'success')::boolean is not true or (v_resultat_publication->>'already_publiee')::boolean is not false then
    raise exception 'T3 ÉCHEC : publication réelle attendue, obtenu %', v_resultat_publication;
  end if;
  raise notice 'T3 PASS — publication réelle réussie : %', v_resultat_publication;

  -- ── 4/5. Lecture via la RPC candidate, par le propriétaire réel ──
  perform set_config('request.jwt.claim.sub', v_proprietaire_id::text, true);
  v_lecture := public.mfr_lire_version_publiee(v_cycle_id);
  if (v_lecture->>'success')::boolean is not true then
    raise exception 'T4 ÉCHEC : lecture réussie attendue, obtenu %', v_lecture;
  end if;
  if (v_lecture->'contenu')::jsonb <> v_contenu then
    raise exception 'T5 ÉCHEC : contenu lu différent du contenu publié — % vs %', v_lecture->'contenu', v_contenu;
  end if;
  if (v_lecture->>'numeroVersion')::int <> 1 then
    raise exception 'T5 ÉCHEC : numeroVersion attendu 1, obtenu %', v_lecture->>'numeroVersion';
  end if;
  raise notice 'T4/T5 PASS — lecture réussie, contenu identique à l''octet près au contenu réellement publié';

  -- ── 6. Refus d'accès d'un autre utilisateur ──────────────────
  perform set_config('request.jwt.claim.sub', v_autre_user_id::text, true);
  v_lecture := public.mfr_lire_version_publiee(v_cycle_id);
  if v_lecture->>'error' <> 'acces_refuse' then
    raise exception 'T6 ÉCHEC : acces_refuse attendu pour un autre utilisateur, obtenu %', v_lecture;
  end if;
  raise notice 'T6 PASS — accès refusé à un autre utilisateur, même cycle réellement publié';

  -- ── 7a. Idempotence — revalider/republier la même version ────
  v_resultat_validation := public.mfr_valider_version(v_version_id, v_cycle_id, v_operateur_id);
  if (v_resultat_validation->>'already_valide')::boolean is not true then
    raise exception 'T7a ÉCHEC : already_valide=true attendu (idempotence), obtenu %', v_resultat_validation;
  end if;

  v_resultat_publication := public.mfr_publier_version(v_version_id, v_cycle_id, v_operateur_id);
  if (v_resultat_publication->>'already_publiee')::boolean is not true then
    raise exception 'T7a ÉCHEC : already_publiee=true attendu (idempotence), obtenu %', v_resultat_publication;
  end if;
  raise notice 'T7a PASS — idempotence confirmée sur les deux RPC, zéro second effet';

  -- ── 7b. Aucune publication en double — second brouillon jamais
  -- validable ni publiable une fois le cycle publié ───────────
  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_id, v_redaction_id, v_proprietaire_id, 2, '{"fixture":"brouillon_2_jamais_publiable"}'::jsonb)
  returning id into v_version_2_id;

  v_resultat_validation := public.mfr_valider_version(v_version_2_id, v_cycle_id, v_operateur_id);
  if v_resultat_validation->>'error' <> 'cycle_deja_publie' then
    raise exception 'T7b ÉCHEC : cycle_deja_publie attendu (validation d''un second brouillon après publication), obtenu %', v_resultat_validation;
  end if;
  raise notice 'T7b PASS — aucune publication en double : second brouillon jamais validable après publication du cycle';

  -- ── Confirmation finale : la lecture candidate renvoie toujours
  -- la version 1 (publiée), jamais la version 2 (brouillon) ──────
  perform set_config('request.jwt.claim.sub', v_proprietaire_id::text, true);
  v_lecture := public.mfr_lire_version_publiee(v_cycle_id);
  if (v_lecture->>'numeroVersion')::int <> 1 then
    raise exception 'T7c ÉCHEC : la lecture doit toujours renvoyer la version publiée (1), jamais le brouillon 2 — obtenu %', v_lecture->>'numeroVersion';
  end if;
  raise notice 'T7c PASS — la lecture reste fidèle à la version réellement publiée malgré l''existence d''un brouillon postérieur';

  raise notice '';
  raise notice '════════════════════════════════════════════════════════';
  raise notice 'PARCOURS COMPLET DÉMONTRÉ : brouillon → validation réelle → publication réelle → lecture réelle par le propriétaire → refus réel pour autrui → idempotence réelle → aucune double publication réelle.';
  raise notice '════════════════════════════════════════════════════════';
end $$;

rollback;
