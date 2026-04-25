import { createPublicClient, http, parseAbi } from "viem";
import { env } from "../config/env.js";

export const publicClient = createPublicClient({
  transport: http(env.MONAD_RPC_URL),
});

// ─── CopyTradeRegistry ABI ────────────────────────────────────────
export const copyTradeRegistryAbi = parseAbi([
  "function getRegisteredLeaders() view returns (address[])",
  "function leaderUsername(address leader) view returns (string)",
  "function getFollowers(address leader) view returns (address[])",
]);

// ─── Vault ABI (read + events) ────────────────────────────────────
export const vaultAbi = parseAbi([
  "function totalLockedLossLiquidity() view returns (uint256)",
  "function accumulatedYield() view returns (uint256)",
  "function totalManualLiquidity() view returns (uint256)",
  "function previewClaimableYield(address user) view returns (uint256)",
  "event LossVaulted(address indexed user, uint256 amount, uint256 receiptMinted)",
  "event YieldClaimed(address indexed user, uint256 amount)",
  "event FeeIncomeDeposited(uint256 amount)",
  "event LiquidityDeposited(address indexed provider, uint256 amount)",
]);

// ─── TradingEngine ABI (read + events) ────────────────────────────
export const tradingEngineAbi = parseAbi([
  "function nextPositionId() view returns (uint256)",
  "function positions(uint256) view returns (address trader, address leader, bytes32 pairId, bool isLong, bool isOpen, uint256 margin, uint256 leverage, uint256 size, uint256 entryPrice, uint256 stopLossPrice)",
  "event PositionOpened(uint256 indexed positionId, address indexed trader, address indexed leader, uint256 margin, uint256 leverage)",
  "event PositionClosed(uint256 indexed positionId, int256 pnl, uint256 fee, uint256 exitPrice)",
  "event StopLossExecuted(uint256 indexed positionId, uint256 exitPrice, uint256 lossMovedToVault)",
  "event Deposited(address indexed user, uint256 amount)",
  "event Withdrawn(address indexed user, uint256 amount)",
]);

// ─── vUSD ABI ─────────────────────────────────────────────────────
export const vUsdAbi = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);
