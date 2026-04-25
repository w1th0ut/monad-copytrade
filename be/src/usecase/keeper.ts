import { env } from "../config/env.js";
import {
  activeTrades,
  priceCache,
  stats,
  users,
  vaultActivity,
} from "../repository/memory.js";

export class KeeperService {
  private intervalId?: NodeJS.Timeout;
  private nextVaultActivityId = vaultActivity.length + 1;

  start() {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.tick();
    }, env.KEEPER_POLL_INTERVAL_MS);
  }

  stop() {
    if (!this.intervalId) {
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = undefined;
  }

  getStatus() {
    const cacheStatus = Array.from(priceCache.entries()).map(([pair, state]) => ({
      pair,
      price: state.price,
      ageMs: Date.now() - state.updatedAt,
      stale: Date.now() - state.updatedAt > env.MAX_PRICE_STALE_MS,
    }));

    return {
      running: Boolean(this.intervalId),
      pollIntervalMs: env.KEEPER_POLL_INTERVAL_MS,
      maxPriceStaleMs: env.MAX_PRICE_STALE_MS,
      trackedTrades: activeTrades.filter((trade) => trade.status === "open").length,
      cacheStatus,
    };
  }

  private tick() {
    for (const [pair, current] of priceCache.entries()) {
      const drift = Number(((Math.random() - 0.5) * 3.2).toFixed(2));
      priceCache.set(pair, {
        price: Number((current.price + drift).toFixed(2)),
        updatedAt: Date.now(),
      });
    }

    for (const trade of activeTrades) {
      if (trade.status !== "open") {
        continue;
      }

      const latest = priceCache.get(trade.pair);
      if (!latest) {
        continue;
      }

      const stale = Date.now() - latest.updatedAt > env.MAX_PRICE_STALE_MS;
      if (stale) {
        continue;
      }

      const stopTriggered =
        trade.side === "long"
          ? latest.price <= trade.stopLossPrice
          : latest.price >= trade.stopLossPrice;

      if (!stopTriggered) {
        continue;
      }

      trade.status = "closed";

      const user = users.get(trade.follower);
      if (user) {
        const vaultedAmount = Number((trade.margin * 0.5).toFixed(2));
        user.vUsdBalance = Number((user.vUsdBalance + vaultedAmount).toFixed(2));
        user.claimableYield = Number((user.claimableYield + vaultedAmount * 0.03).toFixed(2));

        vaultActivity.unshift({
          id: this.nextVaultActivityId++,
          event: "loss_vaulted",
          address: trade.follower,
          amount: vaultedAmount,
          receipt: `${vaultedAmount.toFixed(2)} vUSD`,
          timestamp: new Date().toISOString(),
        });
      }

      stats.totalTvl += Math.round(trade.margin * 0.5);
      stats.lastSyncAt = new Date().toISOString();
    }
  }
}
