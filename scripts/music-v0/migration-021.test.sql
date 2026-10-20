-- ============================================================
-- Tests de la migration 021 (Music V0 LOT 2 — questionnaire) — base JETABLE.
-- Prérequis : supabase-stub.sql, 020 puis 021 chargés.
-- Lancement : scripts/music-v0/run-db-test.sh (ne touche jamais Supabase).
-- Les jetons sont simulés : seule leur empreinte SHA-256 est transmise,
-- comme le fait le serveur Node (src/lib/music/jeton.ts).
-- ============================================================
\set ON_ERROR_STOP on
\pset footer off

create temporary table t_resultats (n serial, nom text);
create or replace function pg_temp.ok(p_nom text) returns void language sql as $$ insert into t_resultats(nom) values (p_nom) $$;
create or replace function pg_temp.h(p text) returns text language sql as $$ select encode(sha256(convert_to(p, 'UTF8')), 'hex') $$;

-- Helper : commande payée avec lien (jeton p_jeton), renvoie la référence
create or replace function pg_temp.commande_payee(p_jeton text) returns text language plpgsql as $$
declare ref text;
begin
  ref := (public.music_creer_commande(gen_random_uuid(), 'Awa', 'awa@exemple.sn', '+221771234567', 'Ma mère', null, 'Fatou', 'Anniversaire', null))->>'reference';
  perform public.music_confirmer_paiement(ref, 'WAVE-TEST', pg_temp.h(p_jeton));
  return ref;
end $$;

create temporary table t_ctx (cle text primary key, val text);

-- 1. Cloisonnement
do $$
declare ro text;
begin
  assert (select relrowsecurity from pg_class where oid = 'public.music_questionnaires'::regclass), 'RLS active';
  assert not exists (select 1 from pg_policies where tablename = 'music_questionnaires'), 'aucune policy';
  foreach ro in array array['anon', 'authenticated', 'service_role'] loop
    assert not has_table_privilege(ro, 'public.music_questionnaires', 'select'), ro || ' select';
    assert not has_table_privilege(ro, 'public.music_questionnaires', 'insert'), ro || ' insert';
    assert not has_table_privilege(ro, 'public.music_questionnaires', 'update'), ro || ' update';
  end loop;
  foreach ro in array array['anon', 'authenticated'] loop
    assert not has_function_privilege(ro, 'public.music_questionnaire_charger(text)', 'execute'), ro || ' charger';
    assert not has_function_privilege(ro, 'public.music_questionnaire_brouillon(text,jsonb)', 'execute'), ro || ' brouillon';
    assert not has_function_privilege(ro, 'public.music_questionnaire_envoyer(text,jsonb,text)', 'execute'), ro || ' envoyer';
  end loop;
  assert has_function_privilege('service_role', 'public.music_questionnaire_charger(text)', 'execute');
  assert has_function_privilege('service_role', 'public.music_questionnaire_envoyer(text,jsonb,text)', 'execute');
  assert (select bool_and(prosecdef) and bool_and(proconfig::text like '%search_path=public, pg_temp%')
            from pg_proc where proname like 'music_questionnaire_%'), 'SECURITY DEFINER + search_path fixé';
  perform pg_temp.ok('cloisonnement : RLS sans policy, aucun privilège de table (y compris service_role), RPC réservées à service_role');
end $$;

-- Accès effectif : anon refusé, service_role uniquement via RPC
set role anon;
do $$ begin
  begin perform public.music_questionnaire_charger(repeat('0', 64)); raise exception 'anon a exécuté charger';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.music_questionnaires; raise exception 'anon a lu la table';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
do $$ begin
  begin perform 1 from public.music_questionnaires; raise exception 'service_role a lu la table';
  exception when insufficient_privilege then null; end;
  assert (public.music_questionnaire_charger(repeat('0', 64)))->>'error' = 'LIEN_INVALIDE';
end $$;
reset role;
do $$ begin perform pg_temp.ok('accès effectif : anon refusé ; service_role sans accès direct à la table, uniquement via RPC'); end $$;

-- 2. Chargement : lien valide, préremplissage, aucune coordonnée, aucun brouillon créé
do $$
declare r json; ref text; j text := 'JetonLot2_Valide_____________________________';
begin
  ref := pg_temp.commande_payee(j);
  insert into t_ctx values ('ref', ref), ('jeton', j);
  r := public.music_questionnaire_charger(pg_temp.h(j));
  assert r->>'reference' = ref and r->>'beneficiaire_prenom' = 'Fatou' and r->>'relation' = 'Ma mère' and r->>'occasion' = 'Anniversaire', 'préremplissage : ' || r::text;
  assert (r->'responses')::text = '{}' and r->>'envoye_le' is null and r->>'brouillon_le' is null;
  assert r::text not like '%awa@exemple.sn%' and r::text not like '%771234567%', 'aucune coordonnée renvoyée';
  assert r->>'order_id' is null, 'aucun identifiant interne renvoyé';
  assert not exists (select 1 from public.music_questionnaires q join public.music_orders o on o.id = q.order_id where o.reference = ref), 'charger n''écrit rien';
  perform pg_temp.ok('chargement : préremplissage commande (prénom, relation, occasion), aucune coordonnée, aucun identifiant interne, aucune écriture');
