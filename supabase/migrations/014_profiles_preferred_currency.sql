-- ============================================================
-- PLAN B RENTABLE — Migration 014
-- Ajout de profiles.preferred_currency (devise préférée/par défaut)
-- ============================================================
-- GO QG (architecture pays/devise) : donnée de PROFIL distincte de
-- toute réponse MPD — « profil = devise préférée/par défaut, Q28 =
-- devise réelle de cette réponse » (ces deux responsabilités ne sont
-- jamais fusionnées). Additive, nullable, aucune donnée existante
-- modifiée — safe à rejouer (ADD COLUMN IF NOT EXISTS), suit le même
-- style que 004_coaching_tables.sql.
--
-- MIGRATION SQL À VALIDER / NON EXÉCUTÉE — préparée sur demande du QG,
-- ne pas appliquer sans GO explicite séparé.

alter table public.profiles
  add column if not exists preferred_currency text;

comment on column public.profiles.preferred_currency is
  'Devise préférée/par défaut de l''utilisateur (code ISO 4217, ex. XOF, MAD, EUR, CNY). '
  'Dérivée par défaut depuis profiles.country lors du mini-onboarding, mais jamais verrouillée : '
  'l''utilisateur reste libre de la modifier. Ne verrouille jamais la devise choisie ponctuellement '
  'dans une réponse MPD (ex. Q28) — ce sont deux données distinctes.';
