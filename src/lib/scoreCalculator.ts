import {
  type EventConfig,
  type TableAssignment,
  type PlayerRoundResult,
  type PlayerAggregate,
  okaPerPlayer,
} from "./types";

export function computeResults(
  table: TableAssignment,
  config: EventConfig
): PlayerRoundResult[] {
  const n = table.playerIds.length;
  if (n === 0 || table.rawScores.length !== n || table.chipCounts.length !== n) {
    return [];
  }

  const indexed = table.playerIds.map((pid, i) => ({
    playerId: pid,
    score: table.rawScores[i],
    chip: table.chipCounts[i],
    originalIndex: i,
  }));

  const sorted = [...indexed].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.originalIndex - b.originalIndex;
  });

  const okaTotal = n * okaPerPlayer(config);

  return sorted.map((item, rankOffset) => {
    const rank = rankOffset + 1;
    const uma = config.uma[rank - 1] ?? 0;
    const oka = rank === 1 ? okaTotal / 1000 : 0;
    const matchPoint = (item.score - config.returnPoints) / 1000 + uma + oka;
    const money = config.noRate
      ? 0
      : matchPoint * config.rate + item.chip * config.chipValue;
    return {
      playerId: item.playerId,
      rank,
      rawScore: item.score,
      chipCount: item.chip,
      matchPoint,
      money,
    };
  });
}

export function aggregatePlayerStats(
  scoredTables: TableAssignment[],
  config: EventConfig,
  playerIds: string[]
): PlayerAggregate[] {
  const map = new Map<string, PlayerAggregate>();
  for (const pid of playerIds) {
    map.set(pid, {
      playerId: pid,
      games: 0,
      totalMatchPoint: 0,
      totalMoney: 0,
      ranks: [],
      averageRank: 0,
      bestRank: 0,
    });
  }

  for (const table of scoredTables) {
    if (!table.scoreEntered) continue;
    if (!table.playerIds.every((pid) => map.has(pid))) continue;
    const results = computeResults(table, config);
    for (const r of results) {
      const agg = map.get(r.playerId);
      if (!agg) continue;
      agg.games += 1;
      agg.totalMatchPoint += r.matchPoint;
      agg.totalMoney += r.money;
      agg.ranks.push(r.rank);
    }
  }

  for (const agg of map.values()) {
    agg.averageRank = agg.ranks.length
      ? agg.ranks.reduce((s, r) => s + r, 0) / agg.ranks.length
      : 0;
    agg.bestRank = agg.ranks.length ? Math.min(...agg.ranks) : 0;
  }

  return [...map.values()];
}

export function overallRanking(
  scoredTables: TableAssignment[],
  config: EventConfig,
  playerIds: string[]
): PlayerAggregate[] {
  return aggregatePlayerStats(scoredTables, config, playerIds).sort((a, b) => {
    if (config.noRate) {
      if (b.totalMatchPoint !== a.totalMatchPoint)
        return b.totalMatchPoint - a.totalMatchPoint;
      return a.averageRank - b.averageRank;
    }
    if (b.totalMoney !== a.totalMoney) return b.totalMoney - a.totalMoney;
    return b.totalMatchPoint - a.totalMatchPoint;
  });
}
