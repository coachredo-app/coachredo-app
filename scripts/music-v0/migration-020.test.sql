-- ============================================================
-- Tests de la migration 020 (Music V0 LOT 1) — base JETABLE uniquement.
-- Prérequis : supabase-stub.sql puis 020_music_v0_commandes.sql chargés.
-- Lancement : scripts/music-v0/run-db-test.sh (ne touche jamais Supabase).
-- Chaque bloc lève une exception (et arrête psql) si une assertion échoue.
-- ============================================================
\set ON_ERROR_STOP on
\pset footer off

create temporary table t_resultats (n serial, nom text);
create or replace function pg_temp.ok(p_nom text) returns void language sql as $$ insert into t_resultats(nom) values (p_nom) $$;

-- Helper : création d'une commande valide
create or replace function pg_temp.creer(p_cle uuid, p_date date default null) returns json language sql as $$
  select public.music_creer_commande(p_cle, 'Awa', 'Awa@Exemple.SN', '+221771234567', 'Mon père', null, 'Moussa', 'Fête des pères', p_date)
$$;

-- 1. Première référence = CRM-00005, format, statut initial
do $$
declare r json; o record;
begin
  r := pg_temp.creer('00000000-0000-4000-8000-000000000001');
  assert r->>'reference' = 'CRM-00005', 'première référence attendue CRM-00005, obtenu ' || r::text;
  assert (r->>'existante')::boolean = false;
  select * into o from public.music_orders where reference = 'CRM-00005';
  assert o.statut = 'EN_ATTENTE_PAIEMENT', 'statut initial';
  assert o.user_id is null, 'user_id nullable et vide';
  assert o.jeton_questionnaire_hash is null and o.jeton_questionnaire_expire_le is null, 'aucun jeton avant paiement';
  assert o.marche = 'SN' and o.montant_xof = 29900;
  perform pg_temp.ok('première référence CRM-00005, statut EN_ATTENTE_PAIEMENT, aucun jeton avant paiement');
end $$;

-- 2. Coordonnées séparées, email normalisé
do $$
declare c record;
begin
  select c2.* into c from public.music_order_contacts c2 join public.music_orders o on o.id = c2.order_id where o.reference = 'CRM-00005';
  assert c.email = 'awa@exemple.sn' and c.whatsapp = '+221771234567' and c.prenom = 'Awa';
  assert not exists (select 1 from information_schema.columns where table_name = 'music_orders' and column_name in ('email','whatsapp','prenom'));
  perform pg_temp.ok('coordonnées stockées séparément (music_order_contacts), email en minuscules');
end $$;

-- 3. Idempotence : même clé → même référence, une seule commande
do $$
declare r json; n int;
begin
  r := pg_temp.creer('00000000-0000-4000-8000-000000000001');
  assert r->>'reference' = 'CRM-00005' and (r->>'existante')::boolean, 'idempotence : ' || r::text;
  select count(*) into n from public.music_orders where cle_idempotence = '00000000-0000-4000-8000-000000000001';
  assert n = 1;
  r := pg_temp.creer('00000000-0000-4000-8000-000000000002');
  assert r->>'reference' = 'CRM-00006', 'clé différente → nouvelle référence : ' || r::text;
  perform pg_temp.ok('idempotence : même clé → même commande ; clé différente → CRM-00006');
end $$;

