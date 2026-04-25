import { env } from "../config/env.js";
import { priceCache, activeTrades } from "../repository/memory.js";

/**
 * KeeperService — fetches live prices and exposes status.
 *
 * Position settlement (stop-loss execution) happens on-chain via the
 * keeper wallet. This service only maintains a price cache for the
 * dashboard UI to display mark prices.
 */

const PYTH_PRICE_FEED_IDS: Record<string, string> = {
  "ETH/USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "BTC/USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "SOL/USD": "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
};

const PYTH_ENDPOINT = env.PYTH_ENDPOINT;

export class KeeperService {
  private intervalId?: NodeJS.Timeout;

  start() {
    if (this.intervalId) return;

    // Fetch prices immediately on startup
    void this.fetchPrices();

    this.intervalId = setInterval(() => {
      void this.fetchPrices();
    }, env.KEEPER_POLL_INTERVAL_MS);
  }

  stop() {
    if (!this.intervalId) return;
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
      trackedTrades: activeTrades.filter((t) => t.status === "open").length,
      cacheStatus,
    };
  }

  private async fetchPrices() {
    const feedIds = Object.values(PYTH_PRICE_FEED_IDS);
    const pairNames = Object.keys(PYTH_PRICE_FEED_IDS);

    try {
      const url = new URL("/v2/updates/price/latest", PYTH_ENDPOINT);
      for (const id of feedIds) {
        url.searchParams.append("ids[]", id);
      }
      url.searchParams.set("parsed", "true");

      const res = await fetch(url.toString());
      if (!res.ok) {
        console.error(`[keeper] Pyth HTTP ${res.status}`);
        return;
      }

      const json = (await res.json()) as {
        parsed: Array<{
          id: string;
          price: { price: string; expo: number };
        }>;
      };

      for (const entry of json.parsed) {
        const idx = feedIds.findIndex(
          (fid) => fid.replace("0x", "") === entry.id.replace("0x", ""),
        );
        if (idx === -1) continue;

        const rawPrice = Number(entry.price.price);
        const expo = entry.price.expo;
        const price = rawPrice * Math.pow(10, expo);

        priceCache.set(pairNames[idx], {
          price: Number(price.toFixed(2)),
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error("[keeper] price fetch failed:", (err as Error).message);
    }
  }
}
