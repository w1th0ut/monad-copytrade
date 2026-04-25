import {
  activeTrades,
  priceCache,
  stats,
  subscriptions,
  users,
  vaultActivity,
} from "../repository/memory.js";
import { copyTradeRegistryAbi, publicClient } from "../lib/chain.js";
import { env } from "../config/env.js";

export async function getLeaders() {
  const registryAddress = env.COPY_TRADE_REGISTRY_ADDRESS as `0x${string}` | undefined;
  if (!registryAddress) return [];

  const addresses = await publicClient.readContract({
    address: registryAddress,
    abi: copyTradeRegistryAbi,
    functionName: "getRegisteredLeaders",
  });

  if (addresses.length === 0) return [];

  const [usernames, followerLists] = await Promise.all([
    Promise.all(
      addresses.map((addr) =>
        publicClient.readContract({
          address: registryAddress,
          abi: copyTradeRegistryAbi,
          functionName: "leaderUsername",
          args: [addr],
        }),
      ),
    ),
    Promise.all(
      addresses.map((addr) =>
        publicClient.readContract({
          address: registryAddress,
          abi: copyTradeRegistryAbi,
          functionName: "getFollowers",
          args: [addr],
        }),
      ),
    ),
  ]);

  return addresses.map((addr, i) => ({
    address: addr,
    username: usernames[i] || addr.slice(0, 8),
    style: "—",
    winRate: 0,
    totalPnl: 0,
    followers: followerLists[i].length,
  }));
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
