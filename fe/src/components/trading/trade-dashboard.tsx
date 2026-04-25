"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { TradingViewChart } from "@/components/trading/trading-view-chart";
import { TradeTicketStatus } from "@/components/wallet/trade-ticket-status";
import {
  useIdleBalance,
  useFollowLeader,
  useOpenPosition,
} from "@/hooks/use-monad-contract";
import { api, type LeaderResponse } from "@/lib/api";

const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];
const USDC_DECIMALS = 6;
const FEE_RATE = 0.001;

// bytes32 pair IDs — ASCII-padded right with zeros (matching seed script convention)
const PAIR_IDS: Record<string, `0x${string}`> = {
  "ETH/USDC":
    "0x4554482f55534443000000000000000000000000000000000000000000000000",
  "BTC/USDC":
    "0x4254432f55534443000000000000000000000000000000000000000000000000",
};

const PAIRS = Object.keys(PAIR_IDS);

type TabType = "market" | "limit" | "advanced";
type SideType = "long" | "short";
type ModeType = "copy" | "manual";

function getEthPrice(prices?: Record<string, { price: number; updatedAt: number }>): number {
  if (!prices) return 0;
  return (
    prices["ETH"]?.price ??
    prices["ETH/USDC"]?.price ??
    prices["ETHUSD"]?.price ??
    0
  );
}

