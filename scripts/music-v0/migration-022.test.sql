-- ============================================================
-- Tests de la migration 022 (Music V0 LOT 3 — brief + validation) — base JETABLE.
-- Prérequis : supabase-stub.sql, 020, 021 puis 022 chargés.
-- Lancement : scripts/music-v0/run-db-test.sh (ne touche jamais Supabase),
-- qui fournit :'sections' = contenu de src/lib/music/brief-sections.json.
-- Jetons simulés : seule leur empreinte SHA-256 est transmise (comme admin.mjs
-- et la route serveur).
-- ============================================================
\set ON_ERROR_STOP on
\pset footer off

create temporary table t_resultats (n serial, nom text);
create or replace function pg_temp.ok(p_nom text) returns void language sql as $$ insert into t_resultats(nom) values (p_nom) $$;
create or replace function pg_temp.h(p text) returns text language sql as $$ select encode(sha256(convert_to(p, 'UTF8')), 'hex') $$;
create temporary table t_sections (contenu jsonb);
insert into t_sections values (:'sections'::jsonb);
create temporary table t_ctx (cle text primary key, val text);

-- Brief valide de référence
create or replace function pg_temp.brief(p_histoire text default 'Les dimanches au marché de Sandaga.') returns jsonb language sql as $$
  select jsonb_build_object(
    'destinataire', 'Fatou', 'relation', 'Ma mère', 'occasion', 'Anniversaire',
    'de_la_part', 'Ses enfants Awa et Moussa', 'histoire', p_histoire,
    'details', 'Surnom : Yaay', 'message', 'Merci pour ta force.', 'emotions', 'Se sentir aimée',
    'direction_musicale', 'Douce et émouvante, voix féminine.', 'points_particuliers', 'Prononcer « Yaay ».')
$$;

-- Commande ayant envoyé son questionnaire (QUESTIONNAIRE_REÇU), jeton p_jeton
create or replace function pg_temp.commande_recue(p_jeton text) returns text language plpgsql as $$
declare ref text;
begin
  ref := (public.music_creer_commande(gen_random_uuid(), 'Awa', 'awa@exemple.sn', '+221771234567', 'Ma mère', null, 'Fatou', 'Anniversaire', null))->>'reference';
  perform public.music_confirmer_paiement(ref, 'WAVE-TEST', pg_temp.h(p_jeton));
  perform public.music_questionnaire_envoyer(pg_temp.h(p_jeton),
    '{"etape_courante": 8, "etape1": {"de_la_part": "Plusieurs personnes", "de_la_part_qui": "Ses enfants"}, "etape2": {"souvenir_principal": "Sandaga"}}', 'v0-2026-10');
  return ref;
end $$;

-- 1. Cloisonnement
do $$
declare ro text; t text;
begin
  foreach t in array array['public.music_briefs', 'public.music_brief_versions'] loop
    assert (select relrowsecurity from pg_class where oid = t::regclass), t || ' RLS';
    foreach ro in array array['anon', 'authenticated', 'service_role'] loop
      assert not has_table_privilege(ro, t, 'select') and not has_table_privilege(ro, t, 'insert')
         and not has_table_privilege(ro, t, 'update') and not has_table_privilege(ro, t, 'delete'), ro || ' ' || t;
    end loop;
  end loop;
  assert not exists (select 1 from pg_policies where tablename in ('music_briefs', 'music_brief_versions')), 'aucune policy';
  foreach ro in array array['anon', 'authenticated'] loop
    assert not has_function_privilege(ro, 'public.music_admin_questionnaire(text)', 'execute');
    assert not has_function_privilege(ro, 'public.music_admin_brief_enregistrer(text,jsonb)', 'execute');
    assert not has_function_privilege(ro, 'public.music_admin_brief_envoyer(text,text)', 'execute');
    assert not has_function_privilege(ro, 'public.music_brief_charger(text)', 'execute');
    assert not has_function_privilege(ro, 'public.music_brief_valider(text,integer,text)', 'execute');
  end loop;
  foreach ro in array array['anon', 'authenticated', 'service_role'] loop
    assert not has_function_privilege(ro, 'public.music_brief_contenu_erreur(jsonb)', 'execute'), ro || ' fonction interne';
  end loop;
  assert has_function_privilege('service_role', 'public.music_brief_valider(text,integer,text)', 'execute');
  assert (select bool_and(prosecdef) and bool_and(proconfig::text like '%search_path=public, pg_temp%')
            from pg_proc where proname like 'music_admin_%' or proname in ('music_brief_charger', 'music_brief_corriger', 'music_brief_valider')), 'SECURITY DEFINER + search_path';
  perform pg_temp.ok('cloisonnement : RLS sans policy sur briefs et versions, aucun privilège de table (y compris service_role), RPC réservées à service_role, fonction de validation interne');
