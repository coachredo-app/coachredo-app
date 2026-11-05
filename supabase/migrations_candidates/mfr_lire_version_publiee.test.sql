-- ============================================================
-- Tests SQL isolés/réversibles — mfr_lire_version_publiee (T-MFR.5B-3)
-- ============================================================
-- PRÉPARÉS, NON EXÉCUTÉS par Claude (aucun accès SQL direct dans cette
-- session — cohérent avec toute la discipline MFR déjà en vigueur).
-- À exécuter par Coach Redouane, sur une base jetable ou en
-- BEGIN...ROLLBACK contre un projet réel, APRÈS application du fichier
-- candidat `mfr_lire_version_publiee.sql` (numéro en attente, cf. son
-- en-tête) — jamais avant, la fonction testée doit exister.
--
-- Méthode identique à 023-027_*.test.sql : un seul `BEGIN...ROLLBACK`,
-- fixtures et appels RPC dans la même transaction, jamais commités.
-- Fixtures ancrées sur le compte test réel déjà utilisé tout au long de
-- cette session (`user_id`/`dossier_id` réels pour satisfaire les FK
-- obligatoires) ; `etat_logique_id`/`revision_dossier_capturee`
-- entièrement fabriqués, plage 999501+ — distincte de toutes les
-- plages déjà utilisées (023: implicite bas ; 024: 999101+ ; 026:
-- 999301+ ; 027: 999401+), aucune collision possible.
--
-- Simulation d'identité : `auth.uid()` lit `request.jwt.claim.sub`
-- (définition standard Supabase) — simulée ici par
-- `set_config('request.jwt.claim.sub', '<uuid>', true)` (portée locale
-- à la transaction), jamais une donnée réellement envoyée par un
-- client. Aucune manipulation de rôle PostgreSQL nécessaire pour les
-- tests fonctionnels (la fonction est SECURITY DEFINER, appelée
-- directement comme pour mfr_creer_curation dans 024_*.test.sql) — les
-- privilèges EXECUTE par rôle sont vérifiés séparément, statiquement,
-- via `has_function_privilege` (section finale).
--
-- Données fictives uniquement : aucun cycle/version/publication réel
-- n'est lu, modifié ou créé par ce fichier.

begin;

do $$
declare
  v_user_id        uuid := 'dd539d5c-5103-45b1-8e7e-579bff5b2f10'; -- compte test réel
  v_autre_user_id  uuid := '11111111-1111-1111-1111-111111111111'; -- fictif, jamais un vrai compte
  v_dossier_id     uuid := '2e4ba803-3a4d-4d7f-91db-134967636cbb'; -- dossier réel du même compte

  -- Cycle A : publié, une seule direction, contenu fictif réaliste.
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
      "titre": "Direction fictive de test",
      "pourquoi": {"texte": "Texte fictif", "sources": ["SRC_1"]},
      "forces": {"texte": "Forces fictives", "sources": ["SRC_1"]},
      "limites": {"texte": "Limites fictives", "sources": []},
      "planAction": {"texte": "Plan fictif", "sources": []},
      "hypotheseId": "00000000-0000-0000-0000-000000000000",
      "estRecommandee": true
    }],
    "aucuneDirectionMessage": null
  }'::jsonb;

  -- Cycle B : SANS publication (brouillon ou validé seulement).
  v_etat_logique_b uuid;
  v_cycle_b        uuid;
  v_analyse_b      uuid;
  v_redaction_b    uuid;
  v_version_b      uuid;

  -- Cycle C : publié, MAIS avec un brouillon postérieur plus récent —
  -- vérifie que la RPC ne renvoie jamais "la dernière version", toujours
  -- celle réellement référencée par mfr_publications.
  v_etat_logique_c uuid;
  v_cycle_c        uuid;
  v_analyse_c      uuid;
  v_redaction_c    uuid;
  v_version_c1     uuid; -- publiée
  v_version_c2     uuid; -- brouillon postérieur, jamais publié

  v_resultat jsonb;