end $$;

-- 3. Refus uniformes : mal formé, inconnu, jeton en clair, CRM seul, expiré, révoqué, non payée, annulée
do $$
declare ref text := (select val from t_ctx where cle = 'ref'); j text := (select val from t_ctx where cle = 'jeton');
        ref2 text; ref3 text;
begin
  assert (public.music_questionnaire_charger(null))->>'error' = 'LIEN_INVALIDE', 'null';
  assert (public.music_questionnaire_charger('zz'))->>'error' = 'LIEN_INVALIDE', 'mal formé';
  assert (public.music_questionnaire_charger(upper(pg_temp.h(j))))->>'error' = 'LIEN_INVALIDE', 'hex majuscule';
  assert (public.music_questionnaire_charger(repeat('a', 64)))->>'error' = 'LIEN_INVALIDE', 'inconnu';
  assert (public.music_questionnaire_charger(j))->>'error' = 'LIEN_INVALIDE', 'jeton en clair';
  assert (public.music_questionnaire_charger(ref))->>'error' = 'LIEN_INVALIDE', 'référence CRM seule';
  assert (public.music_questionnaire_brouillon(ref, '{}'))->>'error' = 'LIEN_INVALIDE', 'CRM seul : brouillon';
  assert (public.music_questionnaire_envoyer(ref, '{}', 'v0-test'))->>'error' = 'LIEN_INVALIDE', 'CRM seul : envoi';

  -- expiré
  ref2 := pg_temp.commande_payee('JetonLot2_Expire');
  update public.music_orders set jeton_questionnaire_expire_le = now() - interval '1 second' where reference = ref2;
  assert (public.music_questionnaire_charger(pg_temp.h('JetonLot2_Expire')))->>'error' = 'LIEN_INVALIDE', 'expiré : charger';
  assert (public.music_questionnaire_brouillon(pg_temp.h('JetonLot2_Expire'), '{}'))->>'error' = 'LIEN_INVALIDE', 'expiré : brouillon';
  assert (public.music_questionnaire_envoyer(pg_temp.h('JetonLot2_Expire'), '{}', 'v0-test'))->>'error' = 'LIEN_INVALIDE', 'expiré : envoi';

  -- révoqué
  ref3 := pg_temp.commande_payee('JetonLot2_Revoque');
  perform public.music_revoquer_lien_questionnaire(ref3);
  assert (public.music_questionnaire_charger(pg_temp.h('JetonLot2_Revoque')))->>'error' = 'LIEN_INVALIDE', 'révoqué';
  assert (public.music_questionnaire_brouillon(pg_temp.h('JetonLot2_Revoque'), '{}'))->>'error' = 'LIEN_INVALIDE', 'révoqué : brouillon';

  -- régénéré : ancien jeton refusé, nouveau accepté
  perform public.music_regenerer_lien_questionnaire(ref3, pg_temp.h('JetonLot2_Regenere'));
  assert (public.music_questionnaire_charger(pg_temp.h('JetonLot2_Revoque')))->>'error' = 'LIEN_INVALIDE', 'ancien jeton après régénération';
  assert (public.music_questionnaire_charger(pg_temp.h('JetonLot2_Regenere')))->>'reference' = ref3, 'nouveau jeton';

  -- annulée (après paiement)
  perform public.music_annuler_commande(ref3, 'test');
  assert (public.music_questionnaire_charger(pg_temp.h('JetonLot2_Regenere')))->>'error' = 'LIEN_INVALIDE', 'annulée';

  assert not exists (select 1 from public.music_questionnaires q join public.music_orders o on o.id = q.order_id where o.reference in (ref2, ref3)), 'aucune écriture sur refus';
  perform pg_temp.ok('refus uniformes LIEN_INVALIDE : mal formé, inconnu, jeton en clair, référence CRM seule, expiré, révoqué, ancien jeton régénéré, annulée — sans écriture');
end $$;

