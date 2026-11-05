-- ============================================================
-- Imitation MINIMALE de Supabase (auth.uid()) pour test d'intégration
-- MFR/testeurs sur base PostgreSQL JETABLE et locale. NE JAMAIS
-- exécuter sur Supabase. Étend scripts/music-v0/supabase-stub.sql
-- (rôles anon/authenticated/service_role + schéma auth + auth.users,
-- réutilisés tels quels) avec la seule pièce manquante pour ce test :
-- `auth.uid()`, lisant `request.jwt.claim.sub` — exactement la même
-- simulation d'identité déjà utilisée par tous les fichiers
-- `*.test.sql` MFR existants (`set_config('request.jwt.claim.sub', ...)`).
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
