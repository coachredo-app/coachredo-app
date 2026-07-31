-- ============================================================
-- PLAN B RENTABLE — Migration 004
-- Tables de coaching + colonnes manquantes + RLS utilisateur
-- ============================================================
-- Contexte : ces tables existaient en production sans migration écrite.
-- Ce fichier est conçu pour être safe à rejouer sur un environnement
-- partiellement migré :
--   - CREATE TABLE  : IF NOT EXISTS
--   - ALTER TABLE   : ADD COLUMN IF NOT EXISTS
--   - CREATE POLICY : encapsulé dans un bloc DO pour éviter l'erreur
--                     "policy already exists" sur Postgres 15/16
--   - CREATE INDEX  : IF NOT EXISTS
-- Aucune donnée existante n'est modifiée ou supprimée.
-- ============================================================


-- ── PROFILES : colonnes manquantes ───────────────────────────
alter table public.profiles
  add column if not exists nom                text,
  add column if not exists telephone          text,
  add column if not exists livre_completed    boolean      default false,
  add column if not exists livre_completed_at timestamptz;


-- ── ACCESS CODES : colonne access_type ───────────────────────
-- NOT NULL avec DEFAULT 'book' : tous les codes existants reçoivent 'book'.
alter table public.access_codes
  add column if not exists access_type text not null default 'book'
    check (access_type in ('book', 'trading'));


-- ── READING PROGRESS ─────────────────────────────────────────
create table if not exists public.reading_progress (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete cascade not null,
  chapter_id    text        not null,
  chapter_order integer     not null,
  completed_at  timestamptz,
  created_at    timestamptz default now() not null,
  unique (user_id, chapter_id)
);

alter table public.reading_progress enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'reading_progress' and policyname = 'reading_progress_select_own'
  ) then
    create policy "reading_progress_select_own"
      on public.reading_progress for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'reading_progress' and policyname = 'reading_progress_insert_own'
  ) then
    create policy "reading_progress_insert_own"
      on public.reading_progress for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'reading_progress' and policyname = 'reading_progress_update_own'
  ) then
    create policy "reading_progress_update_own"
      on public.reading_progress for update
      using (auth.uid() = user_id);
  end if;
end $$;


-- ── DIAGNOSTICS ──────────────────────────────────────────────
-- Outil interne coach — aucun accès utilisateur.
create table if not exists public.diagnostics (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        references auth.users(id) on delete cascade not null unique,
  diagnostic_status   text,
  force_principale    text,
  frein_principal     text,
  hypothese_plan_b    text,
  signal_prioritaire  text,
  niveau_clarte       integer     check (niveau_clarte between 1 and 10),
  niveau_mouvement    integer     check (niveau_mouvement between 1 and 10),
  synthese_coach      text,
  message_utilisateur text,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

alter table public.diagnostics enable row level security;


-- ── USER SIGNALS ─────────────────────────────────────────────
create table if not exists public.user_signals (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete cascade not null,
  categorie   text        not null,
  signal      text        not null,
  intensite   text        not null,
  coach_note  text,
  created_at  timestamptz default now() not null
);

alter table public.user_signals enable row level security;


-- ── COACH JOURNAL ────────────────────────────────────────────
create table if not exists public.coach_journal (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete cascade not null,
  type       text        not null,
  contenu    text        not null,
  resultat   text,
  created_at timestamptz default now() not null
);

alter table public.coach_journal enable row level security;


-- ── USER MISSIONS ────────────────────────────────────────────
-- SELECT autorisé pour l'utilisateur. INSERT/UPDATE/DELETE via service_role uniquement.
create table if not exists public.user_missions (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        references auth.users(id) on delete cascade not null,
  mission        text        not null,
  statut         text        not null default 'en_cours'
                               check (statut in ('en_cours', 'terminée', 'abandonnée')),
  coach_note     text,
  assigned_at    timestamptz default now() not null,
  completed_at   timestamptz,
  user_response  text,
  responded_at   timestamptz
);

-- Colonnes V1 manquantes si la table existait avant cette migration
alter table public.user_missions
  add column if not exists user_response text,
  add column if not exists responded_at  timestamptz;

alter table public.user_missions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_missions' and policyname = 'user_missions_select_own'
  ) then
    create policy "user_missions_select_own"
      on public.user_missions for select
      using (auth.uid() = user_id);
  end if;
end $$;


-- ── INDEX ────────────────────────────────────────────────────
create index if not exists idx_reading_progress_user_id on public.reading_progress (user_id);
create index if not exists idx_diagnostics_user_id       on public.diagnostics (user_id);
create index if not exists idx_user_signals_user_id      on public.user_signals (user_id);
create index if not exists idx_coach_journal_user_id     on public.coach_journal (user_id);
create index if not exists idx_user_missions_user_id     on public.user_missions (user_id);
create index if not exists idx_user_missions_statut      on public.user_missions (user_id, statut);
