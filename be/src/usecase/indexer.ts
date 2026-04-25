import {
  activeTrades,
  leaders,
  priceCache,
  stats,
  subscriptions,
  users,
  vaultActivity,
} from "../repository/memory.js";

export function getLeaders() {
  return leaders;
}

export function getStats() {
  return {
    totalTvl: stats.totalTvl,
    totalVolume: stats.totalVolume,
    totalYieldDistributed: stats.totalYieldDistributed,
    totalFollowers: stats.totalFollowers,
    keeperMode: stats.keeperMode,
    lastSyncAt: stats.lastSyncAt,
    prices: Object.fromEntries(priceCache),
  };
}

export function getActiveTrades() {
  return activeTrades.filter((trade) => trade.status === "open");
}

export function getVaultActivity() {
  return vaultActivity;
}

export function getVaultForUser(address: string) {
  const normalized = address.toLowerCase();
  for (const [key, value] of users.entries()) {
    if (key.toLowerCase() === normalized) {
      const userSubscriptions = subscriptions.filter(
        (subscription) => subscription.follower.toLowerCase() === normalized,
      );

      return {
        ...value,
        followerConfigCount: userSubscriptions.length,
        shareOfVaultBps: Math.round((value.vUsdBalance / 505.4) * 10_000),
      };
    }
  }

  return null;
}

export function syncFromChainSnapshot() {
  stats.lastSyncAt = new Date().toISOString();
  priceCache.set("ETH/USD", {
    price: Number((3180 + Math.random() * 15).toFixed(2)),
    updatedAt: Date.now(),
  });
  priceCache.set("BTC/USD", {
    price: Number((66100 + Math.random() * 300).toFixed(2)),
    updatedAt: Date.now(),
  });

  return getStats();
}
