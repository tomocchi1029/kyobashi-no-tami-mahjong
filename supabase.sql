-- 京橋の民セット麻雀記録ツール - Supabase テーブル定義
-- Supabaseダッシュボード→SQL Editor→New Query で実行

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  config JSONB NOT NULL,
  player_ids UUID[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS event_schedules (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_players_updated_at ON players;
CREATE TRIGGER trg_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_event_schedules_updated_at ON event_schedules;
CREATE TRIGGER trg_event_schedules_updated_at
  BEFORE UPDATE ON event_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_rounds_updated_at ON rounds;
CREATE TRIGGER trg_rounds_updated_at
  BEFORE UPDATE ON rounds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_game_tables_updated_at ON game_tables;
CREATE TRIGGER trg_game_tables_updated_at
  BEFORE UPDATE ON game_tables
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- インデックス
CREATE INDEX IF NOT EXISTS idx_rounds_event_id ON rounds(event_id);
CREATE INDEX IF NOT EXISTS idx_game_tables_event_id ON game_tables(event_id);
CREATE INDEX IF NOT EXISTS idx_game_tables_round_id ON game_tables(round_id);
CREATE INDEX IF NOT EXISTS idx_event_schedules_event_id ON event_schedules(event_id);
CREATE INDEX IF NOT EXISTS idx_event_schedules_starts_at ON event_schedules(starts_at);

-- 既存テーブルへの差分同期用カラム追加（既に存在する場合はスキップ）
ALTER TABLE players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE game_tables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 差分同期用インデックス
CREATE INDEX IF NOT EXISTS idx_players_updated_at ON players(updated_at);
CREATE INDEX IF NOT EXISTS idx_events_updated_at ON events(updated_at);
CREATE INDEX IF NOT EXISTS idx_event_schedules_updated_at ON event_schedules(updated_at);
CREATE INDEX IF NOT EXISTS idx_rounds_updated_at ON rounds(updated_at);
CREATE INDEX IF NOT EXISTS idx_game_tables_updated_at ON game_tables(updated_at);

-- 既存レコードの updated_at を created_at で初期化
UPDATE players SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE events SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE event_schedules SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE rounds SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE game_tables SET updated_at = created_at WHERE updated_at IS NULL;
