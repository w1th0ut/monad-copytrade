const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "");

if (!API_BASE) {
  throw new Error("NEXT_PUBLIC_BACKEND_URL is required");
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  const json = await res.json();
  return json.data as T;
}

export type StatsResponse = {
  totalTvl: number;
  totalVolume: number;
  totalYieldDistributed: number;
  totalFollowers: number;
  keeperMode: string;
  lastSyncAt: string;
  prices: Record<string, { price: number; updatedAt: number }>;
};

export type LeaderResponse = {
  address: string;
  username: string;
  style: string;
  winRate: number;
  totalPnl: number;
  followers: number;
};

export type UserVaultResponse = {
  address: string;
  totalDeposit: number;
  totalClaimedYield: number;
  vUsdBalance: number;
  claimableYield: number;
  followerConfigCount: number;
  shareOfVaultBps: number;
};

export type ActiveTradeResponse = {
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

export type VaultActivityResponse = {
  id: number;
  event: "loss_vaulted" | "yield_claimed" | "fee_split";
  address: string;
  amount: number;
  receipt: string;
  timestamp: string;
};

export const api = {
  getStats: () => fetchApi<StatsResponse>("/api/v1/stats"),
  getLeaders: () => fetchApi<LeaderResponse[]>("/api/v1/leaders"),
  getActiveTrades: () => fetchApi<ActiveTradeResponse[]>("/api/v1/trades/active"),
  getVaultActivity: () => fetchApi<VaultActivityResponse[]>("/api/v1/vault/activity"),
  getUserVault: (address: string) =>
    fetchApi<UserVaultResponse>(`/api/v1/user/${address}/vault`),
};
