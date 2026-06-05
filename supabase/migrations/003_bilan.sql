-- Réponses au Bilan de Clarté (sauvegardées depuis le reader)
create table public.bilan_responses (
  id           uuid        default gen_random_uuid() primary key,
  user_id      uuid        references auth.users(id) on delete cascade not null,
  question_id  text        not null,
  famille      text        not null,
  response     text        not null,
  answered_at  timestamptz default now() not null,
  updated_at   timestamptz default now() not null,
  unique (user_id, question_id)
);

alter table public.bilan_responses enable row level security;

create policy "Users can manage their own bilan responses"
  on public.bilan_responses for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Suivi de complétion dans profiles
alter table public.profiles
  add column if not exists bilan_completed_at timestamptz;
