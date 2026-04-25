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
  leaderStats,
  type LeaderStats,
} from "../repository/memory.js";

const USDC_DECIMALS = 6;

function toUsdc(raw: bigint): number {
  return Number(formatUnits(raw, USDC_DECIMALS));
}

// Track which positionIds we've already accounted for in leaderStats so we
// don't double-count if logs arrive multiple times.
const accountedClosedIds = new Set<number>();
// Track the last block we successfully scanned so each cycle only paginates
// the delta. Reset to 0 on startup → first cycle does the historical sweep.
let lastScannedBlock = 0n;

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

// ─── Aggregate realized PnL / win-rate per leader from closed positions ──
// Strategy: walk every positionId, if !isOpen and we haven't accounted for it
// yet, fetch the PositionClosed event for that id to get the signed pnl, then
// add it to the leader's bucket.
async function refreshLeaderStats() {
  const engineAddr = env.TRADING_ENGINE_ADDRESS as `0x${string}` | undefined;
  if (!engineAddr) return;

  // Find closed positions we haven't accounted for yet
  const unaccountedClosed = activeTrades.filter(
    (t) => t.status === "closed" && !accountedClosedIds.has(t.id),
  );

  try {
    // Monad testnet caps eth_getLogs at 100 blocks per call → paginate.
    const tip = await publicClient.getBlockNumber();
    const startEnv = env.START_BLOCK ? BigInt(env.START_BLOCK) : 0n;
    // First cycle: historical sweep from START_BLOCK (or recent window) to tip.
    // Subsequent cycles: only the delta since lastScannedBlock to keep RPC load low.
    // Window kept small (500 blocks ≈ ~10 min on Monad) because the public RPC
    // throttles aggressively. For longer history, set START_BLOCK in .env.
    const RECENT_WINDOW = 500n;
    const initialFrom =
      startEnv > 0n
        ? startEnv
        : tip > RECENT_WINDOW
          ? tip - RECENT_WINDOW
          : 0n;
    const fromBlock =
      lastScannedBlock > 0n && lastScannedBlock + 1n <= tip
        ? lastScannedBlock + 1n
        : initialFrom;
    const CHUNK = 100n;

    const event = {
      type: "event",
      name: "PositionClosed",
      inputs: [
        { type: "uint256", name: "positionId", indexed: true },
        { type: "int256", name: "pnl", indexed: false },
        { type: "uint256", name: "fee", indexed: false },
        { type: "uint256", name: "exitPrice", indexed: false },
      ],
    } as const;

    const pnlByPositionId = new Map<number, bigint>();
    let scannedTo = lastScannedBlock;
    let chunkCount = 0;
    for (let from = fromBlock; from <= tip; from += CHUNK) {
      const to = from + CHUNK - 1n > tip ? tip : from + CHUNK - 1n;
      try {
        const logs = await publicClient.getLogs({
          address: engineAddr,
          event,
          fromBlock: from,
          toBlock: to,
        });
        for (const log of logs) {
          const id = Number(log.args.positionId);
          const pnl = log.args.pnl as bigint;
          pnlByPositionId.set(id, pnl);
        }
        scannedTo = to;
        chunkCount++;
        // 1s/chunk during the initial sweep keeps us well under any sane
        // rate-limit and makes failures rare. Delta sweeps after that touch
        // ~1 chunk, so this is only painful once at startup.
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        console.warn(
          `[chain-reader] getLogs ${from}-${to} failed: ${(err as Error).message}`,
        );
        break; // stop the sweep so we retry from the same point next cycle
      }
    }
    if (scannedTo > lastScannedBlock) lastScannedBlock = scannedTo;

    for (const trade of unaccountedClosed) {
      const pnlRaw = pnlByPositionId.get(trade.id);
      if (pnlRaw === undefined) continue; // event not yet seen, try next cycle

      const pnlUsdc = Number(pnlRaw) / 1e6; // pnl emitted in USDC base units
      const leaderKey = trade.leader.toLowerCase();
      const prev = leaderStats.get(leaderKey) ?? {
        address: trade.leader,
        wins: 0,
        losses: 0,
        realizedPnl: 0,
      };
      prev.realizedPnl += pnlUsdc;
      if (pnlUsdc > 0) prev.wins += 1;
      else if (pnlUsdc < 0) prev.losses += 1;
      leaderStats.set(leaderKey, prev);
      accountedClosedIds.add(trade.id);
    }
  } catch (err) {
    console.error(
      "[chain-reader] refreshLeaderStats failed:",
      (err as Error).message,
    );
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
  console.log("[chain-reader] cycle start");
  // Run sequentially, not Promise.all — the public RPC is rate-limited and
  // firing 3+ batches simultaneously is the fastest way to get 429'd.
  await refreshVaultStats();
  console.log("[chain-reader] vault stats ok");
  await refreshOpenPositions();
  console.log(
    `[chain-reader] positions ok (${activeTrades.length} total, ${activeTrades.filter((t) => t.status === "closed").length} closed)`,
  );
  await refreshVusdSupply();
  console.log("[chain-reader] vusd ok");
  await refreshLeaderStats();
  console.log(
    `[chain-reader] leader stats ok (accounted=${accountedClosedIds.size}, lastBlock=${lastScannedBlock})`,
  );
}
