import { getSupabase, isSupabaseConfigured } from "./supabase";
import { db } from "./db";
import type {
  Player,
  MahjongEvent,
  Round,
  TableAssignment,
  EventConfig,
  EventSchedule,
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
  const now = Date.now();
  const player: Player = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  };
  await Promise.all([
    db.players.add(player as Player),
    dbInsert("players", { ...player }),
  ]);
  return player;
}

export async function deletePlayer(id: string): Promise<void> {
  await Promise.all([db.players.delete(id), dbDelete("players", id)]);
}

export async function updatePlayer(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const now = Date.now();
  await Promise.all([
    db.players.update(id, { name: trimmed, updatedAt: now }),
    dbUpdate("players", id, { name: trimmed, updated_at: new Date(now).toISOString() }),
  ]);
}

// ── Event ──

export async function createEvent(
  id: string,
  name: string,
  config: EventConfig,
  playerIds: string[],
  schedules: { startsAt: number; endsAt: number | null; note: string }[] = []
): Promise<void> {
  const now = Date.now();
  const event: MahjongEvent = {
    id,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    config,
    playerIds,
  };
  const scheduleRecords: EventSchedule[] = schedules.map((s) => ({
    id: crypto.randomUUID(),
    eventId: id,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    note: s.note,
    createdAt: now,
    updatedAt: now,
  }));
  const cloudSchedules = scheduleRecords.map((s) => ({
    id: s.id,
    event_id: s.eventId,
    starts_at: new Date(s.startsAt).toISOString(),
    ends_at: s.endsAt ? new Date(s.endsAt).toISOString() : null,
    note: s.note,
    created_at: new Date(s.createdAt).toISOString(),
  }));

  const tasks: Promise<unknown>[] = [
    db.events.add(event),
    dbInsert("events", {
      ...event,
      config: JSON.stringify(config),
      player_ids: playerIds,
    }),
  ];
  if (scheduleRecords.length > 0) {
    tasks.push(db.eventSchedules.bulkAdd(scheduleRecords));
    tasks.push(dbBatchInsert("event_schedules", cloudSchedules as unknown[]));
  }
  await Promise.all(tasks);
}

// ── Schedules ──

export async function addEventSchedule(
  eventId: string,
  schedule: Omit<EventSchedule, "id" | "eventId" | "createdAt">
): Promise<EventSchedule> {
  const now = Date.now();
  const record: EventSchedule = {
    id: crypto.randomUUID(),
    eventId,
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    note: schedule.note,
    createdAt: now,
    updatedAt: now,
  };
  await Promise.all([
    db.eventSchedules.add(record),
    dbInsert("event_schedules", {
      id: record.id,
      event_id: record.eventId,
      starts_at: new Date(record.startsAt).toISOString(),
      ends_at: record.endsAt ? new Date(record.endsAt).toISOString() : null,
      note: record.note,
      created_at: new Date(record.createdAt).toISOString(),
      updated_at: new Date(record.updatedAt).toISOString(),
    }),
  ]);
  return record;
}

export async function updateEventSchedule(
  id: string,
  patch: Partial<Pick<EventSchedule, "startsAt" | "endsAt" | "note">>
): Promise<void> {
  const now = Date.now();
  const updates: Partial<EventSchedule> = { updatedAt: now };
  if (patch.startsAt !== undefined) updates.startsAt = patch.startsAt;
  if (patch.endsAt !== undefined) updates.endsAt = patch.endsAt;
  if (patch.note !== undefined) updates.note = patch.note;
  const cloudUpdate: Record<string, unknown> = { updated_at: new Date(now).toISOString() };
  if (patch.startsAt !== undefined)
    cloudUpdate.starts_at = new Date(patch.startsAt).toISOString();
  if (patch.endsAt !== undefined)
    cloudUpdate.ends_at = patch.endsAt ? new Date(patch.endsAt).toISOString() : null;
  if (patch.note !== undefined) cloudUpdate.note = patch.note;
  await Promise.all([
    db.eventSchedules.update(id, updates),
    dbUpdate("event_schedules", id, cloudUpdate),
  ]);
}

export async function deleteEventSchedule(id: string): Promise<void> {
  await Promise.all([db.eventSchedules.delete(id), dbDelete("event_schedules", id)]);
}

