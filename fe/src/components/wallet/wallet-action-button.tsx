"use client";

import { useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { monadTestnet } from "@/lib/web3/monad-testnet";
import { useProtocolReadiness } from "@/hooks/use-protocol-readiness";

type WalletActionButtonProps = {
  className?: string;
  mode?: "manage" | "trade";
};

export function WalletActionButton({
  className = "",
  mode = "manage",
}: WalletActionButtonProps) {
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { contractsReady, isConnected, isOnMonad, shortAddress } =
    useProtocolReadiness();

  const primaryConnector = connectors[0];
  const pending = isConnecting || isSwitching;

  const baseClassName =
    "rounded-full px-4 py-2 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-70";
  const mergedClassName = `${baseClassName} ${className}`.trim();

  if (!isConnected) {
    return (
      <button
        type="button"
        className={mergedClassName}
        disabled={!primaryConnector || pending}
        onClick={() => primaryConnector && connect({ connector: primaryConnector })}
      >
        {pending ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  if (!isOnMonad) {
    return (
      <button
        type="button"
        className={mergedClassName}
        disabled={pending}
        onClick={() => switchChain({ chainId: monadTestnet.id })}
      >
        {pending ? "Switching..." : "Switch to Monad"}
      </button>
    );
  }

  if (mode === "trade") {
    return (
      <button type="button" className={mergedClassName} disabled>
        {contractsReady ? "Wallet ready for protocol" : "Awaiting contract deploy"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={mergedClassName}
      onClick={() => disconnect()}
    >
      {shortAddress ? `Disconnect ${shortAddress}` : "Disconnect"}
    </button>
  );
}