-- 4. Validation côté base (défense en profondeur)
do $$
declare r json; avant bigint; apres bigint;
begin
  select count(*) into avant from public.music_orders;
  r := public.music_creer_commande(gen_random_uuid(), 'Awa', 'pas-un-email', '+221771234567', 'Mon père', null, 'Moussa', 'Fête des pères', null);
  assert r->>'error' = 'DONNEES_INVALIDES', 'email invalide : ' || r::text;
  r := public.music_creer_commande(gen_random_uuid(), 'Awa', 'a@b.sn', '771234567', 'Mon père', null, 'Moussa', 'Fête des pères', null);
  assert r->>'error' = 'DONNEES_INVALIDES', 'whatsapp sans indicatif';
  r := public.music_creer_commande(gen_random_uuid(), 'Awa', 'a@b.sn', '+221771234567', 'Mon voisin', null, 'Moussa', 'Fête des pères', null);
  assert r->>'error' = 'DONNEES_INVALIDES', 'relation hors liste';
  r := public.music_creer_commande(gen_random_uuid(), 'Awa', 'a@b.sn', '+221771234567', 'Autre', null, 'Moussa', 'Fête des pères', null);
  assert r->>'error' = 'DONNEES_INVALIDES', 'Autre sans précision';
  r := public.music_creer_commande(gen_random_uuid(), 'Awa', 'a@b.sn', '+221771234567', 'Mon père', null, 'Moussa', 'Bar-mitsva', null);
  assert r->>'error' = 'DONNEES_INVALIDES', 'occasion hors liste';
  r := public.music_creer_commande(gen_random_uuid(), 'Awa', 'a@b.sn', '+221771234567', 'Mon père', null, repeat('x', 61), 'Fête des pères', null);
  assert r->>'error' = 'DONNEES_INVALIDES', 'prénom bénéficiaire trop long';
  r := public.music_creer_commande(gen_random_uuid(), 'Awa', 'a@b.sn', '+221771234567', 'Mon père', null, 'Moussa', 'Fête des pères', current_date - 5);
  assert r->>'error' = 'DATE_PASSEE', 'date passée';
  r := public.music_creer_commande(null, 'Awa', 'a@b.sn', '+221771234567', 'Mon père', null, 'Moussa', 'Fête des pères', null);
  assert r->>'error' = 'CLE_IDEMPOTENCE_MANQUANTE';
  select count(*) into apres from public.music_orders;
  assert avant = apres, 'aucune commande créée par des données invalides';
  r := public.music_creer_commande(gen_random_uuid(), 'Awa', 'a@b.sn', '+221771234567', 'Autre', 'Ma marraine', 'Moussa', 'Autre', current_date + 30);
  assert r->>'reference' ~ '^CRM-[0-9]{5}$', 'Autre avec précision + date future acceptés';
  perform pg_temp.ok('validation base : email, WhatsApp, relation, Autre, occasion, longueurs, date passée, clé manquante');
end $$;

-- 5. Format et unicité de la référence, séquence jamais réutilisée
do $$
declare r json; ref_avant text; r2 json;
begin
  begin
    insert into public.music_orders (reference, cle_idempotence, relation, beneficiaire_prenom, occasion)
    values ('CRM-00003', gen_random_uuid(), 'Mon père', 'X', 'Hommage');
    raise exception 'référence historique CRM-00003 acceptée à tort';
  exception when check_violation then null; end;
  begin
    insert into public.music_orders (reference, cle_idempotence, relation, beneficiaire_prenom, occasion)
    values ('CRM-5', gen_random_uuid(), 'Mon père', 'X', 'Hommage');
    raise exception 'format invalide accepté à tort';
  exception when check_violation then null; end;
  -- Une tentative invalide consomme un numéro : il n'est jamais réattribué.
  select max(reference) into ref_avant from public.music_orders;
  r := public.music_creer_commande(gen_random_uuid(), 'Awa', 'invalide', '+221771234567', 'Mon père', null, 'Moussa', 'Fête des pères', null);
  r2 := pg_temp.creer(gen_random_uuid());
  assert r2->>'reference' > ref_avant, 'nouvelle référence strictement croissante';
  assert not exists (select reference from public.music_orders group by reference having count(*) > 1);
  perform pg_temp.ok('référence : format ^CRM-[0-9]{5}$, ≥ 00005, unique, jamais réutilisée (séquence)');
end $$;

