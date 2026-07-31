-- ============================================================
-- PLAN B RENTABLE — Migration 004
-- Tables de coaching + colonnes manquantes + RLS utilisateur
-- ============================================================
-- Contexte : ces tables existaient en production sans migration écrite.
-- Ce fichier les rend reproductibles et ajoute les champs V1 manquants.
-- Les CREATE TABLE utilisent IF NOT EXISTS (idempotent).
-- Les CREATE POLICY sont sans IF NOT EXISTS (compatible PG 15/16).
-- ============================================================


-- ── PROFILES : colonnes manquantes ───────────────────────────
alter table public.profiles
  add column if not exists nom                text,
  add column if not exists telephone          text,
  add column if not exists livre_completed    boolean      default false,
  add column if not exists livre_completed_at timestamptz;


-- ── ACCESS CODES : colonne access_type ───────────────────────
-- Différencie les codes book des codes trading (module Trading).
alter table public.access_codes
  add column if not exists access_type text not null default 'book'
    check (access_type in ('book', 'trading'));


-- ── READING PROGRESS ─────────────────────────────────────────
-- Suivi lecture chapitre par chapitre, écrit par le reader (supabase-sync.ts).
-- Une ligne par (user, chapter). completed_at null = commencé, non terminé.
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

create policy "reading_progress_select_own"
  on public.reading_progress for select
  using (auth.uid() = user_id);

create policy "reading_progress_insert_own"
  on public.reading_progress for insert
  with check (auth.uid() = user_id);

create policy "reading_progress_update_own"
  on public.reading_progress for update
  using (auth.uid() = user_id);


-- ── DIAGNOSTICS ──────────────────────────────────────────────
-- Diagnostic CoachRedo rempli par le coach. Une fiche par utilisateur.
-- Aucun accès utilisateur direct — service_role uniquement (admin).
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
-- Pas de politique utilisateur : seul service_role accède à cette table.


-- ── USER SIGNALS ─────────────────────────────────────────────
-- Signaux identifiés par le coach. Outil interne — jamais visible par l'utilisateur.
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
-- Pas de politique utilisateur : seul service_role accède à cette table.


-- ── COACH JOURNAL ────────────────────────────────────────────
-- Journal privé du coach. Strictement interne, jamais exposé à l'utilisateur.
create table if not exists public.coach_journal (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete cascade not null,
  type       text        not null,
  contenu    text        not null,
  resultat   text,
  created_at timestamptz default now() not null
);

alter table public.coach_journal enable row level security;
-- Pas de politique utilisateur : seul service_role accède à cette table.


-- ── USER MISSIONS ────────────────────────────────────────────
-- Missions assignées par le coach.
--
-- Modèle de sécurité :
--   SELECT  → autorisé pour l'utilisateur (lire ses propres missions)
--   INSERT  → service_role uniquement (coach via admin)
--   UPDATE  → service_role uniquement via Server Action authentifiée.
--             La réponse utilisateur (user_response) est écrite par une
--             Server Action qui vérifie auth.uid() côté serveur avant
--             d'appeler service_role. Cela empêche toute modification
--             de statut ou du texte de mission par appel API direct.
--   DELETE  → service_role uniquement (coach via admin)
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

alter table public.user_missions enable row level security;

create policy "user_missions_select_own"
  on public.user_missions for select
  using (auth.uid() = user_id);


-- ── INDEX ────────────────────────────────────────────────────
create index if not exists idx_reading_progress_user_id on public.reading_progress (user_id);
create index if not exists idx_diagnostics_user_id       on public.diagnostics (user_id);
create index if not exists idx_user_signals_user_id      on public.user_signals (user_id);
create index if not exists idx_coach_journal_user_id     on public.coach_journal (user_id);
create index if not exists idx_user_missions_user_id     on public.user_missions (user_id);
create index if not exists idx_user_missions_statut      on public.user_missions (user_id, statut);