end $$;
set role anon;
do $$ begin
  begin perform public.music_brief_charger(repeat('0', 64)); raise exception 'anon a exécuté'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
do $$ begin
  begin perform 1 from public.music_briefs; raise exception 'service_role lit la table'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 2. Contenu : parité exacte avec brief-sections.json (clés, obligatoires, longueurs)
do $$
declare s jsonb; b jsonb := pg_temp.brief(); k text; n int := 0;
begin
  for s in select jsonb_array_elements(contenu) from t_sections loop
    n := n + 1; k := s->>'cle';
    assert public.music_brief_contenu_erreur(b || jsonb_build_object(k, repeat('a', (s->>'max')::int))) is null, k || ' max accepté';
    assert public.music_brief_contenu_erreur(b || jsonb_build_object(k, repeat('a', (s->>'max')::int + 1))) = k || ':longueur', k || ' max+1 refusé';
    if (s->>'requis')::boolean then
      assert public.music_brief_contenu_erreur(b - k) = k || ':requis', k || ' requis (absent)';
      assert public.music_brief_contenu_erreur(b || jsonb_build_object(k, '   ')) = k || ':requis', k || ' requis (vide)';
    else
      assert public.music_brief_contenu_erreur(b - k) is null, k || ' facultatif';
    end if;
    assert public.music_brief_contenu_erreur(b || jsonb_build_object(k, 3)) = k || ':type', k || ' type';
  end loop;
  assert n = 10 and (select count(*) from jsonb_object_keys(b)) = 10, 'dix sections';
  assert public.music_brief_contenu_erreur(b || '{"paroles": "x"}') = 'paroles:inconnu', 'clé inconnue';
  assert public.music_brief_contenu_erreur('[]') = 'structure' and public.music_brief_contenu_erreur(null) = 'structure';
  perform pg_temp.ok('contenu du brief : 10 sections identiques à brief-sections.json (obligatoires, longueurs, types), clé inconnue refusée');
end $$;

-- 3. Lecture admin du questionnaire reçu ; commandes incompatibles refusées
do $$
declare r json; ref text; ref2 text;
begin
  ref := pg_temp.commande_recue('JetonLot3_A');
  insert into t_ctx values ('ref', ref);
  r := public.music_admin_questionnaire(ref);
  assert r->>'reference' = ref and r->>'beneficiaire_prenom' = 'Fatou' and r->'responses'->'etape2'->>'souvenir_principal' = 'Sandaga' and r->>'envoye_le' is not null, 'lecture : ' || r::text;
  assert r->>'consentement_version' = 'v0-2026-10';
  assert r->>'client_prenom' = 'Awa' and r::text not like '%awa@exemple.sn%' and r::text not like '%771234567%', 'prénom client seul, ni email ni WhatsApp';
  -- payée mais questionnaire non envoyé
  ref2 := (public.music_creer_commande(gen_random_uuid(), 'Awa', 'awa@exemple.sn', '+221771234567', 'Ma mère', null, 'Fatou', 'Anniversaire', null))->>'reference';
  assert (public.music_admin_questionnaire(ref2))->>'error' = 'QUESTIONNAIRE_INTROUVABLE', 'non payée';
  perform public.music_confirmer_paiement(ref2, null, pg_temp.h('JetonLot3_NonEnvoye'));
  perform public.music_questionnaire_brouillon(pg_temp.h('JetonLot3_NonEnvoye'), '{"etape_courante": 2}');
  assert (public.music_admin_questionnaire(ref2))->>'error' = 'STATUT_INCOMPATIBLE', 'brouillon non envoyé';
  assert (public.music_admin_questionnaire('CRM-99999'))->>'error' = 'QUESTIONNAIRE_INTROUVABLE';
  -- brief impossible avant réception du questionnaire
  assert (public.music_admin_brief_enregistrer(ref2, pg_temp.brief()))->>'error' = 'STATUT_INCOMPATIBLE', 'brief avant questionnaire';
  perform pg_temp.ok('admin : questionnaire reçu lisible ; non payée / non envoyé / inconnue refusés ; brief impossible avant QUESTIONNAIRE_REÇU');