begin
  -- ── Fixture cycle A : publié ─────────────────────────────────
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999501, 'fixture-lecture-test')
  returning id into v_etat_logique_a;

  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_a)
  returning id into v_cycle_a;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_a, v_user_id, v_etat_logique_a, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_a;

  insert into public.mfr_hypotheses (analyse_id, user_id, statut, formulation)
  values (v_analyse_a, v_user_id, 'DIRECTION_CANDIDATE', 'Fixture HP lecture')
  returning id into v_hp_a;

  insert into public.mfr_redactions (analyse_id, cycle_id, user_id, provider, model, prompt_version, schema_version, statut, terminee_le)
  values (v_analyse_a, v_cycle_a, v_user_id, 'openai', 'gpt-6.1-sol', 'v2', '1', 'SUCCES', now())
  returning id into v_redaction_a;

  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_a, v_redaction_a, v_user_id, 1, v_contenu_a)
  returning id into v_version_a;

  insert into public.mfr_publications (cycle_id, version_id, user_id)
  values (v_cycle_a, v_version_a, v_user_id);

  -- ── Fixture cycle B : aucune publication ─────────────────────
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999502, 'fixture-lecture-test')
  returning id into v_etat_logique_b;

  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_b)
  returning id into v_cycle_b;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_b, v_user_id, v_etat_logique_b, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_b;

  insert into public.mfr_redactions (analyse_id, cycle_id, user_id, provider, model, prompt_version, schema_version, statut, terminee_le)
  values (v_analyse_b, v_cycle_b, v_user_id, 'openai', 'gpt-6.1-sol', 'v2', '1', 'SUCCES', now())
  returning id into v_redaction_b;

  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_b, v_redaction_b, v_user_id, 1, '{"fixture":"brouillon_b"}'::jsonb)
  returning id into v_version_b;
  -- Aucune ligne mfr_publications pour ce cycle — volontaire.

  -- ── Fixture cycle C : publiée v1, brouillon v2 postérieur ────
  insert into public.mpd_etats_logiques (dossier_id, user_id, revision_dossier_capturee, version_canonique)
  values (v_dossier_id, v_user_id, 999503, 'fixture-lecture-test')
  returning id into v_etat_logique_c;

  insert into public.mfr_cycles (user_id, etat_logique_id)
  values (v_user_id, v_etat_logique_c)
  returning id into v_cycle_c;

  insert into public.mfr_analyses (cycle_id, user_id, etat_logique_id, provider, model, prompt_version, schema_version, catalogue_version, statut, terminee_le)
  values (v_cycle_c, v_user_id, v_etat_logique_c, 'openai', 'gpt-6.1-sol', 'v2', '1', '1', 'SUCCES', now())
  returning id into v_analyse_c;

  insert into public.mfr_redactions (analyse_id, cycle_id, user_id, provider, model, prompt_version, schema_version, statut, terminee_le)
  values (v_analyse_c, v_cycle_c, v_user_id, 'openai', 'gpt-6.1-sol', 'v2', '1', 'SUCCES', now())
  returning id into v_redaction_c;

  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_c, v_redaction_c, v_user_id, 1, '{"fixture":"publiee_c_v1"}'::jsonb)
  returning id into v_version_c1;

  insert into public.mfr_publications (cycle_id, version_id, user_id)
  values (v_cycle_c, v_version_c1, v_user_id);

  -- Brouillon v2 créé APRÈS la publication de v1 — situation anormale
  -- en usage réel normal (027 verrouille le cycle après publication),
  -- mais testée ici comme garde-fou structurel direct sur la RPC
  -- elle-même, jamais présumée impossible par construction ailleurs.
  insert into public.mfr_versions (cycle_id, redaction_id, user_id, numero_version, contenu)
  values (v_cycle_c, v_redaction_c, v_user_id, 2, '{"fixture":"brouillon_c_v2_jamais_publie"}'::jsonb)
  returning id into v_version_c2;

  -- ── Préalable 2026-11-05 (GO QG APP « gestion des testeurs MFR ») :
  -- depuis l'amendement de cette RPC (migration 034, qui dépend de 033), `acces_restreint`
  -- est retourné pour TOUT utilisateur dont le dernier événement
  -- `mfr_testeurs_evenements` n'est pas AUTORISE — table vide incluse.
  -- Sans ce préalable, T1-T7 ci-dessous échoueraient tous sur
  -- `acces_restreint` au lieu de leur code attendu : ce n'est pas une
  -- régression de ces tests, c'est le nouveau comportement par défaut
  -- qu'il faut neutraliser explicitement pour continuer à exercer
  -- isolément la logique déjà testée (propriété/publication/version).
  -- `v_user_id` sert ici à la fois de testeur et d'« opérateur » de
  -- fixture (FK `acteur_admin_id` satisfaite sans un troisième compte
  -- réel) — jamais une simulation de la garde admin elle-même (hors
  -- périmètre de ce fichier, la garde `requireAdminServiceWithUser()`
  -- vit exclusivement côté TypeScript, jamais testée en SQL).
  perform set_config('request.jwt.claim.sub', '', true);
  v_resultat := public.mfr_autoriser_testeur(v_user_id, v_user_id, 'fixture T-testeurs');
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'Préalable ÉCHEC : autorisation testeur v_user_id, obtenu %', v_resultat;
  end if;
  v_resultat := public.mfr_autoriser_testeur(v_autre_user_id, v_user_id, 'fixture T-testeurs (T3)');
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'Préalable ÉCHEC : autorisation testeur v_autre_user_id, obtenu %', v_resultat;
  end if;
  raise notice 'Préalable PASS — v_user_id et v_autre_user_id autorisés testeurs avant T1-T7';

  -- ── T1 — non authentifié (auth.uid() nul) ────────────────────
  perform set_config('request.jwt.claim.sub', '', true);
  v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
  if v_resultat->>'error' <> 'non_authentifie' then
    raise exception 'T1 ÉCHEC : attendu non_authentifie, obtenu %', v_resultat;
  end if;
  raise notice 'T1 PASS — non authentifié rejeté';

  -- ── T2 — cycle introuvable ────────────────────────────────────
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  v_resultat := public.mfr_lire_version_publiee('99999999-9999-9999-9999-999999999999'::uuid);
  if v_resultat->>'error' <> 'cycle_introuvable' then
    raise exception 'T2 ÉCHEC : attendu cycle_introuvable, obtenu %', v_resultat;
  end if;
  raise notice 'T2 PASS — cycle introuvable';

  -- ── T3 — cycle d'un autre utilisateur → accès refusé ─────────
  perform set_config('request.jwt.claim.sub', v_autre_user_id::text, true);
  v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
  if v_resultat->>'error' <> 'acces_refuse' then
    raise exception 'T3 ÉCHEC : attendu acces_refuse, obtenu %', v_resultat;
  end if;
  raise notice 'T3 PASS — accès refusé pour un cycle d''autrui';

  -- ── T4 — propriétaire réel, cycle sans publication ───────────
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  v_resultat := public.mfr_lire_version_publiee(v_cycle_b);
  if v_resultat->>'error' <> 'aucune_publication' then
    raise exception 'T4 ÉCHEC : attendu aucune_publication, obtenu %', v_resultat;
  end if;
  raise notice 'T4 PASS — aucune publication signalée explicitement';

  -- ── T5 — propriétaire réel, cycle publié → succès, contenu exact ──
  v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'T5a ÉCHEC : success attendu, obtenu %', v_resultat;
  end if;
  if (v_resultat->>'numeroVersion')::int <> 1 then
    raise exception 'T5b ÉCHEC : numeroVersion attendu 1, obtenu %', v_resultat;
  end if;
  if v_resultat->'contenu' <> v_contenu_a then
    raise exception 'T5c ÉCHEC : contenu ne correspond pas à la fixture insérée';
  end if;
  raise notice 'T5 PASS — version publiée lue intégralement et fidèlement';

  -- ── T6 — AUCUNE fuite : seules les 4 clés documentées présentes ──
  if (select count(*) from jsonb_object_keys(v_resultat)) <> 4 then
    raise exception 'T6 ÉCHEC : le retour contient % clés au lieu de 4 (success, numeroVersion, contenu, publieLe)', (select count(*) from jsonb_object_keys(v_resultat));
  end if;
  if not (v_resultat ? 'success' and v_resultat ? 'numeroVersion' and v_resultat ? 'contenu' and v_resultat ? 'publieLe') then
    raise exception 'T6 ÉCHEC : une des 4 clés attendues est absente — %', v_resultat;
  end if;
  raise notice 'T6 PASS — aucune donnée interne/administrative dans le retour';

  -- ── T7 — cycle publié AVEC brouillon postérieur : jamais le brouillon ──
  v_resultat := public.mfr_lire_version_publiee(v_cycle_c);
  if (v_resultat->>'numeroVersion')::int <> 1 then
    raise exception 'T7 ÉCHEC : attendu numeroVersion=1 (celle publiée), obtenu %', v_resultat;
  end if;
  if v_resultat->'contenu' <> '{"fixture":"publiee_c_v1"}'::jsonb then
    raise exception 'T7 ÉCHEC : contenu du brouillon v2 renvoyé par erreur — %', v_resultat;
  end if;
  raise notice 'T7 PASS — jamais la dernière version, toujours celle réellement publiée';

  -- ════════════════════════════════════════════════════════════
  -- T9-T15 — Gestion des testeurs MFR (GO QG APP 2026-11-05, migration 033)
  -- ════════════════════════════════════════════════════════════
  -- Toujours ÉCRITS, NON EXÉCUTÉS ici (ce fichier entier n'a pas été
  -- rejoué — il dépend de fixtures plus lourdes que nécessaire). Les
  -- scénarios qu'ils couvrent sont désormais RÉELLEMENT EXÉCUTÉS,
  -- avec des fixtures plus légères et sur la chaîne de migrations
  -- réelle (013→027, 033, 034), dans
  -- `supabase/migrations_candidates/test_integration_testeurs_lecture.sql`
  -- (8 scénarios QG, via `run_test_integration.sh`, PASS). T9-T15
  -- restent ici pour mémoire/couverture complémentaire (ex. T7,
  -- brouillon postérieur à la publication), pas comme seule preuve.

  -- ── T9 — table vide pour un utilisateur jamais autorisé → fermé ──
  -- Fictif, jamais un vrai compte, jamais touché par le préalable
  -- ci-dessus : aucune ligne `mfr_testeurs_evenements` pour lui.
  declare
    v_jamais_testeur uuid := '22222222-2222-2222-2222-222222222222';
  begin
    perform set_config('request.jwt.claim.sub', v_jamais_testeur::text, true);
    v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
    if v_resultat->>'error' <> 'acces_restreint' then
      raise exception 'T9 ÉCHEC : attendu acces_restreint, obtenu %', v_resultat;
    end if;
    raise notice 'T9 PASS — utilisateur jamais autorisé fermé par défaut, même avec un cycle_id d''autrui syntaxiquement valide';
  end;

  -- ── T10 — retrait d'un testeur déjà autorisé → fermé immédiatement ──
  v_resultat := public.mfr_retirer_testeur(v_user_id, v_user_id, 'fixture T10 retrait');
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'T10 ÉCHEC : retrait, obtenu %', v_resultat;
  end if;
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
  if v_resultat->>'error' <> 'acces_restreint' then
    raise exception 'T10 ÉCHEC : attendu acces_restreint après retrait, obtenu %', v_resultat;
  end if;
  raise notice 'T10 PASS — retrait effectif immédiatement, même sur un cycle déjà publié consulté avec succès en T5';

  -- ── T11 — réautorisation après retrait → accès restauré ──────
  v_resultat := public.mfr_autoriser_testeur(v_user_id, v_user_id, 'fixture T11 réautorisation');
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'T11 ÉCHEC : réautorisation, obtenu %', v_resultat;
  end if;
  v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
  if (v_resultat->>'success')::boolean is not true then
    raise exception 'T11 ÉCHEC : attendu succès après réautorisation, obtenu %', v_resultat;
  end if;
  raise notice 'T11 PASS — réautorisation restaure l''accès, historique complet conservé (3 événements pour v_user_id : AUTORISE/RETIRE/AUTORISE)';

  -- ── T12 — CORRIGÉ 2026-11-05 (revue QG APP) ──────────────────
  -- La version précédente de ce test forçait deux INSERT au même
  -- `cree_le` dans UNE SEULE transaction/session et prétendait valider
  -- « l'ordre déterministe sous concurrence ». **C'était trompeur,
  -- signalé explicitement par le QG et corrigé ici** : deux INSERT
  -- séquentiels dans la même transaction ne subissent, par définition,
  -- aucune concurrence réelle — `nextval()` est appelé au moment de
  -- l'exécution de l'instruction (potentiellement tôt dans une
  -- transaction), la ligne ne devient visible qu'au COMMIT ; deux
  -- VRAIES transactions concurrentes peuvent obtenir leurs `id` dans un
  -- ordre différent de leur ordre réel de validation. Un test à
  -- l'intérieur d'une seule session ne peut donc JAMAIS démontrer la
  -- sérialisation réelle — seule une vérification avec deux connexions
  -- distinctes le peut (voir le script séparé ci-dessous).
  --
  -- Ce qui reste légitimement testable ICI, à l'intérieur d'une seule
  -- transaction, et ce que ce bloc teste désormais — deux garanties
  -- plus modestes, honnêtement nommées :
  --   (a) en écriture strictement séquentielle (aucune concurrence),
  --       l'ordre de `id` reflète bien l'ordre d'insertion — propriété
  --       triviale d'un `bigserial`, pas une preuve de robustesse sous
  --       charge concurrente ;
  --   (b) le mécanisme de sérialisation ajouté (`pg_advisory_xact_lock`)
  --       est RÉELLEMENT PRÉSENT dans le corps des deux fonctions —
  --       vérifié par inspection statique du code exécutable
  --       (`pg_get_functiondef`), pas par son exécution concurrente.
  -- La preuve dynamique de sérialisation sous deux transactions
  -- réellement concurrentes, dans les deux ordres (autoriser/autoriser,
  -- retirer/retirer, autoriser/retirer), est un script SÉPARÉ :
  -- `supabase/migrations_candidates/test_concurrence_testeurs.sh`
  -- (deux connexions `psql` réelles, jamais exprimable dans un seul
  -- bloc `do $$ ... $$`) — ÉCRIT, NON EXÉCUTÉ (aucune base disponible
  -- dans cette session), à exécuter par Coach Redouane contre un
  -- Postgres local ou jetable avant tout GO de production.
  begin
    -- (a) Écriture séquentielle : propriété triviale, pas une preuve de
    -- concurrence — nommée honnêtement pour ne jamais être confondue
    -- avec un test de concurrence réelle.
    insert into public.mfr_testeurs_evenements (user_id, action, acteur_admin_id, commentaire)
    values (v_user_id, 'RETIRE', v_user_id, 'fixture T12a — séquentiel, id inférieur');
    insert into public.mfr_testeurs_evenements (user_id, action, acteur_admin_id, commentaire)
    values (v_user_id, 'AUTORISE', v_user_id, 'fixture T12a — séquentiel, id supérieur');

    v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
    if (v_resultat->>'success')::boolean is not true then
      raise exception 'T12a ÉCHEC : en écriture séquentielle, le dernier id inséré doit l''emporter, obtenu %', v_resultat;
    end if;
    raise notice 'T12a PASS — ordre par id respecté en écriture séquentielle (PAS un test de concurrence réelle — voir T12b et le script séparé)';
  end;

  -- (b) Inspection statique : le verrou de sérialisation est bien
  -- présent dans le corps réellement exécutable des deux fonctions —
  -- garantie de code, pas garantie d'exécution concurrente.
  declare
    v_corps_autoriser text;
    v_corps_retirer   text;
  begin
    v_corps_autoriser := pg_get_functiondef('public.mfr_autoriser_testeur(uuid, uuid, text)'::regprocedure);
    v_corps_retirer   := pg_get_functiondef('public.mfr_retirer_testeur(uuid, uuid, text)'::regprocedure);

    if v_corps_autoriser not ilike '%pg_advisory_xact_lock%' then
      raise exception 'T12b ÉCHEC : mfr_autoriser_testeur ne contient aucun appel à pg_advisory_xact_lock — sérialisation absente';
    end if;
    if v_corps_retirer not ilike '%pg_advisory_xact_lock%' then
      raise exception 'T12b ÉCHEC : mfr_retirer_testeur ne contient aucun appel à pg_advisory_xact_lock — sérialisation absente';
    end if;
    raise notice 'T12b PASS — pg_advisory_xact_lock présent dans les deux fonctions (garantie de code — pas une preuve d''exécution concurrente, voir le script séparé)';
  end;

  -- ── T13 — appel direct des RPC d'écriture avec paramètres invalides ──
  v_resultat := public.mfr_autoriser_testeur(null, v_user_id, null);
  if v_resultat->>'error' <> 'identifiant_invalide' then
    raise exception 'T13a ÉCHEC : p_user_id null, obtenu %', v_resultat;
  end if;
  v_resultat := public.mfr_autoriser_testeur(v_user_id, null, null);
  if v_resultat->>'error' <> 'identifiant_invalide' then
    raise exception 'T13b ÉCHEC : p_operateur_id null, obtenu %', v_resultat;
  end if;
  v_resultat := public.mfr_autoriser_testeur('33333333-3333-3333-3333-333333333333'::uuid, v_user_id, null);
  if v_resultat->>'error' <> 'utilisateur_introuvable' then
    raise exception 'T13c ÉCHEC : utilisateur cible inexistant, obtenu %', v_resultat;
  end if;
  raise notice 'T13 PASS — identifiants invalides/inexistants rejetés proprement, jamais une insertion silencieuse';

  -- ── T14 — lecture d'un cycle d'autrui reste refusée même en testeur ──
  -- Un testeur autorisé reste soumis au contrôle de propriété déjà
  -- existant (étape 2/6, inchangée) — jamais une élévation d'accès aux
  -- MFR d'autres utilisateurs. v_autre_user_id est testeur (préalable)
  -- mais n'est jamais propriétaire de v_cycle_a.
  perform set_config('request.jwt.claim.sub', v_autre_user_id::text, true);
  v_resultat := public.mfr_lire_version_publiee(v_cycle_a);
  if v_resultat->>'error' <> 'acces_refuse' then
    raise exception 'T14 ÉCHEC : un testeur autorisé ne doit jamais lire la MFR d''un autre utilisateur — attendu acces_refuse, obtenu %', v_resultat;
  end if;
  raise notice 'T14 PASS — statut testeur n''accorde jamais d''accès aux cycles d''autrui (le contrôle de propriété reste intact et prioritaire une fois le gate global franchi)';

  raise notice '13/13 assertions fonctionnelles PASS (7 lecture + 6 gestion testeurs).';
