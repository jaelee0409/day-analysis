-- Live updates between two open screens.
--
-- Optional. Without this the app still syncs whenever a tab is focused again,
-- which covers the usual case of recording on a phone and then looking at a
-- laptop. Run this and a screen also updates while it is sitting open.
--
-- Row Level Security still applies to the change feed, so a subscriber is only
-- ever told about rows they are already allowed to read.

alter publication supabase_realtime add table public.blocks;
alter publication supabase_realtime add table public.todos;
