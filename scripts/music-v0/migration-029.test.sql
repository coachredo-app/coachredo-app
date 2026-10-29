-- ============================================================
-- Tests de la migration 029 (récit narratif du brief) — base JETABLE uniquement.
-- Prérequis : supabase-stub.sql, 020, 021, 022 (et leurs tests), puis
-- 029_music_brief_recit_narratif.sql chargés.
-- Lancement : scripts/music-v0/run-db-test-029.sh (ne touche jamais Supabase),
-- qui fournit :'sections' (brief-sections.json) et :'recit' (brief-recit.json).
-- Données entièrement fictives. Chaque bloc lève une exception (et arrête
-- psql) si une assertion échoue.
-- ============================================================
\set ON_ERROR_STOP on
\pset footer off

create temporary table t_resultats (n serial, nom text);
create or replace function pg_temp.ok(p_nom text) returns void language sql as $$ insert into t_resultats(nom) values (p_nom) $$;
create or replace function pg_temp.h(p text) returns text language sql as $$ select encode(sha256(convert_to(p, 'UTF8')), 'hex') $$;
create temporary table t_json (sections jsonb, recit jsonb);
insert into t_json values (:'sections'::jsonb, :'recit'::jsonb);
create temporary table t_ctx (cle text primary key, val text);
create or replace function pg_temp.ctx(p text) returns text language sql as $$ select val from t_ctx where cle = p $$;

-- Contenu fictif complet (10 sections) ; le récit est ajouté selon les cas.
create or replace function pg_temp.fiche() returns jsonb language sql as $$
  select '{"destinataire": "Awa", "relation": "Sa mère", "occasion": "Anniversaire", "de_la_part": "Moussa",
           "histoire": "Les dimanches au marché.", "details": "Un surnom : Yaay.", "message": "Merci pour tout.",
           "emotions": "Tendresse.", "direction_musicale": "Douce, voix féminine.", "points_particuliers": ""}'::jsonb
$$;

-- 1. Miroir exact : 10 sections de brief-sections.json + récit de brief-recit.json
do $$
declare src text := (select prosrc from pg_proc where proname = 'music_brief_contenu_erreur'); s jsonb; r jsonb := (select recit from t_json); n int := 0;
begin
  for s in select jsonb_array_elements(sections) from t_json loop
    assert strpos(src, format('{"cle": "%s", "requis": %s, "max": %s}', s->>'cle', s->>'requis', s->>'max')) > 0, 'section absente ou différente : ' || (s->>'cle');
    n := n + 1;
  end loop;
  assert n = 10, 'dix sections attendues';
  assert r->>'cle' = 'recit' and (r->>'requis')::boolean = false, 'récit : clé et caractère facultatif';
  assert strpos(src, format('{"cle": "%s", "requis": %s, "max": %s}', r->>'cle', r->>'requis', r->>'max')) > 0, 'récit absent ou différent';
  assert (length(src) - length(replace(src, '"cle":', ''))) / length('"cle":') = 11, 'exactement 11 clés';
  perform pg_temp.ok('miroir : 10 sections identiques à brief-sections.json + récit identique à brief-recit.json (facultatif, ' || (r->>'max') || ' caractères), 11 clés exactement');
end $$;

-- 2. Attributs et privilèges inchangés
do $$
declare p record; ro text;
begin
  select * into p from pg_proc where proname = 'music_brief_contenu_erreur';
  assert p.provolatile = 'i' and not p.prosecdef, 'IMMUTABLE, pas SECURITY DEFINER';
  assert p.proconfig::text like '%search_path=public, pg_temp%', 'search_path fixé';
  assert p.proacl is not null, 'ACL explicite';
  assert not exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0), 'aucun EXECUTE pour PUBLIC';
  foreach ro in array array['anon', 'authenticated', 'service_role'] loop
    assert not has_function_privilege(ro, 'public.music_brief_contenu_erreur(jsonb)', 'execute'), ro || ' exécute le validateur';
  end loop;
  perform pg_temp.ok('validateur : IMMUTABLE, search_path fixé, aucun EXECUTE (PUBLIC, anon, authenticated, service_role) — identique à 022');
end $$;

