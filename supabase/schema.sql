-- Day Analysis — Supabase schema
--
-- Paste into the Supabase SQL editor, or keep it as the first file in
-- `supabase/migrations/` if you adopt the CLI.
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
--   2. Category is text with a check, not a Postgres enum. Two categories have
--      already been renamed once (entertainment -> leisure, travel -> transit);
--      a check constraint makes the next rename an UPDATE plus a constraint
--      swap, where an enum would make it a type migration.
--
-- Every table is scoped by user_id and closed by RLS, so the browser can talk
-- to Supabase directly and no API route is needed.

-- ------------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

drop trigger if exists blocks_touch_updated_at on public.blocks;
create trigger blocks_touch_updated_at
  before update on public.blocks
  for each row execute function public.touch_updated_at();

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
  updated_at         timestamptz not null default now(),

  constraint settings_interval_valid check (interval in (15, 30, 60)),
  constraint settings_day_start_shape check (day_starts_at ~ '^[0-2][0-9]:[0-5][0-9]$'),
  constraint settings_has_a_category check (array_length(enabled_categories, 1) >= 1)
);

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute function public.touch_updated_at();

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

do $$
declare
  t text;
begin
  foreach t in array array['blocks', 'settings', 'experiment_sessions', 'todos']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);

    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)',
      t || '_delete_own', t);
  end loop;
end;
$$;
