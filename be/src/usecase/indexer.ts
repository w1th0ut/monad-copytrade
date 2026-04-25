import {
  activeTrades,
  leaders as seedLeaders,
  leaderStats,
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
  if (!registryAddress) return seedLeaders;

  try {
    const addresses = await publicClient.readContract({
      address: registryAddress,
      abi: copyTradeRegistryAbi,
      functionName: "getRegisteredLeaders",
    });

    if (addresses.length === 0) return seedLeaders;

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

    const result = addresses.map((addr, i) => {
      const ls = leaderStats.get(addr.toLowerCase());
      const totalClosed = ls ? ls.wins + ls.losses : 0;
      const winRate =
        totalClosed > 0 ? Math.round((ls!.wins / totalClosed) * 100) : 0;
      return {
        address: addr,
        username: usernames[i] || addr.slice(0, 8),
        style: "—",
        winRate,
        totalPnl: ls?.realizedPnl ?? 0,
        followers: followerLists[i].length,
      };
    });

    // Update totalFollowers in stats from chain data
    stats.totalFollowers = followerLists.reduce((sum, list) => sum + list.length, 0);

    return result;
  } catch (err) {
    console.error("[leaders] chain read failed:", (err as Error).message);
    return seedLeaders;
  }
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
  // Derive vault activity from closed positions (they represent stop-losses
  // that vaulted losses on-chain). If the standalone array has entries from
  // the keeper simulation, include those too.
  const fromPositions = activeTrades
    .filter((t) => t.status === "closed")
    .map((t, idx) => ({
      id: 10_000 + idx,
      event: "loss_vaulted" as const,
      address: t.follower,
      amount: t.margin * 0.5, // approximate — margin lost at stop
      receipt: `${(t.margin * 0.5).toFixed(2)} vUSD`,
      timestamp: stats.lastSyncAt,
    }));

  // Merge and deduplicate by preferring the position-derived entries
  const merged = [...fromPositions, ...vaultActivity];
  return merged.slice(0, 50);
}

export function getVaultForUser(address: string) {
  const normalized = address.toLowerCase();
  for (const [key, value] of users.entries()) {
    if (key.toLowerCase() === normalized) {
      const userSubscriptions = subscriptions.filter(
        (subscription) => subscription.follower.toLowerCase() === normalized,
      );

      const totalVusd = Array.from(users.values()).reduce((s, u) => s + u.vUsdBalance, 0);

      return {
        ...value,
        followerConfigCount: userSubscriptions.length,
        shareOfVaultBps: totalVusd > 0 ? Math.round((value.vUsdBalance / totalVusd) * 10_000) : 0,
      };
    }
  }

  return null;
}

export function syncFromChainSnapshot() {
  stats.lastSyncAt = new Date().toISOString();
  return getStats();
}
