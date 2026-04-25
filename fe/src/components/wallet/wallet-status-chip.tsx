"use client";

import { useProtocolReadiness } from "@/hooks/use-protocol-readiness";

export function WalletStatusChip() {
  const { chain, isConnected, isOnMonad, shortAddress } = useProtocolReadiness();

  const label = !isConnected
    ? "Wallet disconnected"
    : !isOnMonad
      ? `Wrong network${chain?.name ? `: ${chain.name}` : ""}`
      : `Monad ready${shortAddress ? `: ${shortAddress}` : ""}`;

  return (
    <div className="hidden rounded-full border border-line bg-panel px-3 py-2 font-mono text-xs text-foreground lg:block">
      {label}
    </div>
  );
}
