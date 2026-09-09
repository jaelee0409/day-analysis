-- Day Analysis — habits
--
-- Run this once, in the Supabase SQL editor, after schema.sql. Same style as
-- that file: plain DDL, no functions or triggers, safe to re-run.
--
-- A habit is something you mean to do on certain days — a supplement, a step
-- in a skincare routine. It is deliberately not a time block: it has no
-- duration and does not belong on the timeline. What gets recorded is only
-- whether it happened on a given day.
--
-- Two decisions worth knowing:
--
--   1. The schedule is a set of weekdays, not a rule engine. "Every day" is
--      all seven. Two products that alternate — retinol two nights a week,
--      niacinamide the rest — are two habits holding complementary sets, so
--      exactly one of them is scheduled on any given night. That covers what
--      a person actually asks for without inventing a recurrence language.
--
--   2. A check is a row that exists, not a boolean. Unticking deletes it.
--      That keeps "not done" and "never asked" the same shape, which is what
--      you want when a habit is added midway through a month of history.
--
--   3. There is no starter list. What someone takes and when is personal, so
--      an account begins empty and its owner fills it in Settings.

create table if not exists public.habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,

  -- 0 = Sunday .. 6 = Saturday, matching JavaScript's Date#getDay.
  days       smallint[] not null default array[0, 1, 2, 3, 4, 5, 6],

  -- When in the day. More than one means more than one dose: a habit set to
  -- morning and night is asked about twice, and ticked twice.
  times      text[] not null default array['morning'],

  -- Order in the list, as the person arranged it.
  position   integer not null default 0,
  created_at timestamptz not null default now(),

  constraint habits_name_not_blank check (length(btrim(name)) > 0),
  constraint habits_has_a_day      check (array_length(days, 1) between 1 and 7),
  constraint habits_days_in_range  check (days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  constraint habits_has_a_time     check (array_length(times, 1) between 1 and 3),
  constraint habits_times_in_range check (times <@ array['morning', 'afternoon', 'night'])
);

create index if not exists habits_user_idx on public.habits (user_id, position);

-- One row per habit per day it was done. Deleting the habit takes its history
-- with it, which is what removing something from the list should mean.
create table if not exists public.habit_checks (
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,

  -- Day-window key, same as blocks.date: the day the person was looking at,
  -- not necessarily the calendar date the clock had reached.
  date       date not null,

  -- Which of the habit's moments this tick was for.
  time_of_day text not null default 'morning',
  checked_at timestamptz not null default now(),

  constraint habit_checks_time_valid check (time_of_day in ('morning', 'afternoon', 'night')),

  primary key (habit_id, date, time_of_day)
);

create index if not exists habit_checks_user_date_idx on public.habit_checks (user_id, date);

-- ------------------------------------------------------------------
-- Upgrading an install that ran the first version of this file, when a habit
-- was once-a-day and a check had no moment attached. No-ops on a fresh one.
-- ------------------------------------------------------------------

alter table public.habits
  add column if not exists times text[] not null default array['morning'];

alter table public.habit_checks
  add column if not exists time_of_day text not null default 'morning';

-- Existing ticks become morning ticks, so the key is unique either way. Drop
-- and re-add rather than branching: on a fresh table this replaces the key
-- with an identical one.
alter table public.habit_checks drop constraint if exists habit_checks_pkey;
alter table public.habit_checks add primary key (habit_id, date, time_of_day);

-- ------------------------------------------------------------------
-- Row Level Security — see schema.sql for why this is the whole API layer.
-- ------------------------------------------------------------------

alter table public.habits       enable row level security;
alter table public.habit_checks enable row level security;

drop policy if exists habits_select_own on public.habits;
drop policy if exists habits_insert_own on public.habits;
drop policy if exists habits_update_own on public.habits;
drop policy if exists habits_delete_own on public.habits;

create policy habits_select_own on public.habits
  for select using (auth.uid() = user_id);
create policy habits_insert_own on public.habits
  for insert with check (auth.uid() = user_id);
create policy habits_update_own on public.habits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy habits_delete_own on public.habits
  for delete using (auth.uid() = user_id);

drop policy if exists habit_checks_select_own on public.habit_checks;
drop policy if exists habit_checks_insert_own on public.habit_checks;
drop policy if exists habit_checks_update_own on public.habit_checks;
drop policy if exists habit_checks_delete_own on public.habit_checks;

create policy habit_checks_select_own on public.habit_checks
  for select using (auth.uid() = user_id);
create policy habit_checks_insert_own on public.habit_checks
  for insert with check (auth.uid() = user_id);
create policy habit_checks_update_own on public.habit_checks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy habit_checks_delete_own on public.habit_checks
  for delete using (auth.uid() = user_id);
