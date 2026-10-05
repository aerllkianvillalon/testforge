-- TestForge schema. Run in the Supabase SQL editor.

create table if not exists public.study_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text,
  type text not null check (type in ('flashcards', 'quiz')),
  -- A short preview only. The full source is never stored: it is the user's
  -- coursework, and keeping it creates a liability with no product benefit.
  source_excerpt text not null default '',
  items jsonb not null,
  model_version text not null default 'unknown',
  created_at timestamptz not null default now()
);

create index if not exists study_sets_user_created_idx
  on public.study_sets (user_id, created_at desc);

alter table public.study_sets enable row level security;

-- Four policies, one per operation, each scoped to the owner. The insert
-- policy uses with check so a client cannot insert a row under another user id.
drop policy if exists "study_sets_select_own" on public.study_sets;
create policy "study_sets_select_own"
  on public.study_sets for select
  using (auth.uid() = user_id);

drop policy if exists "study_sets_insert_own" on public.study_sets;
create policy "study_sets_insert_own"
  on public.study_sets for insert
  with check (auth.uid() = user_id);

drop policy if exists "study_sets_update_own" on public.study_sets;
create policy "study_sets_update_own"
  on public.study_sets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "study_sets_delete_own" on public.study_sets;
create policy "study_sets_delete_own"
  on public.study_sets for delete
  using (auth.uid() = user_id);

-- No grants to anon. Guests generate without an account, but nothing they do
-- touches this table.
revoke all on public.study_sets from anon;
grant select, insert, update, delete on public.study_sets to authenticated;