-- 3. Règles du validateur
do $$
declare f jsonb := pg_temp.fiche(); m int := (select (recit->>'max')::int from t_json);
begin
  assert public.music_brief_contenu_erreur(f) is null, 'fiche seule valide (compatibilité)';
  assert public.music_brief_contenu_erreur(f || jsonb_build_object('recit', 'Un récit.')) is null, 'fiche + récit valide';
  assert public.music_brief_contenu_erreur(f || jsonb_build_object('recit', repeat('a', m))) is null, 'récit à la limite';
  assert public.music_brief_contenu_erreur(f || jsonb_build_object('recit', repeat('a', m + 1))) = 'recit:longueur', 'récit trop long';
  assert public.music_brief_contenu_erreur(f || '{"recit": 42}'::jsonb) = 'recit:type', 'récit non textuel';
  assert public.music_brief_contenu_erreur(f || '{"recit": ""}'::jsonb) is null, 'récit vide accepté (facultatif)';
  assert public.music_brief_contenu_erreur(f || '{"recit": null}'::jsonb) is null, 'récit null accepté (facultatif)';
  assert public.music_brief_contenu_erreur(f || '{"recit2": "x"}'::jsonb) = 'recit2:inconnu', 'clé inconnue toujours refusée';
  assert public.music_brief_contenu_erreur((f - 'message') || '{"recit": "x"}'::jsonb) = 'message:requis', 'le récit ne remplace pas une section obligatoire';
  assert public.music_brief_contenu_erreur('{"recit": "x"}'::jsonb) = 'destinataire:requis', 'récit seul refusé';
  perform pg_temp.ok('validateur : récit facultatif (texte, ≤ ' || m || ' caractères), clé inconnue refusée, sections obligatoires toujours exigées, fiche sans récit valide');
end $$;

-- 4. Lignes existantes (créées avant 029 par les tests 022) toujours valides
do $$ begin
  assert (select count(*) from public.music_briefs) > 0 and (select count(*) from public.music_brief_versions) > 0, 'données antérieures présentes';
  assert not exists (select 1 from public.music_briefs where public.music_brief_contenu_erreur(contenu) is not null), 'brief existant invalide';
  assert not exists (select 1 from public.music_brief_versions where public.music_brief_contenu_erreur(contenu) is not null), 'version existante invalide';
  perform pg_temp.ok('compatibilité : tous les briefs et versions existants restent valides');
end $$;

-- 5. Parcours avec récit : V1 envoyée = instantané unique (fiche + récit), ancien lien invalidé
do $$
declare r json; ref text; q text := pg_temp.h('Jeton029_Q'); b1 text := pg_temp.h('Jeton029_B1'); c json;
begin
  r := public.music_creer_commande(gen_random_uuid(), 'Test', 'test029@exemple.sn', '+221770000029', 'Ma mère', null, 'Awa', 'Anniversaire', null);
  ref := r->>'reference'; insert into t_ctx values ('ref', ref);
  perform public.music_confirmer_paiement(ref, 'TEST-029', q);
  perform public.music_questionnaire_envoyer(q, '{}', 'v0-test');
  r := public.music_admin_brief_enregistrer(ref, pg_temp.fiche() || '{"recit": "Récit V1.\n\nDeuxième paragraphe."}'::jsonb);
  assert (r->>'version')::int = 1 and r->>'error' is null, 'V1 enregistrée : ' || r::text;
  assert (public.music_brief_charger(q))->>'etat' = 'en_preparation', 'V1 non envoyée : en préparation';
  r := public.music_admin_brief_envoyer(ref, b1);
  assert (r->>'version')::int = 1, 'V1 envoyée';
  c := public.music_brief_charger(b1);
  assert c->>'etat' = 'a_valider' and (c->>'version')::int = 1 and c->'contenu'->>'recit' = E'Récit V1.\n\nDeuxième paragraphe.'
     and c->'contenu'->>'histoire' = 'Les dimanches au marché.', 'charger : fiche et récit dans le même contenu';
  assert (select contenu from public.music_brief_versions v join public.music_orders o on o.id = v.order_id where o.reference = ref and v.version = 1)
       = (select contenu from public.music_briefs b join public.music_orders o on o.id = b.order_id where o.reference = ref), 'instantané V1 = brief courant (fiche + récit)';
  assert (public.music_brief_charger(q))->>'error' = 'LIEN_INVALIDE' and (public.music_questionnaire_charger(q))->>'error' = 'LIEN_INVALIDE', 'lien du questionnaire invalidé à l''envoi';
  perform pg_temp.ok('parcours V1 : récit et fiche enregistrés, envoyés et figés dans le même instantané ; ancien lien invalidé');
end $$;