-- 6. Cloisonnement : aucun accès direct pour anon / authenticated
do $$
declare roles text[] := array['anon','authenticated']; ro text;
begin
  foreach ro in array roles loop
    assert not has_table_privilege(ro, 'public.music_orders', 'select'), ro || ' select orders';
    assert not has_table_privilege(ro, 'public.music_orders', 'insert'), ro || ' insert orders';
    assert not has_table_privilege(ro, 'public.music_order_contacts', 'select'), ro || ' select contacts';
    assert not has_function_privilege(ro, 'public.music_creer_commande(uuid,text,text,text,text,text,text,text,date)', 'execute'), ro || ' creer';
    assert not has_function_privilege(ro, 'public.music_confirmer_paiement(text,text,text)', 'execute'), ro || ' confirmer';
    assert not has_function_privilege(ro, 'public.music_resoudre_jeton_questionnaire(text)', 'execute'), ro || ' resoudre';
    assert not has_function_privilege(ro, 'public.music_regenerer_lien_questionnaire(text,text)', 'execute'), ro || ' regenerer';
      end loop;
  assert has_function_privilege('service_role', 'public.music_creer_commande(uuid,text,text,text,text,text,text,text,date)', 'execute');
  assert has_function_privilege('service_role', 'public.music_confirmer_paiement(text,text,text)', 'execute');
  assert not has_table_privilege('service_role', 'public.music_orders', 'select'), 'service_role sans accès direct aux tables';
  assert (select relrowsecurity from pg_class where oid = 'public.music_orders'::regclass);
  assert (select relrowsecurity from pg_class where oid = 'public.music_order_contacts'::regclass);
  assert not exists (select 1 from pg_policies where tablename in ('music_orders','music_order_contacts'));
  assert (select bool_and(prosecdef) from pg_proc where proname in ('music_creer_commande','music_confirmer_paiement','music_regenerer_lien_questionnaire','music_revoquer_lien_questionnaire','music_resoudre_jeton_questionnaire','music_annuler_commande'));
  assert (select bool_and(proconfig::text like '%search_path=public, pg_temp%') from pg_proc where proname like 'music\_%');
  perform pg_temp.ok('cloisonnement : RLS sans policy, aucun privilège anon/authenticated, RPC SECURITY DEFINER réservées à service_role, search_path fixé');
end $$;

-- 6b. Accès réel refusé en tant que anon (et autorisé en tant que service_role via RPC)
set role anon;
do $$ begin
  begin perform 1 from public.music_orders; raise exception 'anon lit music_orders';
  exception when insufficient_privilege then null; end;
  begin perform public.music_creer_commande(gen_random_uuid(), 'A', 'a@b.sn', '+221771234567', 'Mon père', null, 'M', 'Hommage', null); raise exception 'anon exécute la RPC';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
do $$ declare r json; begin
  r := public.music_creer_commande(gen_random_uuid(), 'Awa', 'a@b.sn', '+221771234567', 'Mon père', null, 'Moussa', 'Hommage', null);
  assert r->>'reference' ~ '^CRM-', 'service_role crée via la RPC';
  begin perform 1 from public.music_orders; raise exception 'service_role lit directement la table';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.ok('accès effectif : anon refusé (table et RPC) ; service_role uniquement via RPC');

-- 7. Confirmation du paiement Wave : statut, empreinte seule, 60 jours
-- Le jeton est généré côté serveur Node (admin.mjs) ; la base ne reçoit que
-- son empreinte. Ici, des jetons de test sont simulés pour calculer l'empreinte.
create temporary table t_lien (reference text, jeton text);
create or replace function pg_temp.h(p text) returns text language sql as $$ select encode(sha256(convert_to(p, 'UTF8')), 'hex') $$;
do $$
declare r json; o record; j text := 'JetonDeTestNumero1_____________________abcd';
begin
  r := public.music_confirmer_paiement('CRM-00005', '  WAVE-TX-123  ', pg_temp.h(j));
  assert r->>'statut' = 'PAYÉE', 'confirmation : ' || r::text;
  assert r->>'lien_questionnaire' is null and r::text not like '%#t=%', 'la base ne fabrique ni ne renvoie aucun lien/jeton';
  insert into t_lien values ('CRM-00005', j);
  select * into o from public.music_orders where reference = 'CRM-00005';
  assert o.statut = 'PAYÉE' and o.paye_le is not null and o.ref_wave = 'WAVE-TX-123';
  assert o.jeton_questionnaire_hash = pg_temp.h(j), 'seule l''empreinte fournie est stockée';
  assert strpos(row_to_json(o)::text, j) = 0, 'le jeton en clair n''est stocké nulle part';
  assert abs(extract(epoch from (o.jeton_questionnaire_expire_le - (now() + interval '60 days')))) < 5, 'expiration à 60 jours';
  assert not exists (select 1 from pg_proc where proname in ('music_generer_jeton', 'music_empreinte_jeton')), 'aucune génération de jeton côté base';
  perform pg_temp.ok('paiement confirmé : PAYÉE, horodatage, réf. Wave nettoyée, seule l''empreinte stockée, expiration 60 jours, aucune génération côté base');
