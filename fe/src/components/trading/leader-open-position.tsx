"use client";

import { useEffect, useState } from "react";
import { keccak256, toBytes } from "viem";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  useIdleBalance,
  useOpenPosition,
} from "@/hooks/use-monad-contract";
import { useProtocolReadiness } from "@/hooks/use-protocol-readiness";
import { api } from "@/lib/api";

const PAIRS = [
  { label: "ETH/USD", defaultPrice: 3200 },
  { label: "BTC/USD", defaultPrice: 66000 },
  { label: "SOL/USD", defaultPrice: 144 },
] as const;

interface LeaderOpenPositionProps {
  username?: string;
  refetchUsername?: () => void;
}

export function LeaderOpenPosition({ username }: LeaderOpenPositionProps) {
  const { address } = useAccount();
  const { isConnected, isOnMonad, contractsReady } = useProtocolReadiness();
  const { data: idleBalance, refetch: refetchIdle } = useIdleBalance();
  const { openPosition, isPending, isConfirming, hash } = useOpenPosition();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 1_000,
  });

  const [pair, setPair] = useState<string>(PAIRS[0].label);
  const [isLong, setIsLong] = useState(true);
  const [margin, setMargin] = useState(10);
  const [leverage, setLeverage] = useState(5);
  const [entryPrice, setEntryPrice] = useState<number>(PAIRS[0].defaultPrice);
  const [stopLossPct, setStopLossPct] = useState(10); // 10% below entry for longs
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync entryPrice with current market price from stats
  useEffect(() => {
    if (stats?.prices && stats.prices[pair]) {
      setEntryPrice(stats.prices[pair].price);
    }
  }, [stats, pair]);

  // Auto-refetch idle balance and reset UI when transaction is confirmed
  useEffect(() => {
    if (hash && !isConfirming) {
      refetchIdle();
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [hash, isConfirming, refetchIdle]);

  const isRegistered = Boolean(username && (username as string).length > 0);
  const ready = isConnected && isOnMonad && contractsReady;

  const stopLossPrice = isLong
    ? entryPrice * (1 - stopLossPct / 100)
    : entryPrice * (1 + stopLossPct / 100);
  const notional = margin * leverage;

  const handleSubmit = () => {
    if (!ready || !address) return;

    // Use latest price from stats if available, fallback to state
    const currentPrice = stats?.prices?.[pair]?.price ?? entryPrice;

    openPosition({
      leader: address,
      pairId: keccak256(toBytes(pair)),
      isLong,
      marginUsdc: margin,
      leverage,
      entryPrice: currentPrice,
      stopLossPrice: isLong
        ? currentPrice * (1 - stopLossPct / 100)
        : currentPrice * (1 + stopLossPct / 100),
    });
  };

  if (!isRegistered) {
    return (
      <section className="border border-line bg-canvas px-4 py-5 text-sm text-muted">
        Register as a Leader first to unlock the trade desk.
      </section>
    );
  }

  return (
    <section className="border border-line bg-canvas">
      <div className="border-b border-line px-4 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
          Leader desk — {username || "open position"}
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted">
          Your followers will auto-mirror this trade (keeper processes the{" "}
          <span className="font-mono">PositionOpened</span> event).
        </p>
      </div>

      <div className="grid gap-px bg-line md:grid-cols-3">
        <PanelCell label="Pair">
          <select
            value={pair}
            onChange={(e) => {
              setPair(e.target.value);
            }}
            className="w-full rounded-2xl border border-line bg-panel px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          >
            {PAIRS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </PanelCell>

        <PanelCell label="Direction">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsLong(true)}
              className={`rounded-full px-2 py-1.5 text-xs font-semibold ${
                isLong
                  ? "bg-positive text-background"
                  : "border border-line text-muted"
              }`}
            >
              Long
            </button>
            <button
              onClick={() => setIsLong(false)}
              className={`rounded-full px-2 py-1.5 text-xs font-semibold ${
                !isLong
                  ? "bg-negative text-background"
                  : "border border-line text-muted"
              }`}
            >
              Short
            </button>
          </div>
        </PanelCell>

        <PanelCell label="Margin (USDC)">
          <input
            type="number"
            min={1}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            className="w-full rounded-2xl border border-line bg-panel px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </PanelCell>
      </div>

      <div className="grid gap-px bg-line md:grid-cols-2">
        <PanelCell label={`Leverage: ${leverage}x`}>
          <input
            type="range"
            min={1}
            max={25}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full"
          />
        </PanelCell>

        <PanelCell label={`Stop loss: -${stopLossPct}%`}>
          <input
            type="range"
            min={5}
            max={80}
            value={stopLossPct}
            onChange={(e) => setStopLossPct(Number(e.target.value))}
            className="w-full"
          />
        </PanelCell>
      </div>

      <div className="border-t border-line bg-panel px-4 py-4 text-xs">
        <Row
          label="Market price (Pyth)"
          value={
            entryPrice > 0
              ? `$${entryPrice.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "Fetching..."
          }
        />
        <Row label="Notional size" value={`$${notional.toLocaleString()}`} />
        <Row
          label="Stop-loss price"
          value={`$${stopLossPrice.toFixed(2)}`}
          tone="negative"
        />
        <Row
          label="Idle balance"
          value={
            idleBalance
              ? `${(Number(idleBalance) / 1e6).toFixed(2)} USDC`
              : "—"
          }
        />
      </div>

      <div className="border-t border-line px-4 py-4">
        <button
          onClick={handleSubmit}
          disabled={!ready || isPending || isConfirming}
          className="w-full rounded-full bg-foreground px-3 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending
            ? "Confirm in wallet..."
            : isConfirming
              ? "Opening position..."
              : showSuccess
                ? "Position opened!"
                : !ready
                  ? "Wallet not ready"
                  : `Open ${isLong ? "long" : "short"} ${pair}`}
        </button>
      </div>
    </section>
  );
}

function PanelCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 bg-canvas px-4 py-4">
      <span className="block text-xs text-muted">{label}</span>
      {children}
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
  tone?: "negative" | "positive";
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted">{label}</span>
      <span
        className={`font-mono ${
          tone === "negative"
            ? "text-negative"
            : tone === "positive"
              ? "text-positive"
              : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
