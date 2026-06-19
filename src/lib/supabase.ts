import { createClient } from "@supabase/supabase-js";

function getEnv(key: string): string | undefined {
  if (typeof process !== "undefined") {
    const env = process.env as Record<string, string | undefined>;
    return env[key];
  }
  return undefined;
}

let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (_supabase) return _supabase;

  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !key) return null;

  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

export function isSupabaseConfigured(): boolean {
  return !!getSupabase();
}