end $$;

-- 7b. Empreinte invalide ou déjà utilisée : refusée
do $$
declare r json; ref text;
begin
  ref := (pg_temp.creer(gen_random_uuid()))->>'reference';
  r := public.music_confirmer_paiement(ref, null, 'pas-une-empreinte');
  assert r->>'error' = 'EMPREINTE_INVALIDE', r::text;
  r := public.music_confirmer_paiement(ref, null, null);
  assert r->>'error' = 'EMPREINTE_INVALIDE';
  r := public.music_confirmer_paiement(ref, null, upper(repeat('ab', 32)));
  assert r->>'error' = 'EMPREINTE_INVALIDE', 'hexadécimal minuscule uniquement';
  r := public.music_confirmer_paiement(ref, null, pg_temp.h('JetonDeTestNumero1_____________________abcd'));
  assert r->>'error' = 'EMPREINTE_DEJA_UTILISEE', 'une empreinte ne peut ouvrir deux commandes : ' || r::text;
  assert (select statut = 'EN_ATTENTE_PAIEMENT' from public.music_orders where reference = ref), 'refus sans effet';
  perform pg_temp.ok('empreinte mal formée ou déjà utilisée refusée, sans effet');
end $$;

-- 8. Impossible de confirmer deux fois ; commande inconnue
do $$
declare r json; h1 text; h2 text;
begin
  select jeton_questionnaire_hash into h1 from public.music_orders where reference = 'CRM-00005';
  r := public.music_confirmer_paiement('CRM-00005', 'AUTRE', pg_temp.h('AutreJeton'));
  assert r->>'error' = 'STATUT_INCOMPATIBLE', 'double confirmation : ' || r::text;
  select jeton_questionnaire_hash into h2 from public.music_orders where reference = 'CRM-00005';
  assert h1 = h2, 'la double confirmation ne change pas le lien';
  r := public.music_confirmer_paiement('CRM-99999', null, pg_temp.h('x'));
  assert r->>'error' = 'COMMANDE_INTROUVABLE';
  perform pg_temp.ok('double confirmation refusée (lien inchangé) ; commande inconnue refusée');
end $$;

-- 9. Résolution du lien : par empreinte uniquement, jamais par référence CRM
do $$
declare r json; j text;
begin
  select jeton into j from t_lien where reference = 'CRM-00005';
  r := public.music_resoudre_jeton_questionnaire(pg_temp.h(j));
  assert r->>'reference' = 'CRM-00005' and r->>'beneficiaire_prenom' = 'Moussa', 'résolution : ' || r::text;
  assert r->>'email' is null and r->>'whatsapp' is null, 'aucune coordonnée renvoyée';
  r := public.music_resoudre_jeton_questionnaire('CRM-00005');
  assert r->>'error' = 'LIEN_INVALIDE', 'la référence CRM n''ouvre rien';
  r := public.music_resoudre_jeton_questionnaire(j);
  assert r->>'error' = 'LIEN_INVALIDE', 'le jeton en clair (non haché) n''ouvre rien';
  r := public.music_resoudre_jeton_questionnaire(repeat('0', 64));
  assert r->>'error' = 'LIEN_INVALIDE', 'empreinte inconnue';
  perform pg_temp.ok('lien résolu uniquement par empreinte ; référence CRM et jeton brut refusés ; aucune coordonnée exposée');
end $$;

