import { keccak256, toBytes } from "viem";
import { env } from "../config/env.js";
import { activeTrades, priceCache } from "../repository/memory.js";
import {
  copyTradeRegistryAbi,
  keeperAccount,
  publicClient,
  tradingEngineAbi,
  walletClient,
} from "../lib/chain.js";

const PYTH_PRICE_FEED_IDS: Record<string, string> = {
  "ETH/USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "BTC/USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "SOL/USD": "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
};

const PYTH_ENDPOINT = env.PYTH_ENDPOINT;

function isAddress(value?: string): value is `0x${string}` {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

function lower(value: string) {
  return value.toLowerCase();
}

export class KeeperService {
  private intervalId?: NodeJS.Timeout;
  private mirroredTradeKeys = new Set<string>();
  private mirrorSuccessCount = 0;
  private mirrorFailureCount = 0;
  private lastMirrorError?: string;
  private cycleRunning = false;

  start() {
    if (this.intervalId) return;

    void this.runCycle();
    this.intervalId = setInterval(() => {
      void this.runCycle();
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
      mirrorEnabled: this.canMirror(),
      keeperAddress: keeperAccount?.address,
      pollIntervalMs: env.KEEPER_POLL_INTERVAL_MS,
      maxPriceStaleMs: env.MAX_PRICE_STALE_MS,
      trackedTrades: activeTrades.filter((t) => t.status === "open").length,
      mirrorSuccessCount: this.mirrorSuccessCount,
      mirrorFailureCount: this.mirrorFailureCount,
      lastMirrorError: this.lastMirrorError,
      cacheStatus,
    };
  }

  private async runCycle() {
    if (this.cycleRunning) return;
    this.cycleRunning = true;
    try {
      await this.fetchPrices();
      await this.processMirrorTrades();
    } finally {
      this.cycleRunning = false;
    }
  }

  private canMirror() {
    return Boolean(
      walletClient &&
        keeperAccount &&
        isAddress(env.TRADING_ENGINE_ADDRESS) &&
        isAddress(env.COPY_TRADE_REGISTRY_ADDRESS),
    );
  }

  private async processMirrorTrades() {
    if (!this.canMirror()) {
      return;
    }

    const tradingEngine = env.TRADING_ENGINE_ADDRESS as `0x${string}`;
    const registry = env.COPY_TRADE_REGISTRY_ADDRESS as `0x${string}`;
    const leaderTrades = activeTrades.filter(
      (trade) =>
        trade.status === "open" &&
        lower(trade.follower) === lower(trade.leader),
    );

    for (const leaderTrade of leaderTrades) {
      let followers: readonly `0x${string}`[] = [];
      try {
        followers = await publicClient.readContract({
          address: registry,
          abi: copyTradeRegistryAbi,
          functionName: "getFollowers",
          args: [leaderTrade.leader as `0x${string}`],
        });
      } catch (error) {
        this.lastMirrorError =
          error instanceof Error ? error.message : String(error);
        this.mirrorFailureCount += 1;
        continue;
      }

      for (const follower of followers) {
        if (lower(follower) === lower(leaderTrade.leader)) {
          continue;
        }

        const key = `${leaderTrade.id}:${lower(follower)}`;
        if (this.mirroredTradeKeys.has(key)) {
          continue;
        }

        try {
          const [active] = await publicClient.readContract({
            address: registry,
            abi: copyTradeRegistryAbi,
            functionName: "subscriptions",
            args: [follower, leaderTrade.leader as `0x${string}`],
          });

          if (!active) continue;

          const pairId =
            leaderTrade.pairId ??
            (keccak256(toBytes(leaderTrade.pair)) as `0x${string}`);

          const entryPrice = BigInt(Math.round(leaderTrade.entryPrice * 1e8));

          const { request } = await publicClient.simulateContract({
            account: keeperAccount!,
            address: tradingEngine,
            abi: tradingEngineAbi,
            functionName: "mirrorTradeFor",
            args: [
              follower,
              leaderTrade.leader as `0x${string}`,
              pairId,
              leaderTrade.side === "long",
              entryPrice,
            ],
          });

          const hash = await walletClient!.writeContract(request);
          this.mirroredTradeKeys.add(key);
          this.mirrorSuccessCount += 1;
          this.lastMirrorError = undefined;
          console.log("[keeper] mirror success", {
            leaderPositionId: leaderTrade.id,
            follower,
            hash,
          });
        } catch (error) {
          this.mirrorFailureCount += 1;
          this.lastMirrorError =
            error instanceof Error ? error.message : String(error);
          console.error("[keeper] mirror failed", {
            leaderPositionId: leaderTrade.id,
            follower,
            error: this.lastMirrorError,
          });
        }
      }
    }
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
