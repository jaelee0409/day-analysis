-- Day Analysis — Supabase schema
--
-- Plain DDL on purpose: no functions, no triggers, no DO blocks. The one
-- trigger this file used to carry only stamped updated_at, which the app
-- already writes itself, so it was doing nothing the client wasn't. Keeping
-- this to tables, constraints and policies means it runs anywhere a
-- connection does — SQL editor, psql, or `supabase db push` — and it can be
-- re-run safely.
--
-- Two decisions worth knowing before you read on:
--
--   1. Clock times are stored as text, not as `time`. The app's model is a
--      wall clock string ("09:00") and `lib/time.ts` parses exactly that shape.
--      Postgres would hand back "09:00:00", which that parser rejects and
--      silently reads as midnight. Text plus a check constraint keeps the round
--      trip lossless. If you ever switch to `time`, relax the regex in
--      `toMinutes` in the same commit.
--
--   2. Category is text with a check, not a Postgres enum. Three categories
--      have already been renamed or added once (entertainment -> leisure,
--      travel -> transit, chores); a check constraint makes the next change an
--      UPDATE plus a constraint swap, where an enum would be a type migration.
--
-- Every table is scoped by user_id and closed by RLS, so the browser can talk
-- to Supabase directly and no API route is needed.

-- ------------------------------------------------------------------
-- Blocks — the recorded day
-- ------------------------------------------------------------------

create table if not exists public.blocks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  -- Day-window key, "yyyy-mm-dd". Not necessarily the calendar date the clock
  -- times fall on: with a 06:00 day start, 01:00 belongs to the previous day.
  date        date not null,
  title       text,
  category    text not null,
  start_time  text not null,
  end_time    text not null,
  interval    smallint not null,

  -- Both are written by the app, which owns them end to end.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint blocks_start_time_shape check (start_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  constraint blocks_end_time_shape   check (end_time   ~ '^[0-2][0-9]:[0-5][0-9]$'),
  constraint blocks_interval_valid   check (interval in (15, 30, 60)),
  constraint blocks_category_valid   check (
    category in (
      'development', 'study', 'work', 'exercise', 'food',
      'hygiene', 'chores', 'sleep', 'leisure', 'social', 'transit', 'other'
    )
  )
);

-- The query the app actually makes: one user, one day, or a run of days.
create index if not exists blocks_user_date_idx on public.blocks (user_id, date);

-- ------------------------------------------------------------------
-- Settings — one row per person
-- ------------------------------------------------------------------

create table if not exists public.settings (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  interval           smallint not null default 15,
  day_starts_at      text not null default '00:00',
  enabled_categories text[] not null default array[
    'development', 'study', 'work', 'exercise', 'food',
    'hygiene', 'chores', 'sleep', 'leisure', 'social', 'transit', 'other'
  ],

  constraint settings_interval_valid   check (interval in (15, 30, 60)),
  constraint settings_day_start_shape  check (day_starts_at ~ '^[0-2][0-9]:[0-5][0-9]$'),
  constraint settings_has_a_category   check (array_length(enabled_categories, 1) >= 1)
);

-- ------------------------------------------------------------------
-- Experiment sessions — the block-size trial
-- ------------------------------------------------------------------

create table if not exists public.experiment_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  date            date not null,
  block_size      smallint not null,
  started_at      timestamptz not null,
  ended_at        timestamptz not null,
  elapsed_minutes integer not null,
  outcome         text not null,
  note            text,

  constraint experiment_block_size_valid check (block_size in (15, 30, 60)),
  constraint experiment_outcome_valid    check (outcome in ('focused', 'interrupted'))
);

create index if not exists experiment_user_idx on public.experiment_sessions (user_id, started_at desc);

-- ------------------------------------------------------------------
-- Todos — the one forward-looking thing. See design.md.
-- ------------------------------------------------------------------

create table if not exists public.todos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  text         text not null,
  done         boolean not null default false,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,

  constraint todos_text_not_blank check (length(btrim(text)) > 0)
);

create index if not exists todos_user_idx on public.todos (user_id, created_at);

-- ------------------------------------------------------------------
-- Row Level Security
--
-- This is what replaces an API layer: the browser holds the user's JWT and
-- Postgres refuses to return anyone else's rows. Without these policies an
-- enabled-RLS table returns nothing at all, which is the safe failure.
-- ------------------------------------------------------------------

alter table public.blocks              enable row level security;
alter table public.settings            enable row level security;
alter table public.experiment_sessions enable row level security;
alter table public.todos               enable row level security;

drop policy if exists blocks_select_own on public.blocks;
drop policy if exists blocks_insert_own on public.blocks;
drop policy if exists blocks_update_own on public.blocks;
drop policy if exists blocks_delete_own on public.blocks;

create policy blocks_select_own on public.blocks
  for select using (auth.uid() = user_id);
create policy blocks_insert_own on public.blocks
  for insert with check (auth.uid() = user_id);
create policy blocks_update_own on public.blocks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy blocks_delete_own on public.blocks
  for delete using (auth.uid() = user_id);

drop policy if exists settings_select_own on public.settings;
drop policy if exists settings_insert_own on public.settings;
drop policy if exists settings_update_own on public.settings;
drop policy if exists settings_delete_own on public.settings;

create policy settings_select_own on public.settings
  for select using (auth.uid() = user_id);
create policy settings_insert_own on public.settings
  for insert with check (auth.uid() = user_id);
create policy settings_update_own on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy settings_delete_own on public.settings
  for delete using (auth.uid() = user_id);

drop policy if exists experiment_select_own on public.experiment_sessions;
drop policy if exists experiment_insert_own on public.experiment_sessions;
drop policy if exists experiment_update_own on public.experiment_sessions;
drop policy if exists experiment_delete_own on public.experiment_sessions;

create policy experiment_select_own on public.experiment_sessions
  for select using (auth.uid() = user_id);
create policy experiment_insert_own on public.experiment_sessions
  for insert with check (auth.uid() = user_id);
create policy experiment_update_own on public.experiment_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy experiment_delete_own on public.experiment_sessions
  for delete using (auth.uid() = user_id);

drop policy if exists todos_select_own on public.todos;
drop policy if exists todos_insert_own on public.todos;
drop policy if exists todos_update_own on public.todos;
drop policy if exists todos_delete_own on public.todos;

create policy todos_select_own on public.todos
  for select using (auth.uid() = user_id);
create policy todos_insert_own on public.todos
  for insert with check (auth.uid() = user_id);
create policy todos_update_own on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy todos_delete_own on public.todos
  for delete using (auth.uid() = user_id);