end $$;

-- 4. Création du brief : version 1, brouillon interne invisible pour le client
do $$
declare r json; ref text := (select val from t_ctx where cle = 'ref');
begin
  assert (public.music_admin_brief_enregistrer(ref, pg_temp.brief() - 'histoire'))->>'error' = 'CONTENU_INVALIDE', 'contenu invalide';
  r := public.music_admin_brief_enregistrer(ref, pg_temp.brief('Première rédaction'));
  assert (r->>'version')::int = 1 and (r->>'envoye')::boolean = false, 'v1 : ' || r::text;
  r := public.music_admin_brief_enregistrer(ref, pg_temp.brief());
  assert (r->>'version')::int = 1, 'brouillon non envoyé : remplacé, même version';
  assert (select statut from public.music_orders where reference = ref) = 'QUESTIONNAIRE_REÇU', 'statut inchangé avant envoi';
  assert (public.music_brief_charger(pg_temp.h('JetonLot3_A')))->>'etat' = 'en_preparation', 'brouillon invisible côté client';
  assert (public.music_brief_valider(pg_temp.h('JetonLot3_A'), 1, 'brief-v0'))->>'error' = 'VERSION_PERIMEE', 'brouillon non envoyé : non validable';
  assert (public.music_admin_brief_envoyer(ref, 'x'))->>'error' = 'EMPREINTE_INVALIDE';
  assert not exists (select 1 from public.music_brief_versions v join public.music_orders o on o.id = v.order_id where o.reference = ref), 'aucune version envoyée';
  perform pg_temp.ok('création du brief : contenu validé, version 1, brouillon remplaçable, invisible et non validable côté client, statut inchangé');
end $$;

-- 5. Envoi v1 : nouveau lien, ancien lien invalide, BRIEF_À_VALIDER, lecture client
do $$
declare r json; ref text := (select val from t_ctx where cle = 'ref');
begin
  r := public.music_admin_brief_envoyer(ref, pg_temp.h('JetonLot3_B1'));
  assert (r->>'version')::int = 1 and r->>'envoye_le' is not null and (r->>'reenvoi')::boolean = false, 'envoi : ' || r::text;
  assert (select statut from public.music_orders where reference = ref) = 'BRIEF_À_VALIDER';
  assert (public.music_brief_charger(pg_temp.h('JetonLot3_A')))->>'error' = 'LIEN_INVALIDE', 'lien du questionnaire invalidé';
  assert (public.music_questionnaire_charger(pg_temp.h('JetonLot3_A')))->>'error' = 'LIEN_INVALIDE', 'idem côté questionnaire';
  r := public.music_brief_charger(pg_temp.h('JetonLot3_B1'));
  assert r->>'etat' = 'a_valider' and (r->>'version')::int = 1 and r->'contenu'->>'destinataire' = 'Fatou', 'lecture client : ' || r::text;
  assert r::text not like '%awa@exemple.sn%' and r::text not like '%771234567%' and r->>'reference' is null, 'aucune coordonnée ni information administrative';
  assert (select count(*) from public.music_brief_versions v join public.music_orders o on o.id = v.order_id where o.reference = ref) = 1, 'instantané v1';
  -- réenvoi de la même version (lien perdu) : nouveau lien, l'ancien tombe, même version
  r := public.music_admin_brief_envoyer(ref, pg_temp.h('JetonLot3_B1bis'));
  assert (r->>'reenvoi')::boolean and (r->>'version')::int = 1;
  assert (public.music_brief_charger(pg_temp.h('JetonLot3_B1')))->>'error' = 'LIEN_INVALIDE', 'lien remplacé';
  assert (public.music_brief_charger(pg_temp.h('JetonLot3_B1bis')))->>'etat' = 'a_valider';
  assert (select count(*) from public.music_brief_versions v join public.music_orders o on o.id = v.order_id where o.reference = ref) = 1, 'réenvoi : pas de doublon';
  perform pg_temp.ok('envoi : nouveau lien (ancien lien questionnaire invalidé), BRIEF_À_VALIDER, lecture client sans donnée administrative ; réenvoi = nouveau lien, même version');
