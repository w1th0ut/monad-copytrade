"use client";

import { useAccount } from "wagmi";
import { hasProtocolAddresses } from "@/lib/web3/contracts";
import { monadTestnet } from "@/lib/web3/monad-testnet";

export function useProtocolReadiness() {
  const { address, chain, isConnected } = useAccount();

  return {
    address,
    chain,
    isConnected,
    isOnMonad: chain?.id === monadTestnet.id,
    contractsReady: hasProtocolAddresses,
    shortAddress: address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : undefined,
  };
}
