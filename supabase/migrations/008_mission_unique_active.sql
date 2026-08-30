-- ============================================================
-- PLAN B RENTABLE — Migration 008
-- Unicité d'une seule mission en_cours par utilisateur
-- ============================================================
-- Pattern identique à idx_bilan_sessions_one_active (migration 005).
-- Safe à rejouer : CREATE INDEX IF NOT EXISTS
-- Aucune donnée modifiée ou supprimée.
-- État production (2026-08-29) : 0 doublon en_cours confirmé.
-- ============================================================

create unique index if not exists idx_user_missions_one_active
  on public.user_missions (user_id)
  where statut = 'en_cours';