export async function updateEventConfig(id: string, config: EventConfig): Promise<void> {
  const now = Date.now();
  await Promise.all([
    db.events.update(id, { config, updatedAt: now }),
    dbUpdate("events", id, {
      config: JSON.stringify(config),
      updated_at: new Date(now).toISOString(),
    } as Record<string, unknown>),
  ]);
}

export async function deleteEvent(id: string): Promise<void> {
  const [roundIds, tableIds, scheduleIds] = await Promise.all([
    db.rounds.where("eventId").equals(id).toArray().then((rs) => rs.map((r) => r.id)),
    db.gameTables.where("eventId").equals(id).toArray().then((ts) => ts.map((t) => t.id)),
    db.eventSchedules.where("eventId").equals(id).toArray().then((ss) => ss.map((s) => s.id)),
  ]);

  // ローカル削除を並列で実行
  await Promise.all([
    db.gameTables.where("eventId").equals(id).delete(),
    db.rounds.where("eventId").equals(id).delete(),
    db.eventSchedules.where("eventId").equals(id).delete(),
    db.events.delete(id),
  ]);

  // クラウド削除を並列で実行
  await Promise.all([
    dbBatchDelete("game_tables", tableIds),
    dbBatchDelete("rounds", roundIds),
    dbBatchDelete("event_schedules", scheduleIds),
    dbDelete("events", id),
  ]);
}

// ── Round / Table ──

export async function addRound(
  round: Round,
  tables: TableAssignment[]
): Promise<void> {
  const supabaseTables = tables.map((t) => ({
    ...t,
    rawScores: t.rawScores as number[],
    chipCounts: t.chipCounts as number[],
  }));
  await Promise.all([
    db.rounds.add(round),
    db.gameTables.bulkAdd(tables),
    dbInsert("rounds", round),
    dbBatchInsert("game_tables", supabaseTables as unknown as Record<string, unknown>[]),
  ]);
}

export async function deleteRoundAndTables(
  roundId: string,
  tableIds: string[]
): Promise<void> {
  await Promise.all([
    db.gameTables.bulkDelete(tableIds),
    db.rounds.delete(roundId),
    dbBatchDelete("game_tables", tableIds),
    dbDelete("rounds", roundId),
  ]);
}

export async function replaceRoundTables(
  round: Round,
  oldTableIds: string[],
  newTables: TableAssignment[]
): Promise<void> {
  await Promise.all([
    db.gameTables.bulkDelete(oldTableIds),
    db.gameTables.bulkAdd(newTables),
    db.rounds.put(round),
    dbBatchDelete("game_tables", oldTableIds),
    dbBatchInsert(
      "game_tables",
      newTables.map((t) => ({ ...t })) as unknown as Record<string, unknown>[]
    ),
    dbUpdate("rounds", round.id, {
      restPlayerIds: round.restPlayerIds,
    } as Record<string, unknown>),
  ]);
}

export async function updateTableScores(
  tableId: string,
  rawScores: number[],
  chipCounts: number[],
  scoreEntered: boolean
): Promise<void> {
  await Promise.all([
    db.gameTables.update(tableId, { rawScores, chipCounts, scoreEntered }),
    dbUpdate("game_tables", tableId, {
      raw_scores: rawScores,
      chip_counts: chipCounts,
      score_entered: scoreEntered,
    } as Record<string, unknown>),
  ]);
}

// ── Sync ──

let syncCounter = 0;

