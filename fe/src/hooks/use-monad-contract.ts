"use client";

import { useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, parseAbi } from "viem";
import {
  protocolAddresses,
  vaultAbi,
  tradingEngineAbi,
  copyTradeRegistryAbi,
  vUsdAbi,
} from "@/lib/web3/contracts";

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

const mockUsdcAbi = parseAbi([
  "function mint(address to, uint256 amount)",
]);

const rawUsdc = process.env.NEXT_PUBLIC_USDC_ADDRESS;
const USDC_ADDRESS =
  rawUsdc && /^0x[a-fA-F0-9]{40}$/.test(rawUsdc)
    ? (rawUsdc as `0x${string}`)
    : undefined;

const USDC_DECIMALS = 6;

export { USDC_ADDRESS, USDC_DECIMALS };

export function useUsdcApproval(spender: `0x${string}` | undefined) {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && spender ? [address, spender] : undefined,
    query: { enabled: Boolean(address && spender && USDC_ADDRESS) },
  });

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && USDC_ADDRESS) },
  });

  const approve = useCallback(
    (amount: bigint) => {
      if (!USDC_ADDRESS || !spender) return;
      writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amount],
      });
    },
    [writeContract, spender],
  );

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  return { allowance, balance, approve, isPending, isConfirming, hash };
}

export function useDeposit() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const deposit = useCallback(
    (amountUsdc: number) => {
      if (!protocolAddresses.tradingEngine) return;
      writeContract({
        address: protocolAddresses.tradingEngine,
        abi: tradingEngineAbi,
        functionName: "deposit",
        args: [parseUnits(String(amountUsdc), USDC_DECIMALS)],
      });
    },
    [writeContract],
  );

  return { deposit, isPending, isConfirming, hash };
}

export function useDepositVault() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const depositLiquidity = useCallback(
    (amountUsdc: number) => {
      if (!protocolAddresses.vault) return;
      writeContract({
        address: protocolAddresses.vault,
        abi: vaultAbi,
        functionName: "depositLiquidity",
        args: [parseUnits(String(amountUsdc), USDC_DECIMALS)],
      });
    },
    [writeContract],
  );

  return { depositLiquidity, isPending, isConfirming, hash };
}

export function useFollowLeader() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const followLeader = useCallback(
    (
      leader: `0x${string}`,
      marginUsdc: number,
      leverage: number,
      stopLossBps: number,
    ) => {
      if (!protocolAddresses.copyTradeRegistry) return;
      writeContract({
        address: protocolAddresses.copyTradeRegistry,
        abi: copyTradeRegistryAbi,
        functionName: "followLeader",
        args: [
          leader,
          parseUnits(String(marginUsdc), USDC_DECIMALS),
          BigInt(leverage),
          BigInt(stopLossBps),
        ],
      });
    },
    [writeContract],
  );

  return { followLeader, isPending, isConfirming, hash };
}

export function useUnfollowLeader() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const unfollowLeader = useCallback(
    (leader: `0x${string}`) => {
      if (!protocolAddresses.copyTradeRegistry) return;
      writeContract({
        address: protocolAddresses.copyTradeRegistry,
        abi: copyTradeRegistryAbi,
        functionName: "unfollowLeader",
        args: [leader],
      });
    },
    [writeContract],
  );

  return { unfollowLeader, isPending, isConfirming, hash };
}

export function useClaimYield() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const claimYield = useCallback(() => {
    if (!protocolAddresses.vault) return;
    writeContract({
      address: protocolAddresses.vault,
      abi: vaultAbi,
      functionName: "claimYield",
    });
  }, [writeContract]);

  return { claimYield, isPending, isConfirming, hash };
}

export function useIdleBalance() {
  const { address } = useAccount();

  return useReadContract({
    address: protocolAddresses.tradingEngine,
    abi: tradingEngineAbi,
    functionName: "idleBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && protocolAddresses.tradingEngine) },
  });
}

export function useVusdBalance() {
  const { address } = useAccount();

  return useReadContract({
    address: protocolAddresses.vUsd,
    abi: vUsdAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && protocolAddresses.vUsd) },
  });
}

export function useClaimableYield() {
  const { address } = useAccount();

  return useReadContract({
    address: protocolAddresses.vault,
    abi: vaultAbi,
    functionName: "previewClaimableYield",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && protocolAddresses.vault) },
  });
}

export function useUsdcBalance() {
  const { address } = useAccount();

  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && USDC_ADDRESS) },
  });
}

export function useMintUsdc() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const mint = useCallback(
    (amountUsdc: number) => {
      if (!USDC_ADDRESS || !address) return;
      writeContract({
        address: USDC_ADDRESS,
        abi: mockUsdcAbi,
        functionName: "mint",
        args: [address, parseUnits(String(amountUsdc), USDC_DECIMALS)],
      });
    },
    [writeContract, address],
  );

  return { mint, isPending, isConfirming, hash };
}

export function useLeaderUsername(address?: `0x${string}`) {
  return useReadContract({
    address: protocolAddresses.copyTradeRegistry,
    abi: copyTradeRegistryAbi,
    functionName: "leaderUsername",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && protocolAddresses.copyTradeRegistry) },
  });
}

export function useOpenPosition() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const openPosition = useCallback(
    (params: {
      leader: `0x${string}`;
      pairId: `0x${string}`;
      isLong: boolean;
      marginUsdc: number;
      leverage: number;
      entryPrice: number; // human-readable USD price
      stopLossPrice: number; // human-readable USD price
    }) => {
      if (!protocolAddresses.tradingEngine) return;
      // Scale prices by 1e8 (Pyth/Chainlink convention)
      const entry = BigInt(Math.round(params.entryPrice * 1e8));
      const sl = BigInt(Math.round(params.stopLossPrice * 1e8));
      writeContract({
        address: protocolAddresses.tradingEngine,
        abi: tradingEngineAbi,
        functionName: "openPosition",
        args: [
          params.leader,
          params.pairId,
          params.isLong,
          parseUnits(String(params.marginUsdc), USDC_DECIMALS),
          BigInt(params.leverage),
          entry,
          sl,
        ],
      });
    },
    [writeContract],
  );

  return { openPosition, isPending, isConfirming, hash };
}

export function useRegisterLeader() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const registerLeader = useCallback(
    (username: string) => {
      if (!protocolAddresses.copyTradeRegistry) return;
      writeContract({
        address: protocolAddresses.copyTradeRegistry,
        abi: copyTradeRegistryAbi,
        functionName: "registerLeader",
        args: [username],
      });
    },
    [writeContract],
  );

  return { registerLeader, isPending, isConfirming, hash };
}
