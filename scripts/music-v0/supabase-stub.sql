-- ============================================================
-- Imitation MINIMALE de Supabase pour tester la migration 020 sur une
-- base PostgreSQL JETABLE et locale. NE JAMAIS exécuter sur Supabase.
-- ============================================================
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid());
grant usage on schema public to anon, authenticated, service_role;
-- Privilèges par défaut équivalents à ceux de Supabase : tout nouvel objet
-- de `public` est accessible à anon, authenticated et service_role, sauf
-- révocation explicite par la migration.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
