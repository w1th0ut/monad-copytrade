"use client";

import { useEffect, useState } from "react";
import { useFollowLeader } from "@/hooks/use-monad-contract";
import { useProtocolReadiness } from "@/hooks/use-protocol-readiness";

type TradeModalProps = {
  open: boolean;
  onClose: () => void;
  leader: { address: `0x${string}`; username: string; style: string } | null;
};

export function TradeModal({ open, onClose, leader }: TradeModalProps) {
  const [margin, setMargin] = useState(250);
  const [leverage, setLeverage] = useState(10);
  const [stopLossPct, setStopLossPct] = useState(50);

  const { isConnected, isOnMonad, contractsReady } = useProtocolReadiness();
  const { followLeader, isPending, isConfirming, hash } = useFollowLeader();

  useEffect(() => {
    if (hash) onClose();
  }, [hash, onClose]);

  if (!open || !leader) return null;

  const canSubmit = isConnected && isOnMonad && contractsReady && !isPending && !isConfirming;
  const notional = margin * leverage;
  const maxLoss = (margin * stopLossPct) / 100;

  const handleSubmit = () => {
    if (!canSubmit) return;
    followLeader(leader.address, margin, leverage, stopLossPct * 100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md border border-line bg-canvas p-6"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Copy setup</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              {leader.username}
            </h2>
            <p className="mt-1 text-sm text-muted">{leader.style}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <label className="block">
            <span className="mb-2 block text-muted">Margin (USDC)</span>
            <input
              type="number"
              min={1}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="w-full rounded-2xl border border-line bg-panel px-4 py-3 text-foreground outline-none focus:border-accent"
            />
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted">Leverage</span>
              <span className="font-mono text-foreground">{leverage}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full"
            />
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted">Maximum stop loss</span>
              <span className="font-mono text-negative">-{stopLossPct}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={80}
              value={stopLossPct}
              onChange={(e) => setStopLossPct(Number(e.target.value))}
              className="w-full"
            />
          </label>

          <div className="rounded-2xl border border-line bg-panel px-4 py-3 text-xs">
            <Row label="Notional size" value={`$${notional.toLocaleString()}`} />
            <Row label="Max loss to vault" value={`$${maxLoss.toFixed(2)}`} tone="negative" />
            <Row label="vUSD minted on SL" value={`${maxLoss.toFixed(2)} vUSD`} tone="positive" />
          </div>

          <button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full rounded-full bg-foreground px-4 py-3 font-semibold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending
              ? "Confirm in wallet..."
              : isConfirming
                ? "Submitting..."
                : !isConnected
                  ? "Connect wallet first"
                  : !isOnMonad
                    ? "Switch to Monad"
                    : !contractsReady
                      ? "Contracts not deployed"
                      : "Follow leader"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-muted">{label}</span>
      <span
        className={`font-mono ${
          tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
