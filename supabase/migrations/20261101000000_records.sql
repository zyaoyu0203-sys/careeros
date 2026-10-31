-- CareerOS stores each user's workspace as JSON documents grouped by collection
-- (profile, preferences, jobs, resumes, applications). Row-level security keeps
-- every user's rows private; the scheduled discovery job uses the service role.

create table if not exists public.records (
  user_id uuid not null references auth.users (id) on delete cascade,
  collection text not null check (collection in ('profile', 'preferences', 'jobs', 'resumes', 'applications')),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);

create index if not exists records_collection_idx on public.records (collection);

alter table public.records enable row level security;

create policy "Users read their own records" on public.records
  for select using (auth.uid() = user_id);
create policy "Users insert their own records" on public.records
  for insert with check (auth.uid() = user_id);
create policy "Users update their own records" on public.records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete their own records" on public.records
  for delete using (auth.uid() = user_id);
