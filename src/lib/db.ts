import Dexie, { type Table } from "dexie";
import type { Player, MahjongEvent, Round, TableAssignment } from "./types";

export class MahjongDB extends Dexie {
  players!: Table<Player, string>;
  events!: Table<MahjongEvent, string>;
  rounds!: Table<Round, string>;
  gameTables!: Table<TableAssignment, string>;

  constructor() {
    super("MahjongScoreRecord");
    this.version(1).stores({
      players: "id, name, createdAt",
      events: "id, name, createdAt",
      rounds: "id, eventId, index",
      gameTables: "id, eventId, roundId, tableNumber",
    });
  }
}

let _db: MahjongDB | null = null;

export function getDB(): MahjongDB {
  if (!_db) _db = new MahjongDB();
  return _db;
}

export const db = getDB();