end $$;

-- 6. Refus uniformes côté client
do $$
declare ref text := (select val from t_ctx where cle = 'ref'); ref2 text;
begin
  assert (public.music_brief_charger(null))->>'error' = 'LIEN_INVALIDE';
  assert (public.music_brief_charger('mal-forme'))->>'error' = 'LIEN_INVALIDE';
  assert (public.music_brief_charger(repeat('b', 64)))->>'error' = 'LIEN_INVALIDE', 'inconnu';
  assert (public.music_brief_charger('JetonLot3_B1bis'))->>'error' = 'LIEN_INVALIDE', 'jeton en clair';
  assert (public.music_brief_charger(ref))->>'error' = 'LIEN_INVALIDE', 'CRM seul';
  assert (public.music_brief_valider(ref, 1, 'brief-v0'))->>'error' = 'LIEN_INVALIDE', 'CRM seul : validation';
  assert (public.music_brief_corriger(ref, 1, 'x'))->>'error' = 'LIEN_INVALIDE', 'CRM seul : correction';
  -- expiré
  ref2 := pg_temp.commande_recue('JetonLot3_Exp');
  perform public.music_admin_brief_enregistrer(ref2, pg_temp.brief());
  perform public.music_admin_brief_envoyer(ref2, pg_temp.h('JetonLot3_Exp2'));
  update public.music_orders set jeton_questionnaire_expire_le = now() - interval '1 second' where reference = ref2;
  assert (public.music_brief_charger(pg_temp.h('JetonLot3_Exp2')))->>'error' = 'LIEN_INVALIDE', 'expiré';
  assert (public.music_brief_valider(pg_temp.h('JetonLot3_Exp2'), 1, 'brief-v0'))->>'error' = 'LIEN_INVALIDE', 'expiré : validation';
  -- révoqué
  update public.music_orders set jeton_questionnaire_expire_le = now() + interval '1 day' where reference = ref2;
  perform public.music_revoquer_lien_questionnaire(ref2);
  assert (public.music_brief_charger(pg_temp.h('JetonLot3_Exp2')))->>'error' = 'LIEN_INVALIDE', 'révoqué';
  assert (public.music_brief_corriger(pg_temp.h('JetonLot3_Exp2'), 1, 'x'))->>'error' = 'LIEN_INVALIDE', 'révoqué : correction';
  assert (select validated_at is null and correction_requested_at is null from public.music_briefs b join public.music_orders o on o.id = b.order_id where o.reference = ref2), 'aucun effet';
  perform pg_temp.ok('refus uniformes LIEN_INVALIDE : nul, mal formé, inconnu, jeton en clair, CRM seul, expiré, révoqué — sans effet');
end $$;

-- 7. Correction client : feedback, date, version concernée ; pas de validation
do $$
declare r json; ref text := (select val from t_ctx where cle = 'ref'); j text := pg_temp.h('JetonLot3_B1bis');
begin
  assert (public.music_brief_corriger(j, 2, 'Le prénom est Fatou Binetou.'))->>'error' = 'VERSION_PERIMEE', 'mauvaise version';
  assert (public.music_brief_corriger(j, 1, '   '))->>'error' = 'DONNEES_INVALIDES', 'feedback vide';
  assert (public.music_brief_corriger(j, 1, repeat('a', 2001)))->>'error' = 'DONNEES_INVALIDES', 'feedback trop long';
  r := public.music_brief_corriger(j, 1, 'Le prénom complet est Fatou Binetou.');
  assert (r->>'version')::int = 1 and r->>'correction_le' is not null, 'correction : ' || r::text;
  assert (select client_feedback = 'Le prénom complet est Fatou Binetou.' and correction_requested_at is not null and validated_at is null
            from public.music_briefs b join public.music_orders o on o.id = b.order_id where o.reference = ref), 'feedback courant';
  assert (select client_feedback is not null and correction_requested_at is not null from public.music_brief_versions v join public.music_orders o on o.id = v.order_id where o.reference = ref and v.version = 1), 'feedback historisé sur v1';
  assert (select statut from public.music_orders where reference = ref) = 'BRIEF_À_VALIDER', 'pas de validation';
  r := public.music_brief_charger(j);
  assert r->>'etat' = 'correction_demandee' and r->>'correction' = 'Le prénom complet est Fatou Binetou.' and r->>'valide_le' is null;
  assert (public.music_brief_corriger(j, 1, 'Encore'))->>'error' = 'CORRECTION_DEJA_DEMANDEE', 'une seule correction par version';
  assert (public.music_brief_valider(j, 1, 'brief-v0'))->>'error' = 'CORRECTION_DEJA_DEMANDEE', 'validation impossible après correction demandée';
  assert (public.music_admin_brief_envoyer(ref, pg_temp.h('JetonLot3_Interdit')))->>'error' = 'CORRECTION_EN_ATTENTE', 'réenvoi sans nouvelle version refusé';
  perform pg_temp.ok('correction : feedback + date + version 1 enregistrés (courant et historique), aucune validation, v1 ni revalidable ni réenvoyable');
