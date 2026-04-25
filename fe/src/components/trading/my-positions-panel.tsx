"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { api, type ActiveTradeResponse, type StatsResponse } from "@/lib/api";
import { useClosePosition } from "@/hooks/use-monad-contract";
import { useProtocolReadiness } from "@/hooks/use-protocol-readiness";

const fmtUsd = (n: number) =>
  `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function pnlOf(t: ActiveTradeResponse, mark: number) {
  if (mark <= 0 || t.entryPrice <= 0) return 0;
  const diff = t.side === "long" ? mark - t.entryPrice : t.entryPrice - mark;
  return (diff / t.entryPrice) * t.size;
}

export function MyPositionsPanel() {
  const { address } = useAccount();
  const { isConnected, isOnMonad, contractsReady } = useProtocolReadiness();
  const { closePosition, isPending, isConfirming, hash } = useClosePosition();

  const { data: trades, refetch: refetchTrades } = useQuery({
    queryKey: ["active-trades"],
    queryFn: api.getActiveTrades,
    refetchInterval: 3_000,
  });

  const { data: stats } = useQuery<StatsResponse>({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 1_000,
  });

  // Auto-refetch after a successful close
  useEffect(() => {
    if (hash && !isConfirming) {
      const t = setTimeout(() => refetchTrades(), 1500);
      return () => clearTimeout(t);
    }
  }, [hash, isConfirming, refetchTrades]);

  const myTrades = (trades ?? []).filter(
    (t) =>
      address &&
      t.follower.toLowerCase() === address.toLowerCase() &&
      t.status === "open",
  );

  const ready = isConnected && isOnMonad && contractsReady;

  return (
    <section className="mt-6 border border-line bg-canvas">
      <div className="border-b border-line px-4 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
          My positions
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted">
          Open positions tied to your connected wallet. Close manually anytime
          at the current Pyth mark price.
        </p>
      </div>

      {!isConnected ? (
        <div className="px-4 py-6 text-sm text-muted">
          Connect wallet to view your positions.
        </div>
      ) : myTrades.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted">
          No open positions for this wallet.
        </div>
      ) : (
        <div className="divide-y divide-line">
          <div className="hidden grid-cols-[80px_1fr_80px_1fr_1fr_1fr_140px] gap-4 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted md:grid">
            <span>ID</span>
            <span>Pair</span>
            <span>Side</span>
            <span>Entry</span>
            <span>Mark</span>
            <span>PnL</span>
            <span className="text-right">Action</span>
          </div>

          {myTrades.map((t) => {
            const mark = stats?.prices?.[t.pair]?.price ?? 0;
            const pnl = pnlOf(t, mark);
            const tone = pnl >= 0 ? "text-positive" : "text-negative";
            const canClose = ready && mark > 0 && !isPending && !isConfirming;
            return (
              <div
                key={t.id}
                className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-4 text-sm md:grid-cols-[80px_1fr_80px_1fr_1fr_1fr_140px] md:items-center md:gap-4"
              >
                <CellLabel mdHide>ID</CellLabel>
                <span className="font-mono text-xs text-muted">#{t.id}</span>

                <CellLabel mdHide>Pair</CellLabel>
                <span className="font-mono">{t.pair}</span>

                <CellLabel mdHide>Side</CellLabel>
                <span
                  className={`font-mono text-xs ${
                    t.side === "long" ? "text-positive" : "text-negative"
                  }`}
                >
                  {t.side.toUpperCase()}
                </span>

                <CellLabel mdHide>Entry</CellLabel>
                <span className="font-mono">{fmtUsd(t.entryPrice)}</span>

                <CellLabel mdHide>Mark</CellLabel>
                <span className="font-mono">
                  {mark > 0 ? fmtUsd(mark) : "—"}
                </span>

                <CellLabel mdHide>PnL</CellLabel>
                <span className={`font-mono ${tone}`}>
                  {mark > 0 ? `${pnl >= 0 ? "+" : ""}${fmtUsd(pnl)}` : "—"}
                </span>

                <div className="col-span-2 md:col-span-1 md:text-right">
                  <button
                    disabled={!canClose}
                    onClick={() => closePosition(t.id, mark)}
                    className="w-full rounded-full border border-negative/60 px-3 py-2 text-xs font-semibold text-negative hover:bg-negative/10 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
                  >
                    {isPending
                      ? "Confirm..."
                      : isConfirming
                        ? "Closing..."
                        : "Close at market"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CellLabel({
  children,
  mdHide,
}: {
  children: React.ReactNode;
  mdHide?: boolean;
}) {
  return (
    <span
      className={`text-[11px] uppercase tracking-[0.18em] text-muted ${
        mdHide ? "md:hidden" : ""
      }`}
    >
      {children}
    </span>
  );
}
