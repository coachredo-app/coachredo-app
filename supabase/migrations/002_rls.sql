-- ============================================================
-- PLAN B RENTABLE — Row Level Security
-- Migration 002 : Politiques d'accès
-- ============================================================
-- Règle générale : chaque utilisateur ne voit que ses propres données.
-- Le service_role (admin) bypass toutes les politiques (comportement Supabase par défaut).

-- ── PROFILES ─────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ── BOOK ACCESS ───────────────────────────────────────────────
alter table public.book_access enable row level security;

create policy "book_access_select_own" on public.book_access
  for select using (auth.uid() = user_id);

-- ── ACCESS CODES ─────────────────────────────────────────────
-- Aucun accès client direct — validation via API route (service_role)
alter table public.access_codes enable row level security;

-- ── CHAPTER PROGRESS ─────────────────────────────────────────
alter table public.chapter_progress enable row level security;

create policy "chapter_progress_select_own" on public.chapter_progress
  for select using (auth.uid() = user_id);

create policy "chapter_progress_insert_own" on public.chapter_progress
  for insert with check (auth.uid() = user_id);

create policy "chapter_progress_update_own" on public.chapter_progress
  for update using (auth.uid() = user_id);

-- ── EXERCISE RESPONSES ───────────────────────────────────────
alter table public.exercise_responses enable row level security;

create policy "exercise_responses_select_own" on public.exercise_responses
  for select using (auth.uid() = user_id);

create policy "exercise_responses_insert_own" on public.exercise_responses
  for insert with check (auth.uid() = user_id);

create policy "exercise_responses_update_own" on public.exercise_responses
  for update using (auth.uid() = user_id);

-- ── QUIZ ATTEMPTS ────────────────────────────────────────────
alter table public.quiz_attempts enable row level security;

create policy "quiz_attempts_select_own" on public.quiz_attempts
  for select using (auth.uid() = user_id);

create policy "quiz_attempts_insert_own" on public.quiz_attempts
  for insert with check (auth.uid() = user_id);

create policy "quiz_attempts_update_own" on public.quiz_attempts
  for update using (auth.uid() = user_id);
