import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * One browser client for the whole app.
 *
 * There is no server half and no API route: the browser holds the signed-in
 * user's JWT and Row Level Security decides what it may read or write. Both
 * values below are public by design — they ship inside the bundle, and the
 * policies in `supabase/schema.sql` are the thing actually protecting rows.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  if (!client) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The OAuth redirect comes back with a code in the URL; the client
        // exchanges it here, which is why no callback route is needed.
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }
  return client;
}

export const isSupabaseConfigured = Boolean(url && key);
