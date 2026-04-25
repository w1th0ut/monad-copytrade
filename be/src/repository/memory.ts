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

export const users = new Map<string, UserVaultState>([
  [
    "0x84c00000000000000000000000000000000019c4",
    {
      address: "0x84c00000000000000000000000000000000019c4",
      totalDeposit: 3200,
      totalClaimedYield: 48.3,
      vUsdBalance: 184,
      claimableYield: 12.6,
    },
  ],
  [
    "0x41d00000000000000000000000000000000077aa",
    {
      address: "0x41d00000000000000000000000000000000077aa",
      totalDeposit: 1750,
      totalClaimedYield: 92.1,
      vUsdBalance: 321.4,
      claimableYield: 26.8,
    },
  ],
]);

export const leaders: LeaderProfile[] = [
  {
    address: "0x1000000000000000000000000000000000000001",
    username: "Delta K",
    style: "ETH breakout",
    winRate: 71,
    totalPnl: 48200,
    followers: 182,
  },
  {
    address: "0x1000000000000000000000000000000000000002",
    username: "Mono S",
    style: "BTC scalp",
    winRate: 68,
    totalPnl: 32700,
    followers: 134,
  },
  {
    address: "0x1000000000000000000000000000000000000003",
    username: "Rhea",
    style: "SOL swing",
    winRate: 73,
    totalPnl: 19400,
    followers: 96,
  },
];

export const subscriptions: Subscription[] = [
  {
    follower: "0x84c00000000000000000000000000000000019c4",
    leader: "0x1000000000000000000000000000000000000001",
    margin: 250,
    leverage: 12,
    stopLossBps: 5000,
  },
  {
    follower: "0x41d00000000000000000000000000000000077aa",
    leader: "0x1000000000000000000000000000000000000002",
    margin: 180,
    leverage: 10,
    stopLossBps: 4000,
  },
];

export const activeTrades: ActiveTrade[] = [
  {
    id: 1,
    follower: "0x84c00000000000000000000000000000000019c4",
    leader: "0x1000000000000000000000000000000000000001",
    pair: "ETH/USD",
    entryPrice: 3184.7,
    stopLossPrice: 3128.4,
    size: 3000,
    margin: 250,
    side: "long",
    status: "open",
  },
  {
    id: 2,
    follower: "0x41d00000000000000000000000000000000077aa",
    leader: "0x1000000000000000000000000000000000000002",
    pair: "BTC/USD",
    entryPrice: 66240,
    stopLossPrice: 66880,
    size: 1800,
    margin: 180,
    side: "short",
    status: "open",
  },
];

export const priceCache = new Map<string, { price: number; updatedAt: number }>([
  ["ETH/USD", { price: 3184.7, updatedAt: Date.now() }],
  ["BTC/USD", { price: 66240, updatedAt: Date.now() }],
  ["SOL/USD", { price: 144.2, updatedAt: Date.now() }],
]);

export const vaultActivity: VaultActivity[] = [
  {
    id: 1,
    event: "loss_vaulted",
    address: "0x84c00000000000000000000000000000000019c4",
    amount: 184,
    receipt: "184.00 vUSD",
    timestamp: new Date().toISOString(),
  },
  {
    id: 2,
    event: "yield_claimed",
    address: "0x41d00000000000000000000000000000000077aa",
    amount: 42.83,
    receipt: "USDC paid",
    timestamp: new Date().toISOString(),
  },
];

export const stats: StatsState = {
  totalTvl: 2_840_000,
  totalVolume: 18_200_000,
  totalYieldDistributed: 128_400,
  totalFollowers: subscriptions.length,
  keeperMode: "In-memory Express",
  lastSyncAt: new Date().toISOString(),
};
