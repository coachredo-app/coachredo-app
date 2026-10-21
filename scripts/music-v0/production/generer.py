# Génère les contrôles post-migration (lecture seule) à partir d'une base locale jetable.
# Les entrées NOT NULL de pg_constraint (contype 'n', propres à PostgreSQL 18) sont ignorées :
# la production est en 17 ; le caractère NOT NULL reste vérifié par la section « colonnes ».
import json, subprocess, sys
PSQL = sys.argv[1:]  # commande psql locale (base JETABLE construite par valider.sh — jamais Supabase)
OBJ = {
  '020': {'tables': ['music_orders', 'music_order_contacts'], 'sequences': ['music_order_ref_seq'],
          'fonctions': ['music_creer_commande', 'music_confirmer_paiement', 'music_regenerer_lien_questionnaire', 'music_revoquer_lien_questionnaire', 'music_resoudre_jeton_questionnaire', 'music_annuler_commande']},
  '021': {'tables': ['music_questionnaires'], 'sequences': [],
          'fonctions': ['music_questionnaire_charger', 'music_questionnaire_brouillon', 'music_questionnaire_envoyer']},
  '022': {'tables': ['music_briefs', 'music_brief_versions'], 'sequences': [],
          'fonctions': ['music_brief_contenu_erreur', 'music_admin_questionnaire', 'music_admin_brief_enregistrer', 'music_admin_brief_envoyer', 'music_admin_brief_suivi', 'music_brief_charger', 'music_brief_corriger', 'music_brief_valider']},
}
def arr(xs): return "array[" + ",".join("'" + x + "'" for x in xs) + "]::text[]"
def empreinte(o):
  T, Q, F = arr(o['tables']), arr(o['sequences'] or ['__aucune__']), arr(o['fonctions'])
  return f"""
    select jsonb_build_object(
      'tables_presentes', (select coalesce(jsonb_agg(relname order by relname), '[]') from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname = any({T})),
      'proprietaires', (select coalesce(jsonb_object_agg(relname, pg_get_userbyid(relowner)), '{{}}') from pg_class where relnamespace = 'public'::regnamespace and relname = any({T} || {Q})),
      'colonnes', (select coalesce(jsonb_object_agg(c.relname, (select jsonb_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod) || ':' || a.attnotnull::text order by a.attnum) from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped)), '{{}}')
                   from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname = any({T})),
      'contraintes', (select coalesce(jsonb_object_agg(c.relname, (select jsonb_agg(k.conname || ':' || k.contype::text || case when k.contype = 'f' then ':' || k.confrelid::regclass::text || ':ondelete=' || k.confdeltype::text else '' end order by k.conname) from pg_constraint k where k.conrelid = c.oid and k.contype <> 'n')), '{{}}')
                      from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname = any({T})),
      'index', (select coalesce(jsonb_object_agg(c.relname, (select coalesce(jsonb_agg(i.indexrelid::regclass::text || ':unique=' || i.indisunique::text order by i.indexrelid::regclass::text), '[]') from pg_index i where i.indrelid = c.oid)), '{{}}')
                from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname = any({T})),
      'rls', (select coalesce(jsonb_object_agg(relname, relrowsecurity), '{{}}') from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname = any({T})),
      'policies', (select count(*) from pg_policies where schemaname = 'public' and tablename = any({T})),
      'triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where not t.tgisinternal and c.relnamespace = 'public'::regnamespace and c.relname = any({T})),
      'privileges_hors_proprietaire', (select coalesce(jsonb_object_agg(c.relname, (select coalesce(jsonb_agg(distinct case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end || ':' || x.privilege_type), '[]') from aclexplode(c.relacl) x where x.grantee <> c.relowner)), '{{}}')
                                       from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname = any({T} || {Q})),
      'sequences', (select coalesce(jsonb_object_agg(s.sequencename, jsonb_build_object('type', s.data_type::text, 'debut', s.start_value, 'min', s.min_value, 'max', s.max_value, 'pas', s.increment_by, 'cycle', s.cycle)), '{{}}') from pg_sequences s where s.schemaname = 'public' and s.sequencename = any({Q})),
      'fonctions', (select coalesce(jsonb_object_agg(p.oid::regprocedure::text, jsonb_build_object(
                       'md5_corps', md5(p.prosrc), 'security_definer', p.prosecdef, 'config', to_jsonb(p.proconfig), 'volatilite', p.provolatile::text,
                       'retour', format_type(p.prorettype, null), 'proprietaire', pg_get_userbyid(p.proowner),
                       'execute', (select coalesce(jsonb_agg(case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end order by case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end), '[]') from aclexplode(p.proacl) x where x.privilege_type = 'EXECUTE' and x.grantee <> p.proowner))), '{{}}')
                    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any({F}))
    )"""
def requete(sql):
  out = subprocess.run(PSQL + ['-t', '-A', '-c', sql], capture_output=True, text=True, check=True).stdout.strip()
  return json.loads(out)