-- 3b. Commande non payée : la contrainte de 020 interdit tout jeton avant
-- paiement ; on vérifie EN PLUS le filtre des RPC en forçant l'incohérence
-- dans un sous-bloc annulé ensuite (aucune trace laissée).
do $$
declare ref text;
begin
  ref := (public.music_creer_commande(gen_random_uuid(), 'Awa', 'awa@exemple.sn', '+221771234567', 'Ma mère', null, 'Fatou', 'Anniversaire', null))->>'reference';
  perform public.music_confirmer_paiement(ref, null, pg_temp.h('JetonLot2_NonPayee'));
  begin
    alter table public.music_orders drop constraint music_orders_jeton_apres_paiement;
    alter table public.music_orders drop constraint music_orders_paye_coherent;
    update public.music_orders set statut = 'EN_ATTENTE_PAIEMENT', paye_le = null where reference = ref;
    assert (public.music_questionnaire_charger(pg_temp.h('JetonLot2_NonPayee')))->>'error' = 'LIEN_INVALIDE', 'non payée : charger';
    assert (public.music_questionnaire_brouillon(pg_temp.h('JetonLot2_NonPayee'), '{}'))->>'error' = 'LIEN_INVALIDE', 'non payée : brouillon';
    assert (public.music_questionnaire_envoyer(pg_temp.h('JetonLot2_NonPayee'), '{}', 'v0-test'))->>'error' = 'LIEN_INVALIDE', 'non payée : envoi';
    raise exception using errcode = 'MU001';
  exception when sqlstate 'MU001' then null;
  end;
  assert exists (select 1 from pg_constraint where conname = 'music_orders_jeton_apres_paiement'), 'contrainte restaurée';
  assert (select statut from public.music_orders where reference = ref) = 'PAYÉE', 'état restauré';
  perform pg_temp.ok('commande non payée refusée par les RPC (en plus de la contrainte « aucun jeton avant paiement »)');
end $$;

-- 4. Brouillon : création, remplacement, reprise
do $$
declare r json; j text := (select val from t_ctx where cle = 'jeton'); ref text := (select val from t_ctx where cle = 'ref'); n int;
begin
  r := public.music_questionnaire_brouillon(pg_temp.h(j), '{"etape_courante": 2, "etape2": {"souvenir_principal": "Le marché de Sandaga"}}');
  assert r->>'brouillon_le' is not null, 'création brouillon : ' || r::text;
  select count(*) into n from public.music_questionnaires q join public.music_orders o on o.id = q.order_id where o.reference = ref;
  assert n = 1, 'un brouillon créé';
  r := public.music_questionnaire_brouillon(pg_temp.h(j), '{"etape_courante": 3, "etape2": {"souvenir_principal": "Le marché de Sandaga, le samedi"}}');
  select count(*) into n from public.music_questionnaires q join public.music_orders o on o.id = q.order_id where o.reference = ref;
  assert n = 1, 'toujours un seul brouillon (remplacé)';
  r := public.music_questionnaire_charger(pg_temp.h(j));
  assert r->'responses'->'etape2'->>'souvenir_principal' = 'Le marché de Sandaga, le samedi' and (r->'responses'->>'etape_courante')::int = 3, 'reprise : ' || r::text;
  assert r->>'brouillon_le' is not null and r->>'envoye_le' is null;
  assert (select statut from public.music_orders where reference = ref) = 'PAYÉE', 'le brouillon ne change pas le statut';
  perform pg_temp.ok('brouillon : créé au premier enregistrement, remplacé ensuite (1 ligne), repris au rechargement, statut PAYÉE inchangé');
end $$;

-- 5. Défense en profondeur : forme et taille
do $$
declare j text := (select val from t_ctx where cle = 'jeton');
begin
  assert (public.music_questionnaire_brouillon(pg_temp.h(j), '[1,2]'))->>'error' = 'DONNEES_INVALIDES', 'tableau refusé';
  assert (public.music_questionnaire_brouillon(pg_temp.h(j), '"texte"'))->>'error' = 'DONNEES_INVALIDES', 'scalaire refusé';
  assert (public.music_questionnaire_brouillon(pg_temp.h(j), null))->>'error' = 'DONNEES_INVALIDES', 'null refusé';
  assert (public.music_questionnaire_brouillon(pg_temp.h(j), jsonb_build_object('x', repeat('a', 33000))))->>'error' = 'DONNEES_INVALIDES', 'taille > 32 Ko refusée';
  assert (public.music_questionnaire_charger(pg_temp.h(j)))->'responses'->'etape2'->>'souvenir_principal' = 'Le marché de Sandaga, le samedi', 'brouillon intact après refus';
  begin
    update public.music_questionnaires set form_version = 'v1';
    raise exception 'form_version autre que v0 accepté';
  exception when check_violation then null; end;
  perform pg_temp.ok('défense base : réponses non-objet, nulles ou > 32 Ko refusées sans effet ; form_version = v0 imposé');
end $$;

