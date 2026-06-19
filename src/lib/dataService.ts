import { getSupabase, isSupabaseConfigured } from "./supabase";
import { db } from "./db";
import type {
  Player,
  MahjongEvent,
  Round,
  TableAssignment,
  EventConfig,
} from "./types";

async function dbInsert(table: string, data: unknown): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from(table).upsert(data as never);
    if (error) console.warn(`Supabase ${table} upsert error:`, error.message);
  }
}

async function dbBatchInsert(table: string, data: unknown[]): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from(table).upsert(data as never);
    if (error) console.warn(`Supabase ${table} batch upsert error:`, error.message);
  }
}

async function dbDelete(table: string, id: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) console.warn(`Supabase ${table} delete error:`, error.message);
  }
}

async function dbBatchDelete(table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from(table).delete().in("id", ids);
    if (error) console.warn(`Supabase ${table} batch delete error:`, error.message);
  }
}

async function dbUpdate(table: string, id: string, data: Record<string, unknown>): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from(table).update(data as never).eq("id", id);
    if (error) console.warn(`Supabase ${table} update error:`, error.message);
  }
}

// ── Player ──

export async function createPlayer(name: string): Promise<Player> {
  const player: Player = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: Date.now(),
  };
  await db.players.add(player as Player);
  await dbInsert("players", player);
  return player;
}

export async function deletePlayer(id: string): Promise<void> {
  await db.players.delete(id);
  await dbDelete("players", id);
}

// ── Event ──

export async function createEvent(
  id: string,
  name: string,
  config: EventConfig,
  playerIds: string[]
): Promise<void> {
  const event: MahjongEvent = {
    id,
    name: name.trim(),
    createdAt: Date.now(),
    config,
    playerIds,
  };
  await db.events.add(event);
  await dbInsert("events", {
    ...event,
    config: JSON.stringify(config),
    player_ids: playerIds,
  });
}

export async function updateEventConfig(id: string, config: EventConfig): Promise<void> {
  await db.events.update(id, { config });
  await dbUpdate("events", id, { config: JSON.stringify(config) } as Record<string, unknown>);
}

export async function deleteEvent(id: string): Promise<void> {
  const roundIds = (await db.rounds.where("eventId").equals(id).toArray()).map((r) => r.id);
  const tableIds = (await db.gameTables.where("eventId").equals(id).toArray()).map((t) => t.id);

  await db.gameTables.where("eventId").equals(id).delete();
  await db.rounds.where("eventId").equals(id).delete();
  await db.events.delete(id);

  await dbBatchDelete("game_tables", tableIds);
  await dbBatchDelete("rounds", roundIds);
  await dbDelete("events", id);
}

// ── Round / Table ──

export async function addRound(
  round: Round,
  tables: TableAssignment[]
): Promise<void> {
  await db.rounds.add(round);
  await db.gameTables.bulkAdd(tables);
  await dbInsert("rounds", round);
  const supabaseTables = tables.map((t) => ({
    ...t,
    rawScores: t.rawScores as number[],
    chipCounts: t.chipCounts as number[],
  }));
  await dbBatchInsert("game_tables", supabaseTables as unknown as Record<string, unknown>[]);
}

export async function deleteRoundAndTables(
  roundId: string,
  tableIds: string[]
): Promise<void> {
  await db.gameTables.bulkDelete(tableIds);
  await db.rounds.delete(roundId);
  await dbBatchDelete("game_tables", tableIds);
  await dbDelete("rounds", roundId);
}

export async function replaceRoundTables(
  round: Round,
  oldTableIds: string[],
  newTables: TableAssignment[]
): Promise<void> {
  await db.gameTables.bulkDelete(oldTableIds);
  await db.gameTables.bulkAdd(newTables);
  await db.rounds.put(round);
  await dbBatchDelete("game_tables", oldTableIds);
  await dbBatchInsert(
    "game_tables",
    newTables.map((t) => ({ ...t })) as unknown as Record<string, unknown>[]
  );
  await dbUpdate("rounds", round.id, {
    restPlayerIds: round.restPlayerIds,
  } as Record<string, unknown>);
}

export async function updateTableScores(
  tableId: string,
  rawScores: number[],
  chipCounts: number[],
  scoreEntered: boolean
): Promise<void> {
  await db.gameTables.update(tableId, { rawScores, chipCounts, scoreEntered });
  await dbUpdate("game_tables", tableId, {
    raw_scores: rawScores,
    chip_counts: chipCounts,
    score_entered: scoreEntered,
  } as Record<string, unknown>);
}

// ── Sync ──

export async function syncAllFromSupabase(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: players, error: pe } = await supabase.from("players").select("*");
  if (pe) { console.warn("sync players error:", pe.message); return; }

  const { data: events, error: ee } = await supabase.from("events").select("*");
  if (ee) { console.warn("sync events error:", ee.message); return; }

  const { data: rounds, error: re } = await supabase.from("rounds").select("*");
  if (re) { console.warn("sync rounds error:", re.message); return; }

  const { data: tables, error: te } = await supabase.from("game_tables").select("*");
  if (te) { console.warn("sync tables error:", te.message); return; }

  await db.transaction("rw", db.players, db.events, db.rounds, db.gameTables, async () => {
    await db.players.clear();
    await db.events.clear();
    await db.rounds.clear();
    await db.gameTables.clear();

    if (players?.length) await db.players.bulkAdd(players as Player[]);
    if (events?.length) {
      const mapped = events.map((e: Record<string, unknown>) => ({
        id: e.id as string,
        name: e.name as string,
        createdAt: new Date(e.created_at as string).getTime(),
        config: typeof e.config === "string" ? JSON.parse(e.config) : e.config,
        playerIds: (e.player_ids as string[]) ?? [],
      }));
      await db.events.bulkAdd(mapped as MahjongEvent[]);
    }
    if (rounds?.length) {
      const mapped = rounds.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        eventId: r.event_id as string,
        index: r.index as number,
        createdAt: new Date(r.created_at as string).getTime(),
        restPlayerIds: (r.rest_player_ids as string[]) ?? [],
      }));
      await db.rounds.bulkAdd(mapped as Round[]);
    }
    if (tables?.length) {
      const mapped = tables.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        eventId: t.event_id as string,
        roundId: t.round_id as string,
        tableNumber: t.table_number as number,
        playerIds: (t.player_ids as string[]) ?? [],
        rawScores: (t.raw_scores as number[]) ?? [],
        chipCounts: (t.chip_counts as number[]) ?? [],
        scoreEntered: (t.score_entered as boolean) ?? false,
        createdAt: new Date(t.created_at as string).getTime(),
      }));
      await db.gameTables.bulkAdd(mapped as TableAssignment[]);
    }
  });
}
