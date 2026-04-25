"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { TradingViewChart } from "@/components/trading/trading-view-chart";
import { TradeTicketStatus } from "@/components/wallet/trade-ticket-status";
import { useIdleBalance } from "@/hooks/use-monad-contract";
import { api } from "@/lib/api";
import { activityFeed, leaders, marketSnapshot, positions, vaultFlow } from "@/lib/mock-data";

const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];
const USDC_DECIMALS = 6;

export function TradeDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 10_000,
  });
  return (
    <main className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col px-4 pb-8 sm:px-6">
      <section className="fade-up overflow-hidden border border-line bg-line xl:grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="bg-canvas">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {timeframes.map((frame) => (
                <button
                  key={frame}
                  className={`rounded-full px-3 py-1.5 font-mono ${
                    frame === "5m"
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
                {marketSnapshot.symbol}
              </p>
              <div className="mt-2 flex items-end gap-3">
                <span className="font-mono text-3xl text-foreground">
                  {marketSnapshot.markPrice}
                </span>
                <span className="font-mono text-sm text-positive">
                  {marketSnapshot.change24h}
                </span>
              </div>
            </div>
            <TradingViewChart symbol="BINANCE:ETHUSDT" />
          </div>
          <div className="grid gap-px bg-line lg:grid-cols-[1.25fr_1fr_1fr]">
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
                    {positions.map((position) => (
                      <tr key={position.pair} className="border-b border-line/70">
                        <td className="px-4 py-4 text-foreground">{position.pair}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              position.side === "Long"
                                ? "bg-positive/10 text-positive"
                                : "bg-negative/10 text-negative"
                            }`}
                          >
                            {position.side}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-foreground">
                          {position.entry}
                        </td>
                        <td className="px-4 py-4 font-mono text-foreground">
                          {position.size}
                        </td>
                        <td
                          className={`px-4 py-4 font-mono ${
                            position.pnl.startsWith("+")
                              ? "text-positive"
                              : "text-negative"
                          }`}
                        >
                          {position.pnl}
                        </td>
                        <td className="px-4 py-4 font-mono text-muted">
                          {position.stopLoss}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="bg-canvas">
              <PanelHeader
                title="Leader pulse"
                detail="Copy subscriptions mirror only after keeper validation."
              />
              <div className="divide-y divide-line">
                {leaders.slice(0, 3).map((leader) => (
                  <div
                    key={leader.name}
                    className="flex items-center justify-between px-4 py-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">{leader.name}</p>
                      <p className="mt-1 text-xs text-muted">{leader.style}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-positive">{leader.pnl}</p>
                      <p className="mt-1 text-xs text-muted">
                        {leader.followers} followers
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="bg-canvas">
              <PanelHeader
                title="Vault flow"
                detail="Losses convert into receipt-backed LP ownership."
              />
              <div className="divide-y divide-line">
                {vaultFlow.map((item) => (
                  <div key={item.wallet + item.event} className="px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium text-foreground">{item.event}</p>
                      <span className="font-mono text-sm text-foreground">
                        {item.amount}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted">
                      <span>{item.wallet}</span>
                      <span>{item.receipt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
        <aside className="bg-panel">
          <TradeTicket />
        </aside>
      </section>
      <section className="fade-up mt-6 grid gap-px border border-line bg-line lg:grid-cols-[1.25fr_1fr]">
        <div className="bg-canvas">
          <PanelHeader
            title="Execution feed"
            detail="Backend keeper and indexer updates that will eventually stream from Express."
          />
          <div className="divide-y divide-line">
            {activityFeed.map((entry) => (
              <div key={entry} className="flex items-start gap-3 px-4 py-4">
                <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                <p className="text-sm leading-6 text-foreground">{entry}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-canvas">
          <PanelHeader
            title="Vault economics"
            detail="Trading fees route into the vault before they are claimable."
          />
          <div className="space-y-4 px-4 py-4">
            <MetricRow
              label="Vault TVL"
              value={stats ? `$${stats.totalTvl.toLocaleString()}` : marketSnapshot.vaultTvl}
            />
            <MetricRow
              label="Total volume"
              value={stats ? `$${stats.totalVolume.toLocaleString()}` : "—"}
            />
            <MetricRow
              label="Yield distributed"
              value={stats ? `$${stats.totalYieldDistributed.toLocaleString()}` : "—"}
            />
            <MetricRow label="Keeper mode" value={stats?.keeperMode ?? "In-memory Express"} />
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

function TradeTicket() {
  const { data: idle } = useIdleBalance();
  const idleFormatted = idle
    ? Number(formatUnits(idle as bigint, USDC_DECIMALS)).toFixed(2)
    : "0.00";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-4 py-4">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <button className="rounded-full bg-foreground px-3 py-2 font-medium text-background">
            Market
          </button>
          <button className="rounded-full border border-line px-3 py-2 text-muted hover:text-foreground">
            Limit
          </button>
          <button className="rounded-full border border-line px-3 py-2 text-muted hover:text-foreground">
            Advanced
          </button>
        </div>
      </div>
      <div className="border-b border-line px-4 py-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <button className="rounded-full bg-positive px-3 py-3 font-semibold text-background">
            Buy / Long
          </button>
          <button className="rounded-full border border-line px-3 py-3 font-semibold text-foreground hover:bg-white/4">
            Sell / Short
          </button>
        </div>
      </div>
      <div className="space-y-5 px-4 py-5 text-sm">
        <Field label="Available balance" value={`$${idleFormatted} USDC`} />
        <label className="block">
          <span className="mb-2 block text-muted">Execution mode</span>
          <select className="w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-foreground outline-none focus:border-accent">
            <option>Copy leader</option>
            <option>Manual trade</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-muted">Leader</span>
          <select className="w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-foreground outline-none focus:border-accent">
            <option>Delta K - ETH breakout</option>
            <option>Mono S - BTC scalp</option>
            <option>Rhea - SOL swing</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-muted">Margin allocation</span>
          <input
            type="number"
            min="1"
            defaultValue="250"
            className="w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-muted">Leverage</span>
            <span className="font-mono text-foreground">12x</span>
          </div>
          <input type="range" min="1" max="20" defaultValue="12" className="w-full" />
        </label>
        <label className="block">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-muted">Maximum stop loss</span>
            <span className="font-mono text-negative">-50%</span>
          </div>
          <input type="range" min="10" max="80" defaultValue="50" className="w-full" />
        </label>
        <div className="rounded-3xl border border-line bg-canvas px-4 py-4">
          <p className="text-sm font-medium text-foreground">Execution preview</p>
          <div className="mt-4 space-y-3">
            <Field label="Notional size" value="$3,000.00" />
            <Field label="Entry fee" value="$3.00" />
            <Field label="Loss to vault if stopped" value="$125.00" tone="negative" />
            <Field label="vUSD minted on stop" value="125.00 vUSD" tone="positive" />
          </div>
        </div>
      </div>
      <div className="mt-auto">
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
