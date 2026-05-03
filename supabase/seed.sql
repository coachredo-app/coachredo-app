-- ============================================================
-- PLAN B RENTABLE — Seed de test
-- ============================================================
-- Codes d'accès pour test utilisateur réel (flow complet sans privilège admin)
-- À insérer manuellement dans Supabase Studio > SQL Editor

insert into public.access_codes (code, is_active) values
  ('PLANB-TEST-2026', true),
  ('PLANB-BETA-0001', true),
  ('PLANB-BETA-0002', true),
  ('PLANB-BETA-0003', true),
  ('PLANB-BETA-0004', true);

-- Pour donner accès manuellement à un utilisateur (admin uniquement) :
-- update public.book_access
-- set has_access = true, access_granted_at = now(), access_method = 'admin'
-- where user_id = 'UUID_DE_LUTILISATEUR';
