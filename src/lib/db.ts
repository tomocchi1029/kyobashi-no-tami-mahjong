import Dexie, { type Table } from "dexie";
import type { Player, MahjongEvent, Round, TableAssignment, EventSchedule } from "./types";

export class MahjongDB extends Dexie {
  players!: Table<Player, string>;
  events!: Table<MahjongEvent, string>;
  eventSchedules!: Table<EventSchedule, string>;
  rounds!: Table<Round, string>;
  gameTables!: Table<TableAssignment, string>;

  constructor() {
    super("MahjongScoreRecord");
    this.version(3).stores({
      players: "id, name, createdAt, updatedAt",
      events: "id, name, createdAt, updatedAt",
      eventSchedules: "id, eventId, startsAt, updatedAt",
      rounds: "id, eventId, index, updatedAt",
      gameTables: "id, eventId, roundId, tableNumber, updatedAt",
    });
  }
}

let _db: MahjongDB | null = null;

export function getDB(): MahjongDB {
  if (!_db) _db = new MahjongDB();
  return _db;
}

export const db = getDB();
