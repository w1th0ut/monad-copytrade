export type UserVaultState = {
  address: string;
  totalDeposit: number;
  totalClaimedYield: number;
  vUsdBalance: number;
  claimableYield: number;
};

export type LeaderProfile = {
  address: string;
  username: string;
  style: string;
  winRate: number;
  totalPnl: number;
  followers: number;
};

export type Subscription = {
  follower: string;
  leader: string;
  margin: number;
  leverage: number;
  stopLossBps: number;
};

export type ActiveTrade = {
  id: number;
  follower: string;
  leader: string;
  pair: string;
  entryPrice: number;
  stopLossPrice: number;
  size: number;
  margin: number;
  side: "long" | "short";
  status: "open" | "closed";
};

export type LeaderStats = {
  address: string;
  wins: number;
  losses: number;
  realizedPnl: number;
};

export type VaultActivity = {
  id: number;
  event: "loss_vaulted" | "yield_claimed" | "fee_split";
  address: string;
  amount: number;
  receipt: string;
  timestamp: string;
};

type StatsState = {
  totalTvl: number;
  totalVolume: number;
  totalYieldDistributed: number;
  totalFollowers: number;
  keeperMode: string;
  lastSyncAt: string;
};

// ─── All collections start empty; populated by the event-indexer ──

export const users = new Map<string, UserVaultState>();

/** Fallback seed leaders shown when no on-chain leaders exist yet. */
export const leaders: LeaderProfile[] = [];

export const subscriptions: Subscription[] = [];

export const activeTrades: ActiveTrade[] = [];

/** Aggregated realized PnL/win-rate per leader address (lowercased key). */
export const leaderStats = new Map<string, LeaderStats>();

export const priceCache = new Map<string, { price: number; updatedAt: number }>([
  ["ETH/USD", { price: 0, updatedAt: 0 }],
  ["BTC/USD", { price: 0, updatedAt: 0 }],
  ["SOL/USD", { price: 0, updatedAt: 0 }],
]);

export const vaultActivity: VaultActivity[] = [];

export const stats: StatsState = {
  totalTvl: 0,
  totalVolume: 0,
  totalYieldDistributed: 0,
  totalFollowers: 0,
  keeperMode: "On-chain indexer",
  lastSyncAt: new Date().toISOString(),
};