export async function syncAllFromSupabase(lastSyncedAt?: number): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  syncCounter++;
  const fullSync = syncCounter % 3 === 0 || !lastSyncedAt;

  if (fullSync) {
    // フル同期（3回に1回または初期起動時）
    const [playersRes, eventsRes, schedulesRes, roundsRes, tablesRes] = await Promise.all([
      supabase.from("players").select("*").order("updated_at", { ascending: true }),
      supabase.from("events").select("*").order("updated_at", { ascending: true }),
      supabase.from("event_schedules").select("*").order("updated_at", { ascending: true }),
      supabase.from("rounds").select("*").order("updated_at", { ascending: true }),
      supabase.from("game_tables").select("*").order("updated_at", { ascending: true }),
    ]);
    if (playersRes.error) { console.warn("sync players error:", playersRes.error.message); return; }
    if (eventsRes.error) { console.warn("sync events error:", eventsRes.error.message); return; }
    if (schedulesRes.error) { console.warn("sync event_schedules error:", schedulesRes.error.message); return; }
    if (roundsRes.error) { console.warn("sync rounds error:", roundsRes.error.message); return; }
    if (tablesRes.error) { console.warn("sync tables error:", tablesRes.error.message); return; }

    await db.transaction(
      "rw",
      db.players, db.events, db.eventSchedules, db.rounds, db.gameTables,
      async () => {
        await Promise.all([
          db.players.clear(),
          db.events.clear(),
          db.eventSchedules.clear(),
          db.rounds.clear(),
          db.gameTables.clear(),
        ]);

        if (playersRes.data?.length) await db.players.bulkAdd(playersRes.data as Player[]);
        if (eventsRes.data?.length) {
          const mapped = eventsRes.data.map((e: Record<string, unknown>) => ({
            id: e.id as string,
            name: e.name as string,
            createdAt: new Date(e.created_at as string).getTime(),
            updatedAt: e.updated_at ? new Date(e.updated_at as string).getTime() : new Date(e.created_at as string).getTime(),
            config: typeof e.config === "string" ? JSON.parse(e.config) : e.config,
            playerIds: (e.player_ids as string[]) ?? [],
          }));
          await db.events.bulkAdd(mapped as MahjongEvent[]);
        }
        if (schedulesRes.data?.length) {
          const mapped = schedulesRes.data.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            eventId: s.event_id as string,
            startsAt: new Date(s.starts_at as string).getTime(),
            endsAt: s.ends_at ? new Date(s.ends_at as string).getTime() : null,
            note: (s.note as string) ?? "",
            createdAt: new Date(s.created_at as string).getTime(),
            updatedAt: s.updated_at ? new Date(s.updated_at as string).getTime() : new Date(s.created_at as string).getTime(),
          }));
          await db.eventSchedules.bulkAdd(mapped as EventSchedule[]);
        }
        if (roundsRes.data?.length) {
          const mapped = roundsRes.data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            eventId: r.event_id as string,
            index: r.index as number,
            createdAt: new Date(r.created_at as string).getTime(),
            updatedAt: r.updated_at ? new Date(r.updated_at as string).getTime() : new Date(r.created_at as string).getTime(),
            restPlayerIds: (r.rest_player_ids as string[]) ?? [],
          }));
          await db.rounds.bulkAdd(mapped as Round[]);
        }
        if (tablesRes.data?.length) {
          const mapped = tablesRes.data.map((t: Record<string, unknown>) => ({
            id: t.id as string,
            eventId: t.event_id as string,
            roundId: t.round_id as string,
            tableNumber: t.table_number as number,
            playerIds: (t.player_ids as string[]) ?? [],
            rawScores: (t.raw_scores as number[]) ?? [],
            chipCounts: (t.chip_counts as number[]) ?? [],
            scoreEntered: (t.score_entered as boolean) ?? false,
            createdAt: new Date(t.created_at as string).getTime(),
            updatedAt: t.updated_at ? new Date(t.updated_at as string).getTime() : new Date(t.created_at as string).getTime(),
          }));
          await db.gameTables.bulkAdd(mapped as TableAssignment[]);
        }
      }
    );
  } else if (lastSyncedAt) {
    // 差分同期
    const since = new Date(lastSyncedAt).toISOString();
    const [playersRes, eventsRes, schedulesRes, roundsRes, tablesRes] = await Promise.all([
      supabase.from("players").select("*").gt("updated_at", since),
      supabase.from("events").select("*").gt("updated_at", since),
      supabase.from("event_schedules").select("*").gt("updated_at", since),
      supabase.from("rounds").select("*").gt("updated_at", since),
      supabase.from("game_tables").select("*").gt("updated_at", since),
    ]);
    if (playersRes.error) return;
    if (eventsRes.error) return;
    if (schedulesRes.error) return;
    if (roundsRes.error) return;
    if (tablesRes.error) return;

    const upsertBatch = async (
      table: any,
      data: Record<string, unknown>[],
      mapFn: (item: Record<string, unknown>) => any
    ) => {
      if (!data.length) return;
      const mapped = data.map(mapFn);
      await Promise.all(mapped.map((item) => table.put(item)));
    };

    await Promise.all([
      upsertBatch(db.players, playersRes.data ?? [], (i: Record<string, unknown>) => ({
        id: i.id as string,
        name: i.name as string,
        createdAt: new Date(i.created_at as string).getTime(),
        updatedAt: new Date(i.updated_at as string).getTime(),
      })),
      upsertBatch(db.events, eventsRes.data ?? [], (i: Record<string, unknown>) => ({
        id: i.id as string,
        name: i.name as string,
        createdAt: new Date(i.created_at as string).getTime(),
        updatedAt: new Date(i.updated_at as string).getTime(),
        config: typeof i.config === "string" ? JSON.parse(i.config) : i.config,
        playerIds: (i.player_ids as string[]) ?? [],
      })),
      upsertBatch(db.eventSchedules, schedulesRes.data ?? [], (i: Record<string, unknown>) => ({
        id: i.id as string,
        eventId: i.event_id as string,
        startsAt: new Date(i.starts_at as string).getTime(),
        endsAt: i.ends_at ? new Date(i.ends_at as string).getTime() : null,
        note: (i.note as string) ?? "",
        createdAt: new Date(i.created_at as string).getTime(),
        updatedAt: new Date(i.updated_at as string).getTime(),
      })),
      upsertBatch(db.rounds, roundsRes.data ?? [], (i: Record<string, unknown>) => ({
        id: i.id as string,
        eventId: i.event_id as string,
        index: i.index as number,
        createdAt: new Date(i.created_at as string).getTime(),
        updatedAt: new Date(i.updated_at as string).getTime(),
        restPlayerIds: (i.rest_player_ids as string[]) ?? [],
      })),
      upsertBatch(db.gameTables, tablesRes.data ?? [], (i: Record<string, unknown>) => ({
        id: i.id as string,
        eventId: i.event_id as string,
        roundId: i.round_id as string,
        tableNumber: i.table_number as number,
        playerIds: (i.player_ids as string[]) ?? [],
        rawScores: (i.raw_scores as number[]) ?? [],
        chipCounts: (i.chip_counts as number[]) ?? [],
        scoreEntered: (i.score_entered as boolean) ?? false,
        createdAt: new Date(i.created_at as string).getTime(),
        updatedAt: new Date(i.updated_at as string).getTime(),
      })),
    ]);
  }
}

