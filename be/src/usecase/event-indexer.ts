/**
 * On-chain state reader:
 * - Reads vault totals and positions from chain.
 * - Rebuilds activeTrades from TradingEngine positions mapping.
 * - Aggregates realized PnL/win-rate by scanning PositionClosed events.
 */

import { formatUnits, keccak256, toBytes } from "viem";
import { publicClient, tradingEngineAbi, vaultAbi, vUsdAbi } from "../lib/chain.js";
import { env } from "../config/env.js";
import { activeTrades, leaderStats, stats } from "../repository/memory.js";

const USDC_DECIMALS = 6;
const PRICE_DECIMALS = 8;
const KNOWN_PAIR_BY_HASH: Record<string, string> = {
  [keccak256(toBytes("ETH/USD")).toLowerCase()]: "ETH/USD",
  [keccak256(toBytes("BTC/USD")).toLowerCase()]: "BTC/USD",
  [keccak256(toBytes("SOL/USD")).toLowerCase()]: "SOL/USD",
  [keccak256(toBytes("ETH/USDC")).toLowerCase()]: "ETH/USDC",
  [keccak256(toBytes("BTC/USDC")).toLowerCase()]: "BTC/USDC",
};

function toUsdc(raw: bigint): number {
  return Number(formatUnits(raw, USDC_DECIMALS));
}

const accountedClosedIds = new Set<number>();
let lastScannedBlock = 0n;

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
    activeTrades.length = 0;

    if (count <= 0) {
      stats.totalVolume = 0;
      return;
    }

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
              `0x${string}`,
              `0x${string}`,
              `0x${string}`,
              boolean,
              boolean,
              bigint,
              bigint,
              bigint,
              bigint,
              bigint,
            ],
          }))
          .catch(() => null),
      ),
    );

    for (const entry of results) {
      if (!entry) continue;

      const [trader, leader, pairId, isLong, isOpen, margin, , size, entryPrice, stopLossPrice] =
        entry.result;

      let pair = KNOWN_PAIR_BY_HASH[pairId.toLowerCase()];
      if (!pair) {
        const decoded = Buffer.from(pairId.slice(2), "hex")
          .toString("utf8")
          .replace(/\0/g, "")
          .trim();
        pair =
          /^[\x20-\x7E]+$/.test(decoded) && decoded.length > 0
            ? decoded
            : "ETH/USD";
      }

      activeTrades.push({
        id: Number(entry.id),
        follower: trader,
        leader,
        pairId,
        pair,
        entryPrice: Number(formatUnits(entryPrice, PRICE_DECIMALS)),
        stopLossPrice: Number(formatUnits(stopLossPrice, PRICE_DECIMALS)),
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

async function refreshLeaderStats() {
  const engineAddr = env.TRADING_ENGINE_ADDRESS as `0x${string}` | undefined;
  if (!engineAddr) return;

  const unaccountedClosed = activeTrades.filter(
    (t) => t.status === "closed" && !accountedClosedIds.has(t.id),
  );
  if (unaccountedClosed.length === 0 && lastScannedBlock > 0n) return;

  try {
    const tip = await publicClient.getBlockNumber();
    const startEnv = env.START_BLOCK ? BigInt(env.START_BLOCK) : 0n;
    const RECENT_WINDOW = 500n;
    const initialFrom =
      startEnv > 0n ? startEnv : tip > RECENT_WINDOW ? tip - RECENT_WINDOW : 0n;
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
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.warn(
          `[chain-reader] getLogs ${from}-${to} failed: ${(err as Error).message}`,
        );
        break;
      }
    }

    if (scannedTo > lastScannedBlock) {
      lastScannedBlock = scannedTo;
    }

    for (const trade of unaccountedClosed) {
      const pnlRaw = pnlByPositionId.get(trade.id);
      if (pnlRaw === undefined) continue;

      const pnlUsdc = Number(formatUnits(pnlRaw, USDC_DECIMALS));
      const key = trade.leader.toLowerCase();
      const prev = leaderStats.get(key) ?? {
        address: trade.leader,
        wins: 0,
        losses: 0,
        realizedPnl: 0,
      };

      prev.realizedPnl += pnlUsdc;
      if (pnlUsdc > 0) prev.wins += 1;
      else if (pnlUsdc < 0) prev.losses += 1;

      leaderStats.set(key, prev);
      accountedClosedIds.add(trade.id);
    }
  } catch (err) {
    console.error("[chain-reader] refreshLeaderStats failed:", (err as Error).message);
  }
}

async function refreshVusdSupply() {
  const vusdAddr = env.VUSD_ADDRESS as `0x${string}` | undefined;
  if (!vusdAddr) return;

  try {
    const supply = (await publicClient.readContract({
      address: vusdAddr,
      abi: vUsdAbi,
      functionName: "totalSupply",
    })) as bigint;
    (stats as unknown as Record<string, unknown>).totalVusdSupply = toUsdc(supply);
  } catch (err) {
    console.error("[chain-reader] refreshVusdSupply failed:", (err as Error).message);
  }
}

let intervalId: NodeJS.Timeout | undefined;

export function startEventIndexer(pollIntervalMs = 6_000) {
  if (intervalId) return;

  void runReadCycle();
  intervalId = setInterval(() => {
    void runReadCycle();
  }, pollIntervalMs);

  console.log(`[chain-reader] started (poll every ${pollIntervalMs}ms)`);
}

export function stopEventIndexer() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = undefined;
}

async function runReadCycle() {
  await refreshVaultStats();
  await refreshOpenPositions();
  await refreshVusdSupply();
  await refreshLeaderStats();
}