end $$;

-- 8. Nouvelle version : incrément, historique, ancienne version non validable
do $$
declare r json; ref text := (select val from t_ctx where cle = 'ref'); s json;
begin
  r := public.music_admin_brief_enregistrer(ref, pg_temp.brief('Les dimanches au marché de Sandaga avec Fatou Binetou.') || '{"destinataire": "Fatou Binetou"}');
  assert (r->>'version')::int = 2 and (r->>'envoye')::boolean = false, 'v2 : ' || r::text;
  assert (select version = 2 and sent_at is null and client_feedback is null and correction_requested_at is null from public.music_briefs b join public.music_orders o on o.id = b.order_id where o.reference = ref), 'v2 : état courant remis à zéro';
  -- l'ancien lien voit « en préparation » et ne peut plus rien valider
  assert (public.music_brief_charger(pg_temp.h('JetonLot3_B1bis')))->>'etat' = 'en_preparation';
  assert (public.music_brief_valider(pg_temp.h('JetonLot3_B1bis'), 1, 'brief-v0'))->>'error' = 'VERSION_PERIMEE', 'v1 non validable pendant la préparation de v2';
  assert (public.music_brief_valider(pg_temp.h('JetonLot3_B1bis'), 2, 'brief-v0'))->>'error' = 'VERSION_PERIMEE', 'v2 non envoyée non validable';
  r := public.music_admin_brief_envoyer(ref, pg_temp.h('JetonLot3_B2'));
  assert (r->>'version')::int = 2;
  assert (public.music_brief_charger(pg_temp.h('JetonLot3_B1bis')))->>'error' = 'LIEN_INVALIDE', 'lien de v1 invalidé';
  r := public.music_brief_charger(pg_temp.h('JetonLot3_B2'));
  assert r->>'etat' = 'a_valider' and (r->>'version')::int = 2 and r->'contenu'->>'destinataire' = 'Fatou Binetou' and r->>'correction' is null, 'v2 côté client : ' || r::text;
  assert (public.music_brief_valider(pg_temp.h('JetonLot3_B2'), 1, 'brief-v0'))->>'error' = 'VERSION_PERIMEE', 'ancienne version (1) impossible à valider par erreur';
  s := public.music_admin_brief_suivi(ref);
  assert json_array_length(s->'versions') = 2 and (s->'versions'->0->>'correction') = 'Le prénom complet est Fatou Binetou.' and (s->'versions'->1->>'correction') is null, 'suivi : ' || s::text;
  perform pg_temp.ok('nouvelle version : version 2, état courant réinitialisé, historique (v1 + sa correction) conservé, v1 jamais validable, ancien lien invalidé');
end $$;

