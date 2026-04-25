/**
 * On-chain state reader.
 *
 * Polls Vault & TradingEngine via readContract (no getLogs) to populate
 * vault activity, stats, and open positions with real chain data.
 */

import { formatUnits } from "viem";
import {
  publicClient,
  vaultAbi,
  tradingEngineAbi,
  vUsdAbi,
} from "../lib/chain.js";
import { env } from "../config/env.js";
import {
  type ActiveTrade,
  activeTrades,
  priceCache,
  stats,
  users,
} from "../repository/memory.js";

const USDC_DECIMALS = 6;

function toUsdc(raw: bigint): number {
  return Number(formatUnits(raw, USDC_DECIMALS));
}

// ─── Read vault state from chain ──────────────────────────────────
async function refreshVaultStats() {
  const vaultAddr = env.VAULT_ADDRESS as `0x${string}` | undefined;
  if (!vaultAddr) return;

  try {
    const [lockedLoss, accumulated, manualLiq] = await Promise.all([
      publicClient.readContract({
        address: vaultAddr,
        abi: vaultAbi,
        functionName: "totalLockedLossLiquidity",
      }) as Promise<bigint>,
      publicClient.readContract({
        address: vaultAddr,
        abi: vaultAbi,
        functionName: "accumulatedYield",
      }) as Promise<bigint>,
      publicClient.readContract({
        address: vaultAddr,
        abi: vaultAbi,
        functionName: "totalManualLiquidity",
      }) as Promise<bigint>,
    ]);

    stats.totalTvl = toUsdc(lockedLoss) + toUsdc(manualLiq);
    stats.totalYieldDistributed = toUsdc(accumulated);
    stats.lastSyncAt = new Date().toISOString();
  } catch (err) {
    console.error("[chain-reader] refreshVaultStats failed:", (err as Error).message);
  }
}

// ─── Read all positions from TradingEngine ────────────────────────
async function refreshOpenPositions() {
  const engineAddr = env.TRADING_ENGINE_ADDRESS as `0x${string}` | undefined;
  if (!engineAddr) return;

  try {
    const nextId = (await publicClient.readContract({
      address: engineAddr,
      abi: tradingEngineAbi,
      functionName: "nextPositionId",
    })) as bigint;

    const count = Number(nextId) - 1;
    if (count <= 0) {
      activeTrades.length = 0;
      stats.totalVolume = 0;
      return;
    }

    // Read each position struct from the mapping
    const ids = Array.from({ length: count }, (_, i) => BigInt(i + 1));

    const results = await Promise.all(
      ids.map((id) =>
        publicClient
          .readContract({
            address: engineAddr,
            abi: tradingEngineAbi,
            functionName: "positions",
            args: [id],
          })
          .then((r) => ({
            id,
            result: r as readonly [
              string,   // trader
              string,   // leader
              `0x${string}`, // pairId
              boolean,  // isLong
              boolean,  // isOpen
              bigint,   // margin
              bigint,   // leverage
              bigint,   // size
              bigint,   // entryPrice
              bigint,   // stopLossPrice
            ],
          }))
          .catch(() => null),
      ),
    );

    // Rebuild the array from chain data
    activeTrades.length = 0;

    for (const entry of results) {
      if (!entry) continue;
      const [trader, leader, pairId, isLong, isOpen, margin, leverage, size, entryPrice, stopLossPrice] =
        entry.result;

      // Decode pairId bytes32 → readable string
      // Try ASCII-padded decode first; if non-printable, fall back to lookup or default
      const KNOWN_PAIRS: Record<string, string> = {
        "0x4554482f55534443000000000000000000000000000000000000000000000000": "ETH/USDC",
        "0x4254432f55534443000000000000000000000000000000000000000000000000": "BTC/USDC",
      };

      let pairStr = KNOWN_PAIRS[pairId];
      if (!pairStr) {
        const decoded = Buffer.from(pairId.slice(2), "hex")
          .toString("utf8")
          .replace(/\0/g, "")
          .trim();
        // Only use if it looks like printable ASCII
        pairStr = /^[\x20-\x7E]+$/.test(decoded) && decoded.length > 0
          ? decoded
          : "ETH/USD";
      }

      activeTrades.push({
        id: Number(entry.id),
        follower: trader,
        leader,
        pair: pairStr,
        entryPrice: Number(entryPrice) / 1e8,
        stopLossPrice: Number(stopLossPrice) / 1e8,
        size: toUsdc(size),
        margin: toUsdc(margin),
        side: isLong ? "long" : "short",
        status: isOpen ? "open" : "closed",
      });
    }

    stats.totalVolume = activeTrades.reduce((sum, t) => sum + t.size, 0);
  } catch (err) {
    console.error("[chain-reader] refreshOpenPositions failed:", (err as Error).message);
  }
}

// ─── Read vUSD supply for vault activity context ──────────────────
async function refreshVusdSupply() {
  const vusdAddr = env.VUSD_ADDRESS as `0x${string}` | undefined;
  if (!vusdAddr) return;

  try {
    const supply = (await publicClient.readContract({
      address: vusdAddr,
      abi: vUsdAbi,
      functionName: "totalSupply",
    })) as bigint;

    // Store in stats for frontend reference
    (stats as any).totalVusdSupply = toUsdc(supply);
  } catch (err) {
    console.error("[chain-reader] refreshVusdSupply failed:", (err as Error).message);
  }
}

// ─── Public API ───────────────────────────────────────────────────
let intervalId: NodeJS.Timeout | undefined;

export function startEventIndexer(pollIntervalMs = 6_000) {
  if (intervalId) return;

  // Run immediately on startup
  void runReadCycle();

  intervalId = setInterval(() => {
    void runReadCycle();
  }, pollIntervalMs);

  console.log(`[chain-reader] started (poll every ${pollIntervalMs}ms)`);
}

export function stopEventIndexer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
}

async function runReadCycle() {
  await Promise.all([
    refreshVaultStats(),
    refreshOpenPositions(),
    refreshVusdSupply(),
  ]);
}
