import { createClient } from "@supabase/supabase-js";

function getEnv(key: string): string | undefined {
  if (typeof process !== "undefined") {
    const env = process.env as Record<string, string | undefined>;
    return env[key];
  }
  return undefined;
}

let _supabase: ReturnType<typeof createClient> | null = null;
let _checked = false;
let _configured = false;

export function getSupabase() {
  if (_supabase) return _supabase;

  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (typeof window !== "undefined") {
    console.log("[supabase] URL:", url ? `${url.slice(0, 30)}...` : "(undefined)");
    console.log("[supabase] KEY:", key ? `${key.slice(0, 20)}...` : "(undefined)");
  }

  if (!url || !key) {
    _checked = true;
    _configured = false;
    return null;
  }

  _supabase = createClient(url, key, { auth: { persistSession: false } });
  _checked = true;
  _configured = true;
  return _supabase;
}

export function isSupabaseConfigured(): boolean {
  if (!_checked) getSupabase();
  return _configured;
}