-- 10. Régénération : l'ancien lien est immédiatement invalide
do $$
declare r json; ancien text; nouveau text := 'JetonDeTestNumero2_____________________efgh';
begin
  select jeton into ancien from t_lien where reference = 'CRM-00005';
  r := public.music_regenerer_lien_questionnaire('CRM-00005', pg_temp.h(nouveau));
  assert r->>'reference' = 'CRM-00005' and r->>'expire_le' is not null, r::text;
  assert (public.music_resoudre_jeton_questionnaire(pg_temp.h(ancien)))->>'error' = 'LIEN_INVALIDE', 'ancien lien invalide';
  assert (public.music_resoudre_jeton_questionnaire(pg_temp.h(nouveau)))->>'reference' = 'CRM-00005', 'nouveau lien valide';
  assert (select abs(extract(epoch from (jeton_questionnaire_expire_le - (now() + interval '60 days')))) < 5 from public.music_orders where reference = 'CRM-00005'), 'nouveau délai de 60 jours';
  update t_lien set jeton = nouveau where reference = 'CRM-00005';
  r := public.music_regenerer_lien_questionnaire('CRM-00006', pg_temp.h('JetonPourCommandeNonPayee'));
  assert r->>'error' = 'STATUT_INCOMPATIBLE', 'pas de lien pour une commande non payée';
  r := public.music_regenerer_lien_questionnaire('CRM-00005', 'invalide');
  assert r->>'error' = 'EMPREINTE_INVALIDE';
  perform pg_temp.ok('régénération : nouveau lien valide (60 jours), ancien immédiatement invalide ; refusée avant paiement ; empreinte vérifiée');
end $$;

-- 11. Expiration
do $$
declare j text;
begin
  select jeton into j from t_lien where reference = 'CRM-00005';
  update public.music_orders set jeton_questionnaire_expire_le = now() - interval '1 second' where reference = 'CRM-00005';
  assert (public.music_resoudre_jeton_questionnaire(pg_temp.h(j)))->>'error' = 'LIEN_INVALIDE', 'lien expiré';
  update public.music_orders set jeton_questionnaire_expire_le = now() + interval '60 days' where reference = 'CRM-00005';
  perform pg_temp.ok('lien expiré refusé');
end $$;

-- 12. Révocation
do $$
declare r json; j text;
begin
  select jeton into j from t_lien where reference = 'CRM-00005';
  r := public.music_revoquer_lien_questionnaire('CRM-00005');
  assert (r->>'lien_revoque')::boolean;
  assert (public.music_resoudre_jeton_questionnaire(pg_temp.h(j)))->>'error' = 'LIEN_INVALIDE', 'lien révoqué';
  assert (select jeton_questionnaire_hash is null and jeton_questionnaire_expire_le is null from public.music_orders where reference = 'CRM-00005');
  perform pg_temp.ok('révocation : lien immédiatement invalide');
end $$;

-- 13. Annulation
do $$
declare r json; ref text;
begin
  ref := (pg_temp.creer(gen_random_uuid()))->>'reference';
  perform public.music_confirmer_paiement(ref, null, pg_temp.h('JetonAnnulation'));
  r := public.music_annuler_commande(ref, 'Demande client');
  assert r->>'statut' = 'ANNULÉE';
  assert (select statut = 'ANNULÉE' and annule_le is not null and jeton_questionnaire_hash is null from public.music_orders where reference = ref);
  r := public.music_confirmer_paiement(ref, null, pg_temp.h('JetonAnnulation2'));
  assert r->>'error' = 'STATUT_INCOMPATIBLE', 'pas de paiement sur commande annulée';
  r := public.music_regenerer_lien_questionnaire(ref, pg_temp.h('JetonAnnulation3'));
  assert r->>'error' = 'STATUT_INCOMPATIBLE', 'pas de lien sur commande annulée';
  perform pg_temp.ok('annulation : ANNULÉE, lien révoqué, plus de paiement ni de lien');
end $$;

-- 14. Garde-fou : aucun jeton sans paiement, même par écriture directe
do $$ begin
  begin
    update public.music_orders set jeton_questionnaire_hash = repeat('a', 64), jeton_questionnaire_expire_le = now() + interval '1 day'
     where reference = 'CRM-00006';
    raise exception 'jeton accepté sur commande non payée';
  exception when check_violation then null; end;
  perform pg_temp.ok('contrainte : aucun jeton possible avant paiement');
end $$;

-- 15. ON DELETE RESTRICT vers auth.users
do $$ declare u uuid := gen_random_uuid(); begin
  insert into auth.users(id) values (u);
  update public.music_orders set user_id = u where reference = 'CRM-00006';
  begin delete from auth.users where id = u; raise exception 'suppression en cascade/autorisée';
  exception when restrict_violation then null; end;
  update public.music_orders set user_id = null where reference = 'CRM-00006';
  perform pg_temp.ok('user_id nullable, FK auth.users ON DELETE RESTRICT');
end $$;

select n, 'PASS  ' || nom as resultat from t_resultats order by n;