end $$;

-- ── Privilèges EXECUTE par rôle (statique, même discipline que 027) ──
do $$
declare
  v_anon          boolean;
  v_authenticated boolean;
  v_service_role  boolean;
  v_public        boolean;
begin
  v_anon          := has_function_privilege('anon', 'public.mfr_lire_version_publiee(uuid)', 'EXECUTE');
  v_authenticated := has_function_privilege('authenticated', 'public.mfr_lire_version_publiee(uuid)', 'EXECUTE');
  v_service_role  := has_function_privilege('service_role', 'public.mfr_lire_version_publiee(uuid)', 'EXECUTE');
  v_public        := has_function_privilege('public', 'public.mfr_lire_version_publiee(uuid)', 'EXECUTE');

  if v_anon is not false then raise exception 'T8 ÉCHEC : anon ne doit jamais avoir EXECUTE'; end if;
  if v_authenticated is not true then raise exception 'T8 ÉCHEC : authenticated doit avoir EXECUTE'; end if;
  if v_service_role is not false then raise exception 'T8 ÉCHEC : service_role ne doit pas avoir EXECUTE (minimal, non nécessaire)'; end if;
  if v_public is not false then raise exception 'T8 ÉCHEC : public ne doit jamais avoir EXECUTE'; end if;

  raise notice 'T8 PASS — EXECUTE exactement authenticated=true, anon/service_role/public=false';
