# Moving to Supabase

The app runs entirely on `localStorage` today. Nothing here is wired up yet —
this folder holds the schema so the shape is settled before you accumulate
months of data against it.

## Why this is a small job

`lib/storage.ts` is the only module that touches the browser store, every
method is already `async`, and it returns plain domain objects. Nothing above
it — no page, hook, or analysis function — knows where the data lives. Swapping
to Supabase means rewriting nineteen function bodies behind unchanged
signatures.

Row Level Security does the rest: the browser talks to Supabase directly with
the user's JWT and Postgres refuses anyone else's rows, so there is **no API
route to write**.

## Steps

1. Create a project, then run `schema.sql` in the SQL editor.
2. `npm i @supabase/supabase-js @supabase/ssr`, and put the project URL and
   anon key in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Add auth — sign in, a session provider, and gating. `SettingsProvider`
   already has a `ready` flag that nothing renders before, which is the natural
   place to hang session loading.
4. Rewrite `lib/storage.ts` against the Supabase client. Keep the signatures.
5. Export your JSON from Settings and import it once, mapping `snake_case`
   columns to the `camelCase` model.

## The three things that are not just typing

**`resolveOverlaps` has to become a diff.** Today a single save rewrites the
whole block array — fine as one JSON blob, catastrophic as SQL. It needs to
return the specific deletes, updates, and inserts so a save touches three rows
rather than every row you own. This is where the correctness lives; treat it as
the real work.

**Reads and writes stop being free.** `useDay` does `await mutate()` then
`await reload()` — two round trips per edit, instant against `localStorage` and
noticeably slow against the network, in an app whose whole premise is that
recording beats ignoring. Update optimistically and reconcile after.

**`getBlocks` reads settings synchronously** to find `dayStart`. Once settings
live in the database that read is async, so those methods should take
`dayStart` as an argument instead.

## Column mapping

| Model (`types/time.ts`) | Column |
| --- | --- |
| `id` | `id` |
| — | `user_id` |
| `date` | `date` |
| `title` | `title` |
| `category` | `category` |
| `startTime` | `start_time` |
| `endTime` | `end_time` |
| `interval` | `interval` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

Clock times stay `text`, not `time` — Postgres returns `"09:00:00"` and the
parser in `lib/time.ts` accepts only `"09:00"`, reading anything else as
midnight. The schema comments explain the rest.

## Renaming a category, once it is in Postgres

Same idea as `MIGRATIONS` in `lib/storage.ts`, one level down:

```sql
alter table public.blocks drop constraint blocks_category_valid;
update public.blocks set category = 'newname' where category = 'oldname';
alter table public.blocks add constraint blocks_category_valid check (category in (...));
update public.settings
   set enabled_categories = array_replace(enabled_categories, 'oldname', 'newname');
```