-- 6. Envoi : consentement obligatoire
do $$
declare j text := (select val from t_ctx where cle = 'jeton'); ref text := (select val from t_ctx where cle = 'ref'); r json;
begin
  r := public.music_questionnaire_envoyer(pg_temp.h(j), '{"etape_courante": 8}', null);
  assert r->>'error' = 'CONSENTEMENT_REQUIS', 'consentement absent : ' || r::text;
  r := public.music_questionnaire_envoyer(pg_temp.h(j), '{"etape_courante": 8}', 'Version Invalide!');
  assert r->>'error' = 'CONSENTEMENT_REQUIS', 'version de consentement mal formée';
  assert (select statut from public.music_orders where reference = ref) = 'PAYÉE';
  assert (select submitted_at is null and consent_at is null from public.music_questionnaires q join public.music_orders o on o.id = q.order_id where o.reference = ref);
  begin
    update public.music_questionnaires q set submitted_at = now() from public.music_orders o where o.id = q.order_id and o.reference = ref;
    raise exception 'envoi sans consentement accepté par la table';
  exception when check_violation then null; end;
  perform pg_temp.ok('envoi sans consentement refusé (RPC et contrainte de table), sans effet');
end $$;

-- 7. Envoi définitif : submitted_at, consentement, statut QUESTIONNAIRE_REÇU
do $$
declare j text := (select val from t_ctx where cle = 'jeton'); ref text := (select val from t_ctx where cle = 'ref'); r json; q record;
begin
  r := public.music_questionnaire_envoyer(pg_temp.h(j), '{"etape_courante": 8, "etape2": {"souvenir_principal": "Version finale"}}', 'v0-2026-10');
  assert r->>'statut' = 'QUESTIONNAIRE_REÇU' and r->>'envoye_le' is not null, 'envoi : ' || r::text;
  select q2.* into q from public.music_questionnaires q2 join public.music_orders o on o.id = q2.order_id where o.reference = ref;
  assert q.submitted_at is not null and q.consent_at is not null and q.consent_version = 'v0-2026-10', 'horodatages et version de consentement';
  assert q.responses->'etape2'->>'souvenir_principal' = 'Version finale', 'réponses finales enregistrées';
  assert q.form_version = 'v0';
  assert (select statut from public.music_orders where reference = ref) = 'QUESTIONNAIRE_REÇU', 'statut commande';
  perform pg_temp.ok('envoi définitif : réponses finales, submitted_at, consent_at, consent_version, commande → QUESTIONNAIRE_REÇU');
end $$;

-- 8. Verrouillage après envoi : aucune écriture, lecture possible
do $$
declare j text := (select val from t_ctx where cle = 'jeton'); ref text := (select val from t_ctx where cle = 'ref'); r json; avant text;
begin
  select q.responses::text into avant from public.music_questionnaires q join public.music_orders o on o.id = q.order_id where o.reference = ref;
  assert (public.music_questionnaire_brouillon(pg_temp.h(j), '{"etape2": {"souvenir_principal": "modifié"}}'))->>'error' = 'DEJA_ENVOYE', 'brouillon après envoi';
  assert (public.music_questionnaire_envoyer(pg_temp.h(j), '{"etape2": {"souvenir_principal": "modifié"}}', 'v0-2026-10'))->>'error' = 'DEJA_ENVOYE', 'second envoi';
  assert (select q.responses::text from public.music_questionnaires q join public.music_orders o on o.id = q.order_id where o.reference = ref) = avant, 'réponses inchangées';
  r := public.music_questionnaire_charger(pg_temp.h(j));
  assert r->>'envoye_le' is not null and r->'responses'->'etape2'->>'souvenir_principal' = 'Version finale', 'lecture après envoi : ' || r::text;
  -- régénération du lien après envoi : lecture seule toujours, écriture toujours refusée
  perform public.music_regenerer_lien_questionnaire(ref, pg_temp.h('JetonLot2_ApresEnvoi'));
  assert (public.music_questionnaire_charger(pg_temp.h('JetonLot2_ApresEnvoi')))->>'envoye_le' is not null, 'nouveau lien : lecture';
  assert (public.music_questionnaire_brouillon(pg_temp.h('JetonLot2_ApresEnvoi'), '{}'))->>'error' = 'DEJA_ENVOYE', 'nouveau lien : écriture refusée';
  assert (public.music_questionnaire_charger(pg_temp.h(j)))->>'error' = 'LIEN_INVALIDE', 'ancien lien invalide';
  perform pg_temp.ok('verrouillage : brouillon et second envoi refusés (DEJA_ENVOYE), réponses inchangées, lecture seule possible (y compris après régénération du lien)');
end $$;

select n, 'PASS  ' || nom as resultat from t_resultats order by n;