for m, o in OBJ.items():
  attendu = requete(empreinte(o))
  T = arr(o['tables'])
  extras = {
    '020': """,
      'tables_vides', (select count(*) = 0 from public.music_orders) and (select count(*) = 0 from public.music_order_contacts),
      'sequence_intacte', (select last_value = 5 and not is_called from public.music_order_ref_seq),
      'sequence_rattachee_a_reference', (select d.refobjid = 'public.music_orders'::regclass from pg_depend d where d.objid = 'public.music_order_ref_seq'::regclass and d.deptype = 'a'),
      'statuts_futurs_prevus', (select pg_get_constraintdef(oid) like '%QUESTIONNAIRE_REÇU%' and pg_get_constraintdef(oid) like '%BRIEF_À_VALIDER%' and pg_get_constraintdef(oid) like '%BRIEF_VALIDÉ%' from pg_constraint where conname = 'music_orders_statut_valide'),
      'user_id_nullable_restrict', (select not a.attnotnull from pg_attribute a where a.attrelid = 'public.music_orders'::regclass and a.attname = 'user_id') and exists (select 1 from pg_constraint where conrelid = 'public.music_orders'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype = 'r'),
      'sonde_lien_inconnu', public.music_resoudre_jeton_questionnaire(repeat('0', 64))->>'error' = 'LIEN_INVALIDE',
      'sonde_crm_seul_refuse', public.music_resoudre_jeton_questionnaire('CRM-00005')->>'error' = 'LIEN_INVALIDE'""",
    '021': """,
      'table_vide', (select count(*) = 0 from public.music_questionnaires),
      'fk_commande_cascade', exists (select 1 from pg_constraint where conrelid = 'public.music_questionnaires'::regclass and contype = 'f' and confrelid = 'public.music_orders'::regclass and confdeltype = 'c'),
      'envoi_exige_consentement', exists (select 1 from pg_constraint where conname = 'music_questionnaires_envoi_avec_consentement'),
      'sonde_charger_lien_inconnu', public.music_questionnaire_charger(repeat('0', 64))->>'error' = 'LIEN_INVALIDE',
      'sonde_charger_crm_seul', public.music_questionnaire_charger('CRM-00005')->>'error' = 'LIEN_INVALIDE',
      'objets_020_intacts', to_regclass('public.music_orders') is not null and to_regclass('public.music_order_ref_seq') is not null""",
    '022': """,
      'tables_vides', (select count(*) = 0 from public.music_briefs) and (select count(*) = 0 from public.music_brief_versions),
      'validation_coherente', exists (select 1 from pg_constraint where conname = 'music_briefs_validation_coherente') and exists (select 1 from pg_constraint where conname = 'music_briefs_validation_complete'),
      'colonnes_validation', (select count(*) = 3 from pg_attribute where attrelid = 'public.music_briefs'::regclass and attname in ('validated_at', 'validated_version', 'validation_consent_version') and not attnotnull),
      'fonction_validation_interne_fermee', not has_function_privilege('service_role', 'public.music_brief_contenu_erreur(jsonb)', 'execute') and not has_function_privilege('anon', 'public.music_brief_contenu_erreur(jsonb)', 'execute'),
      'sonde_contenu_vide_refuse', public.music_brief_contenu_erreur('{}'::jsonb) = 'destinataire:requis',
      'sonde_brief_lien_inconnu', public.music_brief_charger(repeat('0', 64))->>'error' = 'LIEN_INVALIDE',
      'sonde_suivi_commande_inconnue', public.music_admin_brief_suivi('CRM-99999')->>'error' = 'COMMANDE_INTROUVABLE',
      'objets_020_021_intacts', to_regclass('public.music_orders') is not null and to_regclass('public.music_questionnaires') is not null""",
  }[m]
  att = json.dumps(attendu, ensure_ascii=False, sort_keys=True).replace("'", "''")
  sql = f"""-- POSTCHECK {m} — Music V0 — LECTURE SEULE (aucune écriture).
-- Généré depuis une base locale jetable construite avec les fichiers poussés
-- (HEAD 10369f828f2144cf2d4181a84cc561dfefa1aab6). Résultat attendu : "conforme": true.
with attendu as (select '{att}'::jsonb as e),
     reel as ({empreinte(o)} as r)
select jsonb_pretty(jsonb_build_object(
  'migration', '{m}',
  'conforme', (select r from reel) = (select e from attendu),
  'sections_differentes', (select coalesce(jsonb_agg(k), '[]') from jsonb_object_keys((select e from attendu)) k where (select e from attendu)->k is distinct from (select r from reel)->k){extras}
)) as postcheck_{m};
"""
  open(f'postcheck-{m}.sql', 'w', encoding='utf-8').write(sql)
  print(m, 'tables', o['tables'], 'fonctions', len(attendu['fonctions']), 'contraintes', sum(len(v) for v in attendu['contraintes'].values()))