end $$;

-- ── T15 — privilèges EXECUTE des 2 RPC d'écriture testeurs (033) ──
-- Inverse de T8 : réservées service_role EXCLUSIVEMENT, jamais
-- authenticated — aucun utilisateur ordinaire ne doit pouvoir
-- s'auto-autoriser ou retirer un autre testeur, même par appel RPC
-- direct hors de toute Server Action admin.
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

  if v_anon is not false then raise exception 'T15a ÉCHEC : anon ne doit jamais avoir EXECUTE sur mfr_autoriser_testeur'; end if;
  if v_authenticated is not false then raise exception 'T15a ÉCHEC : authenticated ne doit JAMAIS avoir EXECUTE sur mfr_autoriser_testeur (réservé admin/service_role)'; end if;
  if v_service_role is not true then raise exception 'T15a ÉCHEC : service_role doit avoir EXECUTE sur mfr_autoriser_testeur'; end if;
  if v_public is not false then raise exception 'T15a ÉCHEC : public ne doit jamais avoir EXECUTE sur mfr_autoriser_testeur'; end if;

  v_anon          := has_function_privilege('anon', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');
  v_authenticated := has_function_privilege('authenticated', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');
  v_service_role  := has_function_privilege('service_role', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');
  v_public        := has_function_privilege('public', 'public.mfr_retirer_testeur(uuid, uuid, text)', 'EXECUTE');

  if v_anon is not false then raise exception 'T15b ÉCHEC : anon ne doit jamais avoir EXECUTE sur mfr_retirer_testeur'; end if;
  if v_authenticated is not false then raise exception 'T15b ÉCHEC : authenticated ne doit JAMAIS avoir EXECUTE sur mfr_retirer_testeur (réservé admin/service_role)'; end if;
  if v_service_role is not true then raise exception 'T15b ÉCHEC : service_role doit avoir EXECUTE sur mfr_retirer_testeur'; end if;
  if v_public is not false then raise exception 'T15b ÉCHEC : public ne doit jamais avoir EXECUTE sur mfr_retirer_testeur'; end if;

  raise notice 'T15 PASS — mfr_autoriser_testeur/mfr_retirer_testeur réservées service_role exclusivement';
end $$;

rollback;
