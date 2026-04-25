import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "../config/env.js";

const monadChain = defineChain({
  id: env.MONAD_CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [env.MONAD_RPC_URL],
    },
  },
});

export const publicClient = createPublicClient({
  chain: monadChain,
  transport: http(env.MONAD_RPC_URL, {
    // Monad public RPC is strict; disable batching/retries here and keep
    // reads serialized at call sites.
    retryCount: 0,
  }),
});

const keeperPrivateKey = env.KEEPER_PRIVATE_KEY
  ? (env.KEEPER_PRIVATE_KEY.startsWith("0x")
      ? env.KEEPER_PRIVATE_KEY
      : `0x${env.KEEPER_PRIVATE_KEY}`) as `0x${string}`
  : undefined;

export const keeperAccount = keeperPrivateKey
  ? privateKeyToAccount(keeperPrivateKey)
  : undefined;

export const walletClient = keeperAccount
  ? createWalletClient({
      chain: monadChain,
      transport: http(env.MONAD_RPC_URL, { retryCount: 0 }),
      account: keeperAccount,
    })
  : undefined;

export const copyTradeRegistryAbi = parseAbi([
  "function getRegisteredLeaders() view returns (address[])",
  "function leaderUsername(address leader) view returns (string)",
  "function getFollowers(address leader) view returns (address[])",
  "function subscriptions(address follower, address leader) view returns (bool active, uint256 margin, uint256 leverage, uint256 stopLossBps)",
]);

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

export const tradingEngineAbi = parseAbi([
  "function keeper() view returns (address)",
  "function copyTradeRegistry() view returns (address)",
  "function nextPositionId() view returns (uint256)",
  "function positions(uint256) view returns (address trader, address leader, bytes32 pairId, bool isLong, bool isOpen, uint256 margin, uint256 leverage, uint256 size, uint256 entryPrice, uint256 stopLossPrice)",
  "function mirrorTradeFor(address follower, address leader, bytes32 pairId, bool isLong, uint256 entryPrice) returns (uint256)",
  "event PositionOpened(uint256 indexed positionId, address indexed trader, address indexed leader, uint256 margin, uint256 leverage)",
  "event PositionClosed(uint256 indexed positionId, int256 pnl, uint256 fee, uint256 exitPrice)",
  "event StopLossExecuted(uint256 indexed positionId, uint256 exitPrice, uint256 lossMovedToVault)",
  "event Deposited(address indexed user, uint256 amount)",
  "event Withdrawn(address indexed user, uint256 amount)",
]);

export const vUsdAbi = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);
