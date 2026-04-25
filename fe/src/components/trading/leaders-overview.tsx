"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type LeaderResponse } from "@/lib/api";
import { TradeModal } from "@/components/trading/trade-modal";

export function LeadersOverview() {
  const [selected, setSelected] = useState<LeaderResponse | null>(null);

  const { data: leaders, isLoading, error } = useQuery({
    queryKey: ["leaders"],
    queryFn: api.getLeaders,
    refetchInterval: 10_000,
  });

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6">
      <section className="overflow-hidden border border-line bg-line xl:grid xl:grid-cols-[minmax(0,1.55fr)_340px]">
        <div className="bg-canvas">
          <div className="border-b border-line px-4 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
              Leaderboard
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Each leader is scored from realized PnL, win rate, and how reliably
              their positions respect configured stop loss boundaries for
              followers.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-3">Leader</th>
                  <th className="px-4 py-3">Style</th>
                  <th className="px-4 py-3">Win rate</th>
                  <th className="px-4 py-3">PnL</th>
                  <th className="px-4 py-3">Followers</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted">
                      Loading leaders...
                    </td>
                  </tr>
                )}
                {error && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-negative">
                      Failed to load leaders — is the backend running?
                    </td>
                  </tr>
                )}
                {leaders?.map((leader) => (
                  <tr key={leader.address} className="border-b border-line/70">
                    <td className="px-4 py-4 font-medium text-foreground">
                      {leader.username}
                    </td>
                    <td className="px-4 py-4 text-muted">{leader.style}</td>
                    <td className="px-4 py-4 font-mono text-foreground">
                      {leader.winRate}%
                    </td>
                    <td
                      className={`px-4 py-4 font-mono ${
                        leader.totalPnl > 0
                          ? "text-positive"
                          : leader.totalPnl < 0
                            ? "text-negative"
                            : "text-foreground"
                      }`}
                    >
                      {leader.totalPnl > 0 ? "+" : ""}$
                      {leader.totalPnl.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-4 font-mono text-foreground">
                      {leader.followers}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => setSelected(leader)}
                        className="rounded-full border border-line px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/4"
                      >
                        Copy setup
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="bg-panel">
          <div className="border-b border-line px-4 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
              How it works
            </h2>
          </div>
          <div className="space-y-4 px-4 py-5 text-sm leading-6 text-muted">
            <p>
              Pick a leader, configure margin/leverage/stop-loss, then submit.
              The keeper will mirror their next position for you automatically.
            </p>
            <p>
              If the stop loss hits, your loss becomes permanent vault liquidity
              and you receive vUSD receipts that keep earning fee yield forever.
            </p>
          </div>
        </aside>
      </section>

      <TradeModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        leader={
          selected
            ? {
                address: selected.address as `0x${string}`,
                username: selected.username,
                style: selected.style,
              }
            : null
        }
      />
    </main>
  );
}
