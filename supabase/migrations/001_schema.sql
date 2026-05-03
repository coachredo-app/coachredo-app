-- ============================================================
-- PLAN B RENTABLE — Schéma Supabase
-- Migration 001 : Tables principales
-- ============================================================

-- ── PROFILES ─────────────────────────────────────────────────
-- Étend auth.users avec les données utilisateur
-- last_active_at, current_chapter, completion_percentage : tracking progression
create table public.profiles (
  id                    uuid references auth.users(id) on delete cascade primary key,
  email                 text not null,
  full_name             text,
  country               text,
  last_active_at        timestamptz,
  current_chapter       integer default 0,
  completion_percentage numeric(5,2) default 0,
  created_at            timestamptz default now()
);

-- ── BOOK ACCESS ───────────────────────────────────────────────
-- Gate d'accès payant — 1 ligne par utilisateur
create table public.book_access (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade unique not null,
  has_access          boolean default false not null,
  access_granted_at   timestamptz,
  access_method       text check (access_method in ('code', 'admin', 'payment'))
);

-- ── ACCESS CODES ─────────────────────────────────────────────
-- Codes d'accès générés par admin, envoyés après paiement
create table public.access_codes (
  code        text primary key,
  is_active   boolean default true not null,
  used_by     uuid references auth.users(id),
  used_at     timestamptz,
  created_at  timestamptz default now()
);

-- ── CHAPTER PROGRESS ─────────────────────────────────────────
-- Progression par chapitre (0 = intro, 1-10 = chapitres)
create table public.chapter_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  chapter_num      integer not null check (chapter_num >= 0 and chapter_num <= 10),
  is_completed     boolean default false not null,
  completed_at     timestamptz,
  last_block_index integer default 0 not null,
  updated_at       timestamptz default now(),
  unique(user_id, chapter_num)
);

-- ── EXERCISE RESPONSES ───────────────────────────────────────
-- Réponses aux exercices — response en jsonb pour couvrir tous les types
-- Types stockés : text → string, text_group → object, selection → {selected, additional}
-- commitment → {confirmed, confirmed_at}, weighted_decision_matrix → {scores, recommended}
-- generated_summary → {generated, edited, final}
create table public.exercise_responses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  chapter_num integer not null,
  exercise_id text not null,
  response    jsonb not null,
  submitted_at timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, exercise_id)
);

-- ── QUIZ ATTEMPTS ────────────────────────────────────────────
-- Tentatives quiz — 1 ligne par utilisateur (upsert)
create table public.quiz_attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade unique not null,
  attempt_count       integer default 0 not null,
  last_attempt_at     timestamptz,
  last_score          integer,
  is_locked           boolean default false not null,
  passed              boolean default false not null,
  passed_at           timestamptz,
  admin_reset_at      timestamptz,
  admin_reset_by      text,
  admin_reset_reason  text,
  created_at          timestamptz default now()
);

-- ── TRIGGER : auto-création profil + book_access au signup ───
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );

  insert into public.book_access (user_id, has_access)
  values (new.id, false);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── TRIGGER : mise à jour completion_percentage + last_active_at ──
-- 42 = nombre total d'exercices obligatoire:true sur les 10 chapitres
-- (ch1:3, ch2:5, ch3:4, ch4:5, ch5:4, ch6:4, ch7:4, ch8:4, ch9:5, ch10:4)
create or replace function public.update_user_progress()
returns trigger as $$
declare
  total_required  integer := 42;
  completed_count integer;
begin
  select count(*) into completed_count
  from public.exercise_responses
  where user_id = new.user_id;

  update public.profiles
  set
    completion_percentage = round((least(completed_count, total_required)::numeric / total_required) * 100, 2),
    last_active_at        = now()
  where id = new.user_id;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_exercise_submitted
  after insert or update on public.exercise_responses
  for each row execute procedure public.update_user_progress();

-- ── TRIGGER : mise à jour current_chapter ────────────────────
create or replace function public.update_current_chapter()
returns trigger as $$
begin
  if new.is_completed = true then
    update public.profiles
    set current_chapter = greatest(current_chapter, new.chapter_num)
    where id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_chapter_completed
  after insert or update on public.chapter_progress
  for each row execute procedure public.update_current_chapter();