// ── Bulk push: local IndexedDB → Supabase ──

export async function pushAllToCloud(): Promise<{
  players: number;
  events: number;
  schedules: number;
  rounds: number;
  tables: number;
}> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase が設定されていません。");

  const [players, events, schedules, rounds, tables] = await Promise.all([
    db.players.toArray(),
    db.events.toArray(),
    db.eventSchedules.toArray(),
    db.rounds.toArray(),
    db.gameTables.toArray(),
  ]);

  // Supabaseへの5テーブル並列アップロード
  const uploadTasks: Promise<unknown>[] = [];
  if (players.length) {
    uploadTasks.push(dbBatchInsert("players", players as unknown[]));
  }
  if (events.length) {
    const mapped = events.map((e) => ({
      id: e.id,
      name: e.name,
      created_at: new Date(e.createdAt).toISOString(),
      config: JSON.stringify(e.config),
      player_ids: e.playerIds,
    }));
    uploadTasks.push(dbBatchInsert("events", mapped as unknown[]));
  }
  if (schedules.length) {
    const mapped = schedules.map((s) => ({
      id: s.id,
      event_id: s.eventId,
      starts_at: new Date(s.startsAt).toISOString(),
      ends_at: s.endsAt ? new Date(s.endsAt).toISOString() : null,
      note: s.note,
      created_at: new Date(s.createdAt).toISOString(),
    }));
    uploadTasks.push(dbBatchInsert("event_schedules", mapped as unknown[]));
  }
  if (rounds.length) {
    const mapped = rounds.map((r) => ({
      id: r.id,
      event_id: r.eventId,
      index: r.index,
      created_at: new Date(r.createdAt).toISOString(),
      rest_player_ids: r.restPlayerIds,
    }));
    uploadTasks.push(dbBatchInsert("rounds", mapped as unknown[]));
  }
  if (tables.length) {
    const mapped = tables.map((t) => ({
      id: t.id,
      event_id: t.eventId,
      round_id: t.roundId,
      table_number: t.tableNumber,
      player_ids: t.playerIds,
      raw_scores: t.rawScores,
      chip_counts: t.chipCounts,
      score_entered: t.scoreEntered,
      created_at: new Date(t.createdAt).toISOString(),
    }));
    uploadTasks.push(dbBatchInsert("game_tables", mapped as unknown[]));
  }
  if (uploadTasks.length) await Promise.all(uploadTasks);

  return {
    players: players.length,
    events: events.length,
    schedules: schedules.length,
    rounds: rounds.length,
    tables: tables.length,
  };
}
