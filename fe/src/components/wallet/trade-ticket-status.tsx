"use client";

import { useProtocolReadiness } from "@/hooks/use-protocol-readiness";
import { WalletActionButton } from "@/components/wallet/wallet-action-button";

export function TradeTicketStatus() {
  const { contractsReady, isConnected, isOnMonad } = useProtocolReadiness();

  return (
    <div className="border-t border-line px-4 py-5">
      <div className="mb-4 grid gap-3 rounded-3xl border border-line bg-canvas px-4 py-4 text-sm">
        <StatusRow
          label="Wallet"
          value={isConnected ? "Connected" : "Disconnected"}
          tone={isConnected ? "positive" : "warning"}
        />
        <StatusRow
          label="Network"
          value={isOnMonad ? "Monad testnet" : "Switch required"}
          tone={isOnMonad ? "positive" : "warning"}
        />
        <StatusRow
          label="Contracts"
          value={contractsReady ? "Addresses configured" : "Deployment pending"}
          tone={contractsReady ? "positive" : "warning"}
        />
      </div>
      <WalletActionButton
        mode="trade"
        className="w-full bg-accent text-background hover:opacity-90"
      />
      <p className="mt-3 text-center text-xs leading-5 text-muted">
        Wallet wiring is live. Deposit, follow, and claim actions will bind to the
        deployed contracts once addresses are set in `fe/.env.local`.
      </p>
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span
        className={`font-mono ${
          tone === "positive" ? "text-positive" : "text-warning"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