-- 6. Correction → V2 narrative : V1 conservée, lien V1 invalidé, validation V2 seule
do $$
declare ref text := pg_temp.ctx('ref'); b1 text := pg_temp.h('Jeton029_B1'); b2 text := pg_temp.h('Jeton029_B2'); r json; v record;
begin
  assert (public.music_brief_corriger(b1, 1, 'Merci de raconter autrement.'))->>'error' is null, 'correction V1';
  r := public.music_admin_brief_enregistrer(ref, pg_temp.fiche() || '{"recit": "Récit V2."}'::jsonb);
  assert (r->>'version')::int = 2, 'V2 créée : ' || r::text;
  assert (public.music_brief_charger(b1))->>'etat' = 'en_preparation', 'entre enregistrement et envoi : en préparation';
  perform public.music_admin_brief_envoyer(ref, b2);
  assert (public.music_brief_charger(b1))->>'error' = 'LIEN_INVALIDE', 'lien V1 invalidé';
  assert (public.music_brief_charger(b2))->'contenu'->>'recit' = 'Récit V2.' and ((public.music_brief_charger(b2))->>'version')::int = 2, 'lien V2 : récit V2';
  select * into v from public.music_brief_versions bv join public.music_orders o on o.id = bv.order_id where o.reference = ref and bv.version = 1;
  assert v.contenu->>'recit' = E'Récit V1.\n\nDeuxième paragraphe.' and v.client_feedback = 'Merci de raconter autrement.', 'historique V1 intact (récit + correction)';
  assert (public.music_brief_valider(b2, 1, 'brief-v0-2026-10'))->>'error' = 'VERSION_PERIMEE', 'V1 non validable';
  assert (public.music_brief_valider(b2, 2, 'brief-v0-2026-10'))->>'statut' = 'BRIEF_VALIDÉ', 'V2 validée';
  assert (select validated_at is not null from public.music_brief_versions bv join public.music_orders o on o.id = bv.order_id where o.reference = ref and bv.version = 2), 'instantané V2 validé';
  assert (public.music_admin_brief_enregistrer(ref, pg_temp.fiche() || '{"recit": "V3"}'::jsonb))->>'error' = 'BRIEF_DEJA_VALIDE', 'verrouillage après validation';
  perform pg_temp.ok('correction et V2 : V1 conservée avec son récit et sa correction, lien V1 invalidé, V1 non validable, V2 validée puis verrouillée');
end $$;

-- 7. Compatibilité : brief sans récit (comportement historique)
do $$
declare r json; ref text; q text := pg_temp.h('Jeton029_Q2'); b text := pg_temp.h('Jeton029_B3');
begin
  r := public.music_creer_commande(gen_random_uuid(), 'Test', 'test029b@exemple.sn', '+221770000030', 'Mon père', null, 'Ibou', 'Hommage', null);
  ref := r->>'reference';
  perform public.music_confirmer_paiement(ref, 'TEST-029-B', q);
  perform public.music_questionnaire_envoyer(q, '{}', 'v0-test');
  assert (public.music_admin_brief_enregistrer(ref, pg_temp.fiche()))->>'error' is null, 'brief sans récit';
  perform public.music_admin_brief_envoyer(ref, b);
  assert not (((public.music_brief_charger(b))->'contenu')::jsonb ? 'recit'), 'aucun récit renvoyé';
  assert (public.music_brief_valider(b, 1, 'brief-v0-2026-10'))->>'statut' = 'BRIEF_VALIDÉ', 'validation inchangée';
  perform pg_temp.ok('compatibilité : brief sans récit enregistré, envoyé et validé comme avant');
end $$;

-- 8. Récit trop long refusé par la RPC, rien enregistré
do $$
declare r json; ref text; q text := pg_temp.h('Jeton029_Q3'); m int := (select (recit->>'max')::int from t_json); avant int;
begin
  r := public.music_creer_commande(gen_random_uuid(), 'Test', 'test029c@exemple.sn', '+221770000031', 'Ma sœur', null, 'Fatou', 'Remerciement', null);
  ref := r->>'reference';
  perform public.music_confirmer_paiement(ref, 'TEST-029-C', q);
  perform public.music_questionnaire_envoyer(q, '{}', 'v0-test');
  select count(*) into avant from public.music_briefs;
  r := public.music_admin_brief_enregistrer(ref, pg_temp.fiche() || jsonb_build_object('recit', repeat('a', m + 1)));
  assert r->>'error' = 'CONTENU_INVALIDE' and r->>'champ' = 'recit:longueur', 'refus : ' || r::text;
  assert (select count(*) from public.music_briefs) = avant, 'rien enregistré';
  begin
    insert into public.music_briefs (order_id, version, contenu)
    select id, 1, pg_temp.fiche() || jsonb_build_object('recit', repeat('a', m + 1)) from public.music_orders where reference = ref;
    raise exception 'contrainte contournée';
  exception when check_violation then null; end;
  perform pg_temp.ok('limite : récit trop long refusé par la RPC (CONTENU_INVALIDE recit:longueur) et par la contrainte de table, rien enregistré');
end $$;

select n, 'PASS  ' || nom as resultat from t_resultats order by n;
