import type { EventConfig, Round, TableAssignment } from "./types";
import { uid } from "./types";
import { db } from "./db";
import { addRound, deleteRoundAndTables, replaceRoundTables } from "./dataService";

type PairingCounts = Map<string, Map<string, number>>;

function buildPairingCounts(tables: TableAssignment[]): PairingCounts {
  const counts: PairingCounts = new Map();
  for (const table of tables) {
    updatePairingCounts(counts, table.playerIds);
  }
  return counts;
}

function updatePairingCounts(
  counts: PairingCounts,
  playerIds: string[]
): void {
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const a = playerIds[i];
      const b = playerIds[j];
      counts.get(a)?.get(b);
      if (!counts.has(a)) counts.set(a, new Map());
      if (!counts.has(b)) counts.set(b, new Map());
      counts.get(a)!.set(b, (counts.get(a)!.get(b) ?? 0) + 1);
      counts.get(b)!.set(a, (counts.get(b)!.get(a) ?? 0) + 1);
    }
  }
}

function pairingPenalty(
  order: string[],
  counts: PairingCounts,
  size: number
): number {
  let penalty = 0;
  let cursor = 0;
  while (cursor + size <= order.length) {
    const group = order.slice(cursor, cursor + size);
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const c = counts.get(group[i])?.get(group[j]) ?? 0;
        penalty += c * c;
      }
    }
    cursor += size;
  }
  return penalty;
}

function fairShuffle(
  playerIds: string[],
  counts: PairingCounts,
  size: number
): string[] {
  if (playerIds.length <= 4) {
    return [...playerIds].sort(() => Math.random() - 0.5);
  }
  const result = [...playerIds].sort(() => Math.random() - 0.5);
  const iterations = 50;
  for (let it = 0; it < iterations; it++) {
    const i = Math.floor(Math.random() * result.length);
    const j = Math.floor(Math.random() * result.length);
    if (i === j) continue;
    const currentPenalty = pairingPenalty(result, counts, size);
    [result[i], result[j]] = [result[j], result[i]];
    const newPenalty = pairingPenalty(result, counts, size);
    if (newPenalty > currentPenalty) {
      [result[i], result[j]] = [result[j], result[i]];
    }
  }
  return result;
}

function splitIntoTables(
  order: string[],
  config: EventConfig
): { tables: string[][]; rest: string[] } {
  const size = config.tableSize;
  const allowThree = config.allowThreePlayerTable;
  const n = order.length;
  const tables: string[][] = [];

  if (allowThree && size === 4 && n % size === 2) {
    const tableCount4 = Math.max(0, Math.floor(n / size) - 1);
    let cursor = 0;
    for (let i = 0; i < tableCount4; i++) {
      tables.push(order.slice(cursor, cursor + size));
      cursor += size;
    }
    if (cursor + 3 <= n) {
      tables.push(order.slice(cursor, cursor + 3));
      cursor += 3;
    }
    if (cursor + 3 <= n) {
      tables.push(order.slice(cursor, cursor + 3));
      cursor += 3;
    }
    const rest = cursor < n ? order.slice(cursor) : [];
    return { tables, rest };
  }

  let cursor = 0;
  while (cursor + size <= n) {
    tables.push(order.slice(cursor, cursor + size));
    cursor += size;
  }
  const rest = cursor < n ? order.slice(cursor) : [];
  return { tables, rest };
}

function buildTableRecords(
  eventId: string,
  roundId: string,
  groups: string[][],
  config: EventConfig
): TableAssignment[] {
  return groups.map((pids, i) => ({
    id: uid(),
    eventId,
    roundId,
    tableNumber: i + 1,
    playerIds: pids,
    rawScores: pids.map(() => config.startingPoints),
    chipCounts: pids.map(() => 0),
    scoreEntered: false,
    createdAt: Date.now(),
  }));
}

export async function generateRounds(
  eventId: string,
  playerIds: string[],
  config: EventConfig,
  numberOfRounds: number
): Promise<void> {
  const existingRounds = await db.rounds
    .where("eventId")
    .equals(eventId)
    .sortBy("index");
  const startIndex =
    (existingRounds[existingRounds.length - 1]?.index ?? 0) + 1;

  const existingTables = await db.gameTables
    .where("eventId")
    .equals(eventId)
    .toArray();
  const pairingCounts = buildPairingCounts(existingTables);

  for (let offset = 0; offset < numberOfRounds; offset++) {
    const roundIndex = startIndex + offset;
    const roundId = uid();
    const order = fairShuffle([...playerIds], pairingCounts, config.tableSize);
    const { tables, rest } = splitIntoTables(order, config);
    const round: Round = {
      id: roundId,
      eventId,
      index: roundIndex,
      createdAt: Date.now(),
      restPlayerIds: rest,
    };
    const tableRecords = buildTableRecords(eventId, roundId, tables, config);
    await addRound(round, tableRecords);
    for (const t of tableRecords) {
      updatePairingCounts(pairingCounts, t.playerIds);
    }
  }
}

export async function regenerateRound(
  roundId: string,
  eventId: string,
  playerIds: string[],
  config: EventConfig
): Promise<void> {
  const round = await db.rounds.get(roundId);
  if (!round) return;

  const oldTables = await db.gameTables
    .where("roundId")
    .equals(roundId)
    .toArray();
  const oldTableIds = oldTables.map((t) => t.id);

  const allTables = await db.gameTables
    .where("eventId")
    .equals(eventId)
    .toArray();
  const pairingCounts = buildPairingCounts(allTables);

  const order = fairShuffle([...playerIds], pairingCounts, config.tableSize);
  const { tables, rest } = splitIntoTables(order, config);
  const tableRecords = buildTableRecords(eventId, roundId, tables, config);

  round.restPlayerIds = rest;
  await replaceRoundTables(round, oldTableIds, tableRecords);
}

export async function deleteRound(roundId: string): Promise<void> {
  const oldTables = await db.gameTables
    .where("roundId")
    .equals(roundId)
    .toArray();
  const oldTableIds = oldTables.map((t) => t.id);
  await deleteRoundAndTables(roundId, oldTableIds);
}
