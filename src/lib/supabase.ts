import { createClient } from "@supabase/supabase-js";

// Vercel環境変数が反映されない場合のフォールバック（ハードコード）
const SUPABASE_URL = "https://hhkuvbuthsettdhekrzc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhoa3V2YnV0aHNldHRkaGVrcnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzY3MzQsImV4cCI6MjA5NzQ1MjczNH0.44FIF8YabIetnjkYsJbbkHnJyLbQVSFAJ8fJ5bNiS38";

let _supabase: ReturnType<typeof createClient> | null = null;
let _configured = false;

export function getSupabase() {
  if (_supabase) return _supabase;

  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  _configured = true;
  return _supabase;
}

export function isSupabaseConfigured(): boolean {
  if (!_supabase) getSupabase();
  return _configured;
}
