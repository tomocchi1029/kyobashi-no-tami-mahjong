export interface Player {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface EventConfig {
  startingPoints: number;
  returnPoints: number;
  uma: number[];
  rate: number;
  chipValue: number;
  allowThreePlayerTable: boolean;
  tableSize: number;
  noRate: boolean;
}

export interface MahjongEvent {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  config: EventConfig;
  playerIds: string[];
}

export interface EventSchedule {
  id: string;
  eventId: string;
  startsAt: number;
  endsAt: number | null;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface Round {
  id: string;
  eventId: string;
  index: number;
  createdAt: number;
  updatedAt: number;
  restPlayerIds: string[];
}

export interface TableAssignment {
  id: string;
  eventId: string;
  roundId: string;
  tableNumber: number;
  playerIds: string[];
  rawScores: number[];
  chipCounts: number[];
  scoreEntered: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerRoundResult {
  playerId: string;
  rank: number;
  rawScore: number;
  chipCount: number;
  matchPoint: number;
  money: number;
}

export interface PlayerAggregate {
  playerId: string;
  games: number;
  totalMatchPoint: number;
  totalMoney: number;
  ranks: number[];
  averageRank: number;
  bestRank: number;
}

export const M_LEAGUE_CONFIG: EventConfig = {
  startingPoints: 25000,
  returnPoints: 30000,
  uma: [30, 10, -10, -30],
  rate: 0.5,
  chipValue: 100,
  allowThreePlayerTable: false,
  tableSize: 4,
  noRate: false,
};

export const M_LEAGUE_NO_RATE_CONFIG: EventConfig = {
  ...M_LEAGUE_CONFIG,
  uma: [...M_LEAGUE_CONFIG.uma],
  noRate: true,
};

export function defaultConfig(): EventConfig {
  return { ...M_LEAGUE_CONFIG, uma: [...M_LEAGUE_CONFIG.uma] };
}

export function okaPerPlayer(config: EventConfig): number {
  return config.returnPoints - config.startingPoints;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const SEATS = ["東", "南", "西", "北"];
