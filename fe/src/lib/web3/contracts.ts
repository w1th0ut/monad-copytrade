import { parseAbi } from "viem";

const isAddress = (value?: string): value is `0x${string}` =>
  Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));

const normalizeAddress = (value?: string) =>
  isAddress(value) ? value : undefined;

export const protocolAddresses = {
  vault: normalizeAddress(process.env.NEXT_PUBLIC_VAULT_ADDRESS),
  tradingEngine: normalizeAddress(process.env.NEXT_PUBLIC_TRADING_ENGINE_ADDRESS),
  copyTradeRegistry: normalizeAddress(
    process.env.NEXT_PUBLIC_COPY_TRADE_REGISTRY_ADDRESS,
  ),
  vUsd: normalizeAddress(process.env.NEXT_PUBLIC_VUSD_ADDRESS),
};

export const hasProtocolAddresses = Object.values(protocolAddresses).every(Boolean);

export const vaultAbi = parseAbi([
  "function depositLiquidity(uint256 amount)",
  "function claimYield()",
  "function previewClaimableYield(address user) view returns (uint256)",
  "function accumulatedYield() view returns (uint256)",
  "function totalLockedLossLiquidity() view returns (uint256)",
]);

export const tradingEngineAbi = parseAbi([
  "function deposit(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function openPosition(address leader, bytes32 pairId, bool isLong, uint256 margin, uint256 leverage, uint256 entryPrice, uint256 stopLossPrice) returns (uint256)",
  "function closePosition(uint256 positionId, uint256 exitPrice)",
  "function executeStopLoss(uint256 positionId, uint256 exitPrice)",
  "function idleBalance(address user) view returns (uint256)",
]);

export const copyTradeRegistryAbi = parseAbi([
  "function registerLeader(string username)",
  "function getRegisteredLeaders() view returns (address[])",
  "function leaderUsername(address leader) view returns (string)",
  "function followLeader(address leader, uint256 margin, uint256 leverage, uint256 stopLossBps)",
  "function unfollowLeader(address leader)",
  "function getFollowers(address leader) view returns (address[])",
]);

export const vUsdAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
]);
