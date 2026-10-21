-- PRECHECK Music V0 — LECTURE SEULE. Attendu avant 020 : aucun objet music*, 019 identique au fichier,
-- et empreinte de la liste des tables public notée pour comparaison après 022.
select json_build_object(
  'base', current_database(), 'role', current_user, 'postgres', current_setting('server_version'),
  'registre_migrations_present', to_regclass('supabase_migrations.schema_migrations') is not null,
  'md5_corps_019', (select md5(p.prosrc) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'mfr_relancer_analyse_apres_echec'),
  'objets_music', (select count(*) from pg_class where relname ilike 'music%') + (select count(*) from pg_proc where proname ilike 'music%') + (select count(*) from pg_type where typname ilike '%music%') + (select count(*) from pg_constraint where conname ilike 'music%'),
  'tables_public_nb', (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'),
  'tables_public_hors_music_md5', (select md5(string_agg(relname, ',' order by relname)) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname not like 'music%'),
  'fonctions_public_hors_music_md5', (select md5(string_agg(p.oid::regprocedure::text || ':' || md5(p.prosrc), ',' order by p.oid::regprocedure::text)) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname not like 'music%'),
  'policies_hors_music_nb', (select count(*) from pg_policies where schemaname = 'public' and tablename not like 'music%'),
  'fk_vers_auth_users_nb', (select count(*) from pg_constraint where contype = 'f' and confrelid = 'auth.users'::regclass)
) as precheck;
