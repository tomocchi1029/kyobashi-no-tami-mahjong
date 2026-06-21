import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://hhkuvbuthsettdhekrzc.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhoa3V2YnV0aHNldHRkaGVrcnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzY3MzQsImV4cCI6MjA5NzQ1MjczNH0.44FIF8YabIetnjkYsJbbkHnJyLbQVSFAJ8fJ5bNiS38";

function getEnv(key: string): string | undefined {
  if (typeof process !== "undefined") {
    const env = process.env as Record<string, string | undefined>;
    return env[key];
  }
  return undefined;
}

let _supabase: ReturnType<typeof createClient> | null = null;
let _configured = false;

export function getSupabase() {
  if (_supabase) return _supabase;

  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL") || FALLBACK_URL;
  const key = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || FALLBACK_KEY;

  if (typeof window !== "undefined") {
    console.log(
      "[supabase] env URL:",
      getEnv("NEXT_PUBLIC_SUPABASE_URL") ? "set" : "missing (using fallback)"
    );
    console.log(
      "[supabase] env KEY:",
      getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "set" : "missing (using fallback)"
    );
  }

  if (!url || !key) {
    _configured = false;
    return null;
  }

  _supabase = createClient(url, key, { auth: { persistSession: false } });
  _configured = true;
  return _supabase;
}

export function isSupabaseConfigured(): boolean {
  if (!_supabase) getSupabase();
  return _configured;
}
