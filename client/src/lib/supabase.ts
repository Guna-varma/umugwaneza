import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || "";
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || "";

if (!url || !anonKey) {
  const msg = "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env (no spaces around =).";
  if (typeof console !== "undefined") console.error("[Supabase]", msg);
  throw new Error(msg);
}

export const supabase = createClient(url, anonKey);

/** Use for all app data (schema umugwaneza). Auth uses default supabase. */
export function db(): ReturnType<SupabaseClient["schema"]> {
  return supabase.schema("umugwaneza");
}
