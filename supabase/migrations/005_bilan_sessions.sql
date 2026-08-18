-- ============================================================
-- PLAN B RENTABLE — Migration 005
-- Bilan multi-sessions : bilan_sessions + backfill sans perte
-- ============================================================
-- Safe à rejouer sur un environnement partiellement migré :
--   - CREATE TABLE  : IF NOT EXISTS
--   - CREATE INDEX  : IF NOT EXISTS
--   - INSERT        : ON CONFLICT DO NOTHING
--   - ALTER COLUMN  : IF EXISTS check via DO block
--   - DROP POLICY   : IF EXISTS
--   - CREATE POLICY : encapsulé dans DO blocks (PG 15/16)
-- ============================================================


-- ── TABLE : bilan_sessions ────────────────────────────────────
create table if not exists public.bilan_sessions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete cascade not null,
  session_num   integer     not null,
  statut        text        not null default 'in_progress'
                              check (statut in ('in_progress', 'completed')),
  current_step  integer     not null default 0,
  started_at    timestamptz default now() not null,
  completed_at  timestamptz
);

-- Une seule session in_progress par utilisateur à la fois
create unique index if not exists idx_bilan_sessions_one_active
  on public.bilan_sessions (user_id)
  where statut = 'in_progress';

-- Numéro de session unique par utilisateur (tous statuts confondus)
create unique index if not exists idx_bilan_sessions_user_num
  on public.bilan_sessions (user_id, session_num);

create index if not exists idx_bilan_sessions_user
  on public.bilan_sessions (user_id, session_num desc);


-- ── RLS : bilan_sessions ──────────────────────────────────────
alter table public.bilan_sessions enable row level security;

-- Lecture : ses propres sessions uniquement
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'bilan_sessions' and policyname = 'bilan_sessions_select_own'
  ) then
    create policy "bilan_sessions_select_own"
      on public.bilan_sessions for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Mise à jour (current_step uniquement) : session in_progress appartenant à l'utilisateur
-- with check (statut = 'in_progress') empêche de changer statut via ce canal
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'bilan_sessions' and policyname = 'bilan_sessions_update_step_own'
  ) then
    create policy "bilan_sessions_update_step_own"
      on public.bilan_sessions for update
      using  (auth.uid() = user_id and statut = 'in_progress')
      with check (auth.uid() = user_id and statut = 'in_progress');
  end if;
end $$;

-- INSERT et DELETE : bloqués pour les utilisateurs (création via Server Action service_role)


-- ── BACKFILL : sessions pour les Bilans existants ─────────────
-- Crée une session #1 (completed ou in_progress selon profiles)
-- pour chaque utilisateur ayant déjà des réponses.
-- ON CONFLICT DO NOTHING → safe à rejouer.
insert into public.bilan_sessions
  (user_id, session_num, statut, current_step, started_at, completed_at)
select
  r.user_id,
  1,
  case when p.bilan_completed_at is not null then 'completed' else 'in_progress' end,
  0,
  min(r.answered_at),
  p.bilan_completed_at
from public.bilan_responses r
left join public.profiles p on p.id = r.user_id
group by r.user_id, p.bilan_completed_at
on conflict do nothing;


-- ── MODIFIER bilan_responses : ajouter session_id ─────────────
alter table public.bilan_responses
  add column if not exists session_id uuid
    references public.bilan_sessions(id) on delete cascade;

-- Backfill session_id pour les réponses existantes (idempotent via WHERE IS NULL)
update public.bilan_responses r
set session_id = s.id
from public.bilan_sessions s
where s.user_id = r.user_id
  and s.session_num = 1
  and r.session_id is null;

-- Rendre NOT NULL (uniquement si la colonne est encore nullable)
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'bilan_responses'
    and column_name = 'session_id'
    and is_nullable = 'YES'
  ) then
    alter table public.bilan_responses
      alter column session_id set not null;
  end if;
end $$;

-- Remplacer la contrainte unique (user_id, question_id) par (session_id, question_id)
do $$ begin
  if exists (
    select 1 from pg_constraint
    where conname = 'bilan_responses_user_id_question_id_key'
    and conrelid = 'public.bilan_responses'::regclass
  ) then
    alter table public.bilan_responses
      drop constraint bilan_responses_user_id_question_id_key;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bilan_responses_session_question_unique'
    and conrelid = 'public.bilan_responses'::regclass
  ) then
    alter table public.bilan_responses
      add constraint bilan_responses_session_question_unique
      unique (session_id, question_id);
  end if;
end $$;


-- ── RLS : bilan_responses — remplacement des policies ─────────
-- Supprimer l'ancienne policy "for all"
drop policy if exists "Users can manage their own bilan responses" on public.bilan_responses;

-- Lecture : ses propres réponses
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'bilan_responses' and policyname = 'bilan_responses_select_own'
  ) then
    create policy "bilan_responses_select_own"
      on public.bilan_responses for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Écriture : uniquement si la session associée est in_progress et appartient à l'utilisateur
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'bilan_responses' and policyname = 'bilan_responses_insert_active_session'
  ) then
    create policy "bilan_responses_insert_active_session"
      on public.bilan_responses for insert
      with check (
        auth.uid() = user_id
        and exists (
          select 1 from public.bilan_sessions s
          where s.id = session_id
            and s.user_id = auth.uid()
            and s.statut = 'in_progress'
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'bilan_responses' and policyname = 'bilan_responses_update_active_session'
  ) then
    create policy "bilan_responses_update_active_session"
      on public.bilan_responses for update
      using (
        auth.uid() = user_id
        and exists (
          select 1 from public.bilan_sessions s
          where s.id = session_id
            and s.user_id = auth.uid()
            and s.statut = 'in_progress'
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'bilan_responses' and policyname = 'bilan_responses_delete_active_session'
  ) then
    create policy "bilan_responses_delete_active_session"
      on public.bilan_responses for delete
      using (
        auth.uid() = user_id
        and exists (
          select 1 from public.bilan_sessions s
          where s.id = session_id
            and s.user_id = auth.uid()
            and s.statut = 'in_progress'
        )
      );
  end if;
end $$;