function fmtUsd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number, sign = false) {
  return `${sign && n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function TradeDashboard() {
  const [activeTimeframe, setActiveTimeframe] = useState("5m");

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 10_000,
  });

  const { data: activeTrades } = useQuery({
    queryKey: ["activeTrades"],
    queryFn: api.getActiveTrades,
    refetchInterval: 15_000,
  });

  const { data: leaders } = useQuery({
    queryKey: ["leaders"],
    queryFn: api.getLeaders,
    refetchInterval: 30_000,
  });

  const { data: vaultActivity } = useQuery({
    queryKey: ["vaultActivity"],
    queryFn: api.getVaultActivity,
    refetchInterval: 20_000,
  });

  const ethPrice = getEthPrice(stats?.prices);

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col px-4 pb-8 sm:px-6">
      <section className="fade-up overflow-hidden border border-line bg-line xl:grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="bg-canvas">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {timeframes.map((frame) => (
                <button
                  key={frame}
                  onClick={() => setActiveTimeframe(frame)}
                  className={`rounded-full px-3 py-1.5 font-mono ${
                    frame === activeTimeframe
                      ? "bg-accent-soft text-foreground"
                      : "hover:bg-white/4 hover:text-foreground"
                  }`}
                >
                  {frame}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted">
              <span>Market only</span>
              <span className="h-1 w-1 rounded-full bg-line" />
              <span>No order book</span>
              <span className="h-1 w-1 rounded-full bg-line" />
              <span>Keeper settled</span>
            </div>
          </div>
          <div className="relative border-b border-line">
            <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-2xl border border-line bg-background/84 px-4 py-3 backdrop-blur-md">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
                ETH / USDC Perp
              </p>
              <div className="mt-2 flex items-end gap-3">
                <span className="font-mono text-3xl text-foreground">
                  {ethPrice > 0 ? fmtPrice(ethPrice) : "—"}
                </span>
                {stats && (
                  <span className="font-mono text-sm text-positive">
                    Monad Testnet
                  </span>
                )}
              </div>
            </div>
            <TradingViewChart symbol="BINANCE:ETHUSDT" />
          </div>
          <div className="grid gap-px bg-line lg:grid-cols-[1.25fr_1fr_1fr]">
            {/* Open positions */}
            <section className="bg-canvas">
              <PanelHeader
                title="Open positions"
                detail="Fractional margin is allocated from idle USDC balance."
              />
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-muted">
                    <tr className="border-b border-line font-normal">
                      <th className="px-4 py-3">Pair</th>
                      <th className="px-4 py-3">Side</th>
                      <th className="px-4 py-3">Entry</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">PnL</th>
                      <th className="px-4 py-3">Max loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTrades && activeTrades.length > 0 ? (
                      activeTrades.map((t) => {
                        const currentPrice = getEthPrice(stats?.prices);
                        const priceDiff =
                          currentPrice > 0
                            ? t.side === "long"
                              ? currentPrice - t.entryPrice
                              : t.entryPrice - currentPrice
                            : 0;
                        const pnl = (priceDiff / t.entryPrice) * t.size;
                        const pnlStr =
                          pnl >= 0 ? `+${fmtUsd(pnl)}` : fmtUsd(pnl);
                        const maxLoss = fmtUsd(
                          Math.abs(t.stopLossPrice - t.entryPrice) *
                            (t.size / t.entryPrice),
                        );
                        return (
                          <tr key={t.id} className="border-b border-line/70">
                            <td className="px-4 py-4 text-foreground">
                              {t.pair}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  t.side === "long"
                                    ? "bg-positive/10 text-positive"
                                    : "bg-negative/10 text-negative"
                                }`}
                              >
                                {t.side === "long" ? "Long" : "Short"}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-mono text-foreground">
                              {fmtPrice(t.entryPrice)}
                            </td>
                            <td className="px-4 py-4 font-mono text-foreground">
                              {fmtUsd(t.size)}
                            </td>
                            <td
                              className={`px-4 py-4 font-mono ${
                                pnl >= 0 ? "text-positive" : "text-negative"
                              }`}
                            >
                              {pnlStr}
                            </td>
                            <td className="px-4 py-4 font-mono text-muted">
                              -{maxLoss}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-6 text-center text-muted"
                        >
                          No open positions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Leader pulse */}
            <section className="bg-canvas">
              <PanelHeader
                title="Leader pulse"
                detail="Copy subscriptions mirror only after keeper validation."
              />
              <div className="divide-y divide-line">
                {leaders && leaders.length > 0 ? (
                  leaders.slice(0, 3).map((leader) => (
                    <div
                      key={leader.address}
                      className="flex items-center justify-between px-4 py-4"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {leader.username}
                        </p>
                        <p className="mt-1 text-xs text-muted">{leader.style}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-mono ${
                            leader.totalPnl >= 0
                              ? "text-positive"
                              : "text-negative"
                          }`}
                        >
                          {leader.totalPnl >= 0 ? "+" : ""}
                          {fmtUsd(leader.totalPnl)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {leader.followers} followers
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-muted">
                    No leaders registered
                  </p>
                )}
              </div>
            </section>

            {/* Vault flow */}
            <section className="bg-canvas">
              <PanelHeader
                title="Vault flow"
                detail="Losses convert into receipt-backed LP ownership."
              />
              <div className="divide-y divide-line">
                {vaultActivity && vaultActivity.length > 0 ? (
                  vaultActivity.slice(0, 3).map((item) => (
                    <div key={item.id} className="px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium text-foreground capitalize">
                          {item.event.replace(/_/g, " ")}
                        </p>
                        <span className="font-mono text-sm text-foreground">
                          {fmtUsd(item.amount)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted">
                        <span>
                          {item.address.slice(0, 6)}…{item.address.slice(-4)}
                        </span>
                        <span>{item.receipt}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-muted">
                    No vault activity
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
        <aside className="bg-panel">
          <TradeTicket leaders={leaders ?? []} ethPrice={ethPrice} />
        </aside>
      </section>

      <section className="fade-up mt-6 grid gap-px border border-line bg-line lg:grid-cols-[1.25fr_1fr]">
        {/* Execution feed */}
        <div className="bg-canvas">
          <PanelHeader
            title="Execution feed"
            detail="Recent vault and keeper events from the indexer."
          />
          <div className="divide-y divide-line">
            {vaultActivity && vaultActivity.length > 0 ? (
              vaultActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 px-4 py-4"
                >
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                  <p className="text-sm leading-6 text-foreground">
                    {eventToFeedLine(entry)}
                  </p>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted">
                No activity yet
              </p>
            )}
          </div>
        </div>

        {/* Vault economics */}
        <div className="bg-canvas">
          <PanelHeader
            title="Vault economics"
            detail="Trading fees route into the vault before they are claimable."
          />
          <div className="space-y-4 px-4 py-4">
            <MetricRow
              label="Vault TVL"
              value={stats ? fmtUsd(stats.totalTvl) : "—"}
            />
            <MetricRow
              label="Total volume"
              value={stats ? fmtUsd(stats.totalVolume) : "—"}
            />
            <MetricRow
              label="Yield distributed"
              value={stats ? fmtUsd(stats.totalYieldDistributed) : "—"}
            />
            <MetricRow
              label="Total followers"
              value={stats ? String(stats.totalFollowers) : "—"}
            />
            <MetricRow
              label="Keeper mode"
              value={stats?.keeperMode ?? "In-memory Express"}
            />
            <div className="rounded-3xl border border-line bg-panel px-4 py-4">
              <p className="text-sm font-medium text-foreground">
                Receipt token lifecycle
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                When a stop loss is executed, the realized loss is locked in the
                vault and the user receives vUSD receipts that keep claiming
                future fee yield.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function eventToFeedLine(entry: {
  event: string;
  address: string;
  amount: number;
  receipt: string;
}) {
  const addr = `${entry.address.slice(0, 6)}…${entry.address.slice(-4)}`;
  switch (entry.event) {
    case "loss_vaulted":
      return `${addr} stop loss executed — ${fmtUsd(entry.amount)} vaulted, ${entry.receipt} minted.`;
    case "yield_claimed":
      return `${addr} claimed ${fmtUsd(entry.amount)} USDC yield.`;
    case "fee_split":
      return `Protocol fee ${fmtUsd(entry.amount)} split: ${entry.receipt}.`;
    default:
      return `${entry.event.replace(/_/g, " ")} — ${addr}: ${fmtUsd(entry.amount)}`;
  }
}

function PanelHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-b border-line px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
          {title}
        </h2>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{detail}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

function TradeTicket({
  leaders,
  ethPrice,
}: {
  leaders: LeaderResponse[];
  ethPrice: number;
}) {
  const { address } = useAccount();
  const { data: idle } = useIdleBalance();
  const { followLeader, isPending: followPending } = useFollowLeader();
  const { openPosition, isPending: openPending } = useOpenPosition();

  const [tab, setTab] = useState<TabType>("market");
  const [side, setSide] = useState<SideType>("long");
  const [mode, setMode] = useState<ModeType>("copy");
  const [leaderAddress, setLeaderAddress] = useState<string>(
    leaders[0]?.address ?? "",
  );
  const [pair, setPair] = useState<string>("ETH/USDC");
  const [margin, setMargin] = useState<number>(250);
  const [leverage, setLeverage] = useState<number>(12);
  const [stopLossPct, setStopLossPct] = useState<number>(50);
  const [limitPrice, setLimitPrice] = useState<number>(ethPrice || 3000);

  const idleFormatted = idle
    ? Number(formatUnits(idle as bigint, USDC_DECIMALS)).toFixed(2)
    : "0.00";

  const entryPrice =
    tab === "market" ? ethPrice : limitPrice;

  const preview = useMemo(() => {
    const notional = margin * leverage;
    const fee = notional * FEE_RATE;
    const lossToVault = margin * (stopLossPct / 100);
    const vUsdMinted = lossToVault;
    return { notional, fee, lossToVault, vUsdMinted };
  }, [margin, leverage, stopLossPct]);

  const isPending = followPending || openPending;

  function handleSubmit() {
    if (!address) return;

    if (mode === "copy") {
      const leader = (leaderAddress || leaders[0]?.address) as `0x${string}`;
      if (!leader) return;
      const stopLossBps = Math.round(stopLossPct * 100);
      followLeader(leader, margin, leverage, stopLossBps);
    } else {
      const leader = (leaderAddress || leaders[0]?.address) as `0x${string}`;
      const pairId = PAIR_IDS[pair] ?? PAIR_IDS["ETH/USDC"];
      const stopLossOffset = entryPrice * (stopLossPct / 100);
      const stopLossPrice =
        side === "long"
          ? entryPrice - stopLossOffset
          : entryPrice + stopLossOffset;
      openPosition({
        leader: leader ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`),
        pairId,
        isLong: side === "long",
        marginUsdc: margin,
        leverage,
        entryPrice,
        stopLossPrice,
      });
    }
  }

  const submitLabel = isPending
    ? "Confirming…"
    : mode === "copy"
      ? `Follow leader ${side === "long" ? "long" : "short"}`
      : `Open ${side === "long" ? "long" : "short"}`;

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="border-b border-line px-4 py-4">
        <div className="grid grid-cols-3 gap-2 text-sm">
          {(["market", "limit", "advanced"] as TabType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-2 font-medium capitalize ${
                tab === t
                  ? "bg-foreground text-background"
                  : "border border-line text-muted hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Side selector */}
      <div className="border-b border-line px-4 py-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <button
            onClick={() => setSide("long")}
            className={`rounded-full px-3 py-3 font-semibold ${
              side === "long"
                ? "bg-positive text-background"
                : "border border-line text-foreground hover:bg-white/4"
            }`}
          >
            Buy / Long
          </button>
          <button
            onClick={() => setSide("short")}
            className={`rounded-full px-3 py-3 font-semibold ${
              side === "short"
                ? "bg-negative text-background"
                : "border border-line text-foreground hover:bg-white/4"
            }`}
          >
            Sell / Short
          </button>
        </div>
      </div>

      {/* Form fields */}
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 text-sm">
        <Field label="Available balance" value={`$${idleFormatted} USDC`} />

        <label className="block">
          <span className="mb-2 block text-muted">Execution mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ModeType)}
            className="w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-foreground outline-none focus:border-accent"
          >
            <option value="copy">Copy leader</option>
            <option value="manual">Manual trade</option>
          </select>
        </label>

        {mode === "manual" && (
          <label className="block">
            <span className="mb-2 block text-muted">Pair</span>
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-foreground outline-none focus:border-accent"
            >
              {PAIRS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-2 block text-muted">
            {mode === "copy" ? "Leader to follow" : "Leader (for attribution)"}
          </span>
          <select
            value={leaderAddress}
            onChange={(e) => setLeaderAddress(e.target.value)}
            className="w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-foreground outline-none focus:border-accent"
          >
            {leaders.length > 0 ? (
              leaders.map((l) => (
                <option key={l.address} value={l.address}>
                  {l.username} — {l.style}
                </option>
              ))
            ) : (
              <option value="">No leaders registered</option>
            )}
          </select>
        </label>

        {(tab === "limit" || tab === "advanced") && (
          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-muted">Limit price (USD)</span>
              <span className="font-mono text-foreground">
                {fmtPrice(limitPrice)}
              </span>
            </div>
            <input
              type="number"
              min="1"
              value={limitPrice}
              onChange={(e) => setLimitPrice(Number(e.target.value))}
              className="w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-foreground outline-none focus:border-accent"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-2 block text-muted">Margin allocation (USDC)</span>
          <input
            type="number"
            min="1"
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            className="w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-foreground outline-none focus:border-accent"
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-muted">Leverage</span>
            <span className="font-mono text-foreground">{leverage}x</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full"
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-muted">Maximum stop loss</span>
            <span className="font-mono text-negative">
              -{stopLossPct}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="80"
            value={stopLossPct}
            onChange={(e) => setStopLossPct(Number(e.target.value))}
            className="w-full"
          />
        </label>

        {tab === "advanced" && (
          <div className="rounded-2xl border border-line bg-canvas px-4 py-3">
            <p className="mb-2 text-xs uppercase tracking-widest text-muted">
              Advanced
            </p>
            <div className="space-y-2 text-xs text-muted">
              <p>Stop loss triggers at {fmtPct(-stopLossPct)} — vaults loss and mints vUSD.</p>
              <p>Position is keeper-settled, no manual close required.</p>
            </div>
          </div>
        )}

        {/* Execution preview */}
        <div className="rounded-3xl border border-line bg-canvas px-4 py-4">
          <p className="text-sm font-medium text-foreground">
            Execution preview
          </p>
          <div className="mt-4 space-y-3">
            <Field
              label="Notional size"
              value={fmtUsd(preview.notional)}
            />
            <Field label="Entry fee (0.1%)" value={fmtUsd(preview.fee)} />
            <Field
              label={`Entry price ${tab === "market" ? "(market)" : "(limit)"}`}
              value={entryPrice > 0 ? fmtPrice(entryPrice) : "—"}
            />
            <Field
              label="Loss to vault if stopped"
              value={fmtUsd(preview.lossToVault)}
              tone="negative"
            />
            <Field
              label="vUSD minted on stop"
              value={`${preview.vUsdMinted.toFixed(2)} vUSD`}
              tone="positive"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-auto border-t border-line px-4 py-4">
        <button
          onClick={handleSubmit}
          disabled={isPending || !address || leaders.length === 0}
          className={`w-full rounded-full px-4 py-3 font-semibold transition-opacity ${
            side === "long"
              ? "bg-positive text-background"
              : "bg-negative text-background"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {submitLabel}
        </button>
        <TradeTicketStatus />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex items-center justify-between gap-4">
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