-- 9. Validation : consentement obligatoire, puis validation définitive
do $$
declare r json; ref text := (select val from t_ctx where cle = 'ref'); j text := pg_temp.h('JetonLot3_B2'); b record;
begin
  assert (public.music_brief_valider(j, 2, null))->>'error' = 'CONSENTEMENT_REQUIS', 'sans consentement';
  assert (public.music_brief_valider(j, 2, 'Pas Valide!'))->>'error' = 'CONSENTEMENT_REQUIS';
  assert (select validated_at is null from public.music_briefs bb join public.music_orders o on o.id = bb.order_id where o.reference = ref), 'aucun effet';
  -- aucun délai démarré avant validated_at
  assert (select validated_at is null from public.music_briefs bb join public.music_orders o on o.id = bb.order_id where o.reference = ref)
     and (select statut from public.music_orders where reference = ref) = 'BRIEF_À_VALIDER', 'délai non démarré';
  r := public.music_brief_valider(j, 2, 'brief-v0-2026-10');
  assert r->>'statut' = 'BRIEF_VALIDÉ' and (r->>'version')::int = 2 and r->>'valide_le' is not null, 'validation : ' || r::text;
  select bb.* into b from public.music_briefs bb join public.music_orders o on o.id = bb.order_id where o.reference = ref;
  assert b.validated_at is not null and b.validated_version = 2 and b.validation_consent_version = 'brief-v0-2026-10', 'version validée et consentement';
  assert b.validated_at > b.sent_at and b.validated_at > (select submitted_at from public.music_questionnaires q join public.music_orders o on o.id = q.order_id where o.reference = ref)
     and b.validated_at > (select paye_le from public.music_orders where reference = ref), 'validated_at postérieur au paiement, au questionnaire et à l''envoi';
  assert (select statut from public.music_orders where reference = ref) = 'BRIEF_VALIDÉ';
  assert (select validated_at is not null from public.music_brief_versions v join public.music_orders o on o.id = v.order_id where o.reference = ref and v.version = 2), 'historique : v2 validée';
  assert (select validated_at is null from public.music_brief_versions v join public.music_orders o on o.id = v.order_id where o.reference = ref and v.version = 1), 'historique : v1 non validée';
  perform pg_temp.ok('validation : consentement obligatoire ; validated_at, version 2 exacte, version de consentement ; commande BRIEF_VALIDÉ ; v1 reste non validée');
end $$;

-- 10. Verrouillage après validation
do $$
declare r json; ref text := (select val from t_ctx where cle = 'ref'); j text := pg_temp.h('JetonLot3_B2'); avant text;
begin
  select contenu::text into avant from public.music_briefs b join public.music_orders o on o.id = b.order_id where o.reference = ref;
  assert (public.music_brief_valider(j, 2, 'brief-v0-2026-10'))->>'error' = 'DEJA_VALIDE', 'deuxième validation';
  assert (public.music_brief_corriger(j, 2, 'Un nouveau souvenir'))->>'error' = 'DEJA_VALIDE', 'correction après validation';
  assert (public.music_admin_brief_enregistrer(ref, pg_temp.brief('Modifié')))->>'error' = 'BRIEF_DEJA_VALIDE', 'modification admin après validation';
  assert (public.music_admin_brief_envoyer(ref, pg_temp.h('JetonLot3_Apres')))->>'error' = 'BRIEF_DEJA_VALIDE', 'réenvoi après validation';
  assert (select contenu::text from public.music_briefs b join public.music_orders o on o.id = b.order_id where o.reference = ref) = avant, 'contenu inchangé';
  r := public.music_brief_charger(j);
  assert r->>'etat' = 'valide' and (r->>'version')::int = 2 and r->>'valide_le' is not null, 'lecture seule après validation';
  begin
    update public.music_briefs b set validated_version = 1 from public.music_orders o where o.id = b.order_id and o.reference = ref;
    raise exception 'version validée incohérente acceptée';
  exception when check_violation then null; end;
  perform pg_temp.ok('verrouillage : 2e validation, correction, modification et réenvoi refusés ; contenu inchangé ; lecture seule ; version validée incohérente impossible (contrainte)');
end $$;

-- 11. Questionnaire (lot 2) toujours verrouillé pendant tout le cycle du brief
do $$
declare ref text := (select val from t_ctx where cle = 'ref');
begin
  assert (public.music_questionnaire_brouillon(pg_temp.h('JetonLot3_B2'), '{}'))->>'error' = 'DEJA_ENVOYE', 'questionnaire non modifiable';
  assert (public.music_questionnaire_charger(pg_temp.h('JetonLot3_B2')))->>'envoye_le' is not null, 'questionnaire lisible';
  perform pg_temp.ok('questionnaire du lot 2 toujours en lecture seule après envoi du brief et validation');
end $$;

select n, 'PASS  ' || nom as resultat from t_resultats order by n;
