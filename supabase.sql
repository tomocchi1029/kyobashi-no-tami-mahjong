-- 京橋の民セット麻雀記録ツール - Supabase テーブル定義
-- Supabaseダッシュボード→SQL Editor→New Query で実行

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  config JSONB NOT NULL,
  player_ids UUID[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rest_player_ids UUID[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS game_tables (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  table_number INT NOT NULL,
  player_ids UUID[] DEFAULT '{}',
  raw_scores INT[] DEFAULT '{}',
  chip_counts INT[] DEFAULT '{}',
  score_entered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_rounds_event_id ON rounds(event_id);
CREATE INDEX IF NOT EXISTS idx_game_tables_event_id ON game_tables(event_id);
CREATE INDEX IF NOT EXISTS idx_game_tables_round_id ON game_tables(round_id);
