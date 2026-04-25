"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import {
  useClaimYield,
  useClaimableYield,
  useDepositVault,
  useUsdcApproval,
  useUsdcBalance,
  useVusdBalance,
  USDC_DECIMALS,
} from "@/hooks/use-monad-contract";
import { useProtocolReadiness } from "@/hooks/use-protocol-readiness";
import { protocolAddresses } from "@/lib/web3/contracts";
import { api } from "@/lib/api";

type VaultRow = {
  id: string;
  name: string;
  category: "Loss-to-LP" | "Liquid Staking" | "Lending" | "Restaking" | "DeFi Yield";
  depositToken: string;
  depositSubLabel: string;
  tvl: string;
  tvlUsd: string;
  cap?: string | React.ReactNode;
  apy: string | React.ReactNode;
  apyTone: "positive" | "muted";
  rewardTags: React.ReactNode[];
  composability: React.ReactNode[];
  strategist: string;
  strategistHasArrow?: boolean;
  status: "live" | "coming-soon";
  depositIcon?: React.ReactNode;
  strategistIcon?: React.ReactNode;
};

const FAKE_VAULTS: VaultRow[] = [
  {
    id: "flare-xrp",
    name: "Flare XRP Yield Vault",
    category: "DeFi Yield",
    depositToken: "FXRP",
    depositSubLabel: "Flare Mainnet",
    tvl: "29.96M FXRP",
    tvlUsd: "$43,145,390",
    cap: (
      <div className="flex items-center gap-1.5 text-yellow-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 rounded-full border-2 border-yellow-500/20" />
        <span className="font-semibold text-yellow-500">100%</span>
      </div>
    ),
    apy: "0.69%",
    apyTone: "positive",
    rewardTags: [
      <div key="5x" className="flex items-center gap-1 bg-[#004225] text-[#00ff88] rounded-full px-2 py-0.5 text-[10px] font-bold">
        <div className="w-2 h-2 rounded-full border-2 border-[#00ff88]" />
        5X
      </div>,
      <div key="fire" className="w-5 h-5 rounded-full bg-[#f97316] flex items-center justify-center text-[10px]">🔥</div>
    ],
    composability: [],
    strategist: "Clearstar Labs",
    status: "live",
    depositIcon: (
      <div className="relative">
        <img src="/images/fXRP.svg" alt="fXRP" className="w-8 h-8 rounded-full object-cover" />
        {/* <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#ff2a55] border-2 border-black flex items-center justify-center text-[8px] font-bold text-white">F</div> */}
      </div>
    ),
    strategistIcon: <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-black text-[10px] font-bold">C</div>,
  },
  {
    id: "earn-ausd",
    name: "earnAUD",
    category: "DeFi Yield",
    depositToken: "AUSD",
    depositSubLabel: " ",
    tvl: "35.49M AUSD",
    tvlUsd: "$35,485,368",
    cap: "—",
    apy: (
      <div className="flex items-center gap-1">
        <span>7.50%</span>
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-positive"><path d="M12 0l2 8 8 2-8 2-2 8-2-8-8-2 8-2 2-8z"/></svg>
      </div>
    ),
    apyTone: "positive",
    rewardTags: [
      <div key="5x" className="flex items-center gap-1 bg-[#004225] text-[#00ff88] rounded-full px-2 py-0.5 text-[10px] font-bold">
        <div className="w-2 h-2 rounded-full border-2 border-[#00ff88]" />
        5X
      </div>,
      <div key="tree" className="w-5 h-5 rounded-full bg-[#8b9467] flex items-center justify-center text-[10px]">🌲</div>
    ],
    composability: [
      <div key="comp" className="flex items-center -space-x-1.5">
        <div className="w-4 h-4 rounded-full bg-gray-600 border border-black z-10" />
        <div className="w-4 h-4 rounded-full bg-blue-500 border border-black z-20" />
        <div className="w-4 h-4 rounded-full bg-green-500 border border-black z-30" />
        <div className="w-4 h-4 rounded-full bg-purple-500 border border-black z-40" />
        <span className="text-[10px] ml-2 text-muted">+8</span>
      </div>
    ],
    strategist: "Gamma Research",
    strategistHasArrow: true,
    status: "live",
    depositIcon: (
      <div className="relative">
        <img src="/images/aUSD.svg" alt="aUSD" className="w-8 h-8 rounded-full object-cover" />
        {/* <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-black" /> */}
        {/* <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-purple-500 border-2 border-black" /> */}
      </div>
    ),
    strategistIcon: <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-[10px] font-bold">Γ</div>,
  },
  {
    id: "high-growth-eth",
    name: "High Growth ETH",
    category: "DeFi Yield",
    depositToken: "rsETH",
    depositSubLabel: "Ethereum",
    tvl: "15.29K rsETH",
    tvlUsd: "$34,639,068",
    cap: "—",
    apy: "2.99%",
    apyTone: "positive",
    rewardTags: [
      <div key="5x" className="flex items-center gap-1 bg-[#004225] text-[#00ff88] rounded-full px-2 py-0.5 text-[10px] font-bold">
        <div className="w-2 h-2 rounded-full border-2 border-[#00ff88]" />
        5X
      </div>,
      <div key="orange" className="w-5 h-5 rounded-full bg-[#c2410c] flex items-center justify-center text-[10px]">♦</div>
    ],
    composability: [],
    strategist: "Edge UltraYield",
    strategistHasArrow: true,
    status: "live",
    depositIcon: (
      <div className="relative">
        <img src="/images/rsETH.svg" alt="rsETH" className="w-8 h-8 rounded-full object-cover" />
        {/* <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border-2 border-gray-800 flex items-center justify-center text-[8px] text-white">eth</div> */}
      </div>
    ),
    strategistIcon: <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-black text-[10px] font-bold">E</div>,
  },
];

const TABS = [
  { key: "all", label: "Yield Vaults" },
] as const;

function fmtUsd(n: number) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function VaultOverview() {
  const { address } = useAccount();
  const { isConnected, isOnMonad, contractsReady } = useProtocolReadiness();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 10_000,
  });

  const { data: userVault } = useQuery({
    queryKey: ["user-vault", address],
    queryFn: () => api.getUserVault(address!),
    enabled: Boolean(address),
    refetchInterval: 10_000,
  });

  const { data: vusdBalance } = useVusdBalance();
  const { data: claimable } = useClaimableYield();
  const { claimYield, isPending: claiming, isConfirming: claimConfirming } =
    useClaimYield();

  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [depositOpen, setDepositOpen] = useState(false);

  const vusdFormatted = vusdBalance
    ? Number(formatUnits(vusdBalance as bigint, USDC_DECIMALS)).toFixed(2)
    : userVault?.vUsdBalance.toFixed(2) ?? "0.00";

  const yieldFormatted = claimable
    ? Number(formatUnits(claimable as bigint, USDC_DECIMALS)).toFixed(4)
    : userVault?.claimableYield.toFixed(4) ?? "0.0000";

  const canClaim =
    isConnected &&
    isOnMonad &&
    contractsReady &&
    Number(yieldFormatted) > 0 &&
    !claiming &&
    !claimConfirming;

  // Real Nolos vault row, derived from on-chain stats
  const nolosVault: VaultRow = useMemo(() => {
    const tvlNum = stats?.totalTvl ?? 0;
    const yieldNum = stats?.totalYieldDistributed ?? 0;
    const apy = tvlNum > 0 ? (yieldNum / tvlNum) * 100 * 12 : 0; // crude annualization
    return {
      id: "nolos-l2lp",
      name: "Null Loss-to-LP",
      category: "Loss-to-LP",
      depositToken: "USDC",
      depositSubLabel: "Monad Testnet",
      tvl: `${tvlNum.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`,
      tvlUsd: `$${tvlNum.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
      cap: "—",
      apy: apy > 0 ? `${apy.toFixed(2)}%` : "0.00%",
      apyTone: apy > 0 ? "positive" : "muted",
      rewardTags: ["NOLOS", "vUSD"],
      composability: ["KIN", "APR", "MGM"],
      strategist: "Nolos Labs",
      status: "live",
    };
  }, [stats]);

  const allRows: VaultRow[] = useMemo(
    () => [nolosVault, ...FAKE_VAULTS],
    [nolosVault],
  );

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      const matchesTab =
        tab === "all" ||
        (tab === "lending" && row.category === "Lending") ||
        (tab === "defi" && row.category === "Loss-to-LP") ||
        (tab === "ls" &&
          (row.category === "Liquid Staking" || row.category === "Restaking")) ||
        (tab === "new" && row.id === "nolos-l2lp");
      const q = search.trim().toLowerCase();
      const matchesQuery =
        q.length === 0 ||
        row.name.toLowerCase().includes(q) ||
        row.depositToken.toLowerCase().includes(q) ||
        row.strategist.toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [allRows, tab, search]);

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6">
      {/* Tabs row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex flex-wrap items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${
                tab === t.key
                  ? "bg-positive/15 text-positive"
                  : "text-muted hover:bg-white/4 hover:text-foreground"
              }`}
            >
              {t.label}
              {"badge" in t && t.badge ? (
                <span className="rounded-full bg-positive/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-positive">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          <button
            disabled
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line opacity-40"
          >
            ‹
          </button>
          <span className="rounded-full border border-line bg-panel px-3 py-1 font-mono text-foreground">
            1
          </span>
          <span>of 1</span>
          <button
            disabled
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line opacity-40"
          >
            ›
          </button>
        </div>
      </div>

      {/* Search + filter row */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2.5 text-sm">
            <span className="text-muted">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vaults"
              className="w-full bg-transparent outline-none placeholder:text-muted"
            />
          </div>
        </div>
        <FilterChip label="All tokens" />
        <FilterChip label="All chains" />
        <FilterChip label="Composability" />
      </div>

      <section className="mt-4 border border-line bg-canvas">
        <div className="border-b border-line px-4 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
            Vault economics
          </h2>
          <p className="mt-2 text-sm text-muted">
            Core vault metrics and keeper mode.
          </p>
        </div>
        <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-5">
          <EconomyStat label="Vault TVL" value={stats ? fmtUsd(stats.totalTvl) : "—"} />
          <EconomyStat
            label="Total volume"
            value={stats ? fmtUsd(stats.totalVolume) : "—"}
          />
          <EconomyStat
            label="Yield distributed"
            value={stats ? fmtUsd(stats.totalYieldDistributed) : "—"}
          />
          <EconomyStat
            label="Total followers"
            value={stats ? String(stats.totalFollowers) : "—"}
          />
          <EconomyStat
            label="Keeper mode"
            value={stats?.keeperMode ?? "In-memory Express"}
          />
        </div>
      </section>

      {/* Table */}
      <section className="mt-4 overflow-hidden border border-line bg-canvas">
        <div className="hidden grid-cols-[2fr_1.4fr_1.2fr_0.8fr_1fr_1.2fr_1.2fr_1.4fr_140px] gap-3 border-b border-line px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted lg:grid">
          <span>Vault</span>
          <span>Deposit</span>
          <span>↓ TVL</span>
          <span>Cap</span>
          <span>Total APY</span>
          <span>+ Rewards</span>
          <span>Composability</span>
          <span>Strategist</span>
          <span className="text-right" />
        </div>

        <div className="divide-y divide-line">
          {filteredRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted">
              No vaults match your search.
            </div>
          ) : (
            filteredRows.map((row) => (
              <Row
                key={row.id}
                row={row}
                onDeposit={
                  row.id === "nolos-l2lp" ? () => setDepositOpen(true) : undefined
                }
              />
            ))
          )}
        </div>
      </section>

      {/* Your position card */}
      <section className="mt-6 grid gap-px bg-line lg:grid-cols-[1.5fr_1fr]">
        <div className="bg-canvas px-5 py-5">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">
            Your Nolos Loss-to-LP position
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Metric label="vUSD balance" value={`${vusdFormatted} vUSD`} />
            <Metric label="Claimable yield" value={`${yieldFormatted} USDC`} />
            <Metric
              label="Total deposited"
              value={
                userVault ? `$${userVault.totalDeposit.toLocaleString()}` : "—"
              }
            />
          </div>
        </div>
        <aside className="bg-panel px-5 py-5">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">
            Yield split
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <SplitRow label="vUSD holders" value="70%" />
            <SplitRow label="Leader incentive" value="20%" />
            <SplitRow label="Protocol treasury" value="10%" />
          </div>
          <button
            onClick={() => canClaim && claimYield()}
            disabled={!canClaim}
            className="mt-5 w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {claiming
              ? "Confirm in wallet..."
              : claimConfirming
                ? "Claiming..."
                : !isConnected
                  ? "Connect wallet to claim"
                  : !isOnMonad
                    ? "Switch to Monad"
                    : !contractsReady
                      ? "Contracts not deployed"
                      : Number(yieldFormatted) === 0
                        ? "No yield yet"
                        : `Claim ${yieldFormatted} USDC`}
          </button>
        </aside>
      </section>

      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </main>
  );
}

function EconomyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-canvas px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-mono text-base text-foreground">{value}</p>
    </div>
  );
}

function Row({ row, onDeposit }: { row: VaultRow; onDeposit?: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-4 text-sm lg:grid-cols-[2fr_1.4fr_1.2fr_0.8fr_1fr_1.2fr_1.2fr_1.4fr_140px] lg:items-center lg:gap-3">
      {/* Vault name + category */}
      <div className="col-span-2 lg:col-span-1">
        <p className="font-semibold text-foreground">{row.name}</p>
        <p className="text-xs text-muted">{row.category}</p>
      </div>

      {/* Deposit token */}
      <Cell label="Deposit">
        <div className="flex items-center gap-2">
          {row.depositIcon ? (
            row.depositIcon
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
              {row.depositToken.slice(0, 3)}
            </span>
          )}
          <div className="leading-tight">
            <p className="font-mono text-foreground">{row.depositToken}</p>
            <p className="text-[11px] text-muted whitespace-pre">{row.depositSubLabel}</p>
          </div>
        </div>
      </Cell>

      {/* TVL */}
      <Cell label="TVL">
        <p className="font-mono text-foreground">{row.tvl}</p>
        <p className="text-[11px] text-muted">{row.tvlUsd}</p>
      </Cell>

      {/* Cap */}
      <Cell label="Cap">
        <span className="font-mono text-muted">{row.cap ?? "—"}</span>
      </Cell>

      {/* APY */}
      <Cell label="Total APY">
        <div
          className={`font-mono ${
            row.apyTone === "positive" ? "text-positive" : "text-muted"
          }`}
        >
          {row.apy}
        </div>
        <p className="text-[11px] text-muted flex items-center gap-1">
          (30D)
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-60"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </p>
      </Cell>

      {/* Rewards */}
      <Cell label="+ Rewards">
        <div className="flex flex-wrap gap-1">
          {row.rewardTags.map((tag, i) => (
            typeof tag === 'string' ? (
              <span
                key={tag}
                className="rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] font-mono text-foreground"
              >
                {tag}
              </span>
            ) : (
              <div key={i}>{tag}</div>
            )
          ))}
        </div>
      </Cell>

      {/* Composability */}
      <Cell label="Composability">
        <div className="flex flex-wrap gap-1">
          {row.composability.length > 0 ? (
            row.composability.map((tag, i) => (
              typeof tag === 'string' ? (
                <span
                  key={tag}
                  className="rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] font-mono text-muted"
                >
                  {tag}
                </span>
              ) : (
                <div key={i}>{tag}</div>
              )
            ))
          ) : (
            <span className="text-muted">—</span>
          )}
        </div>
      </Cell>

      {/* Strategist */}
      <Cell label="Strategist">
        <div className="flex items-center gap-2 text-foreground hover:text-accent cursor-pointer transition-colors w-fit">
          {row.strategistIcon}
          <span className="font-medium">{row.strategist}</span>
          {row.strategistHasArrow && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 ml-1"><path d="M7 17l9.2-9.2M17 16.8V7H7.2"/></svg>
          )}
        </div>
      </Cell>

      {/* Action */}
      <div className="col-span-2 lg:col-span-1 lg:text-right">
        {row.status === "live" ? (
          <button
            onClick={onDeposit}
            className="w-full rounded-full border border-positive/60 px-4 py-2 text-sm font-semibold text-positive hover:bg-positive/10 lg:w-auto"
          >
            Deposit
          </button>
        ) : (
          <button
            disabled
            className="w-full rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted opacity-60 lg:w-auto"
          >
            Soon
          </button>
        )}
      </div>
    </div>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted lg:hidden">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <button
      disabled
      className="flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2.5 text-xs text-muted opacity-80"
    >
      {label}
      <span className="text-[10px]">▾</span>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1.5 font-mono text-2xl text-foreground">{value}</p>
    </div>
  );
}

function SplitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-2">
      <span>{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

function DepositModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { isConnected, isOnMonad, contractsReady } = useProtocolReadiness();
  const { data: usdcBalance, refetch: refetchUsdc } = useUsdcBalance();
  const {
    approve,
    allowance,
    isPending: approving,
    isConfirming: approveConfirming,
    hash: approveHash,
  } = useUsdcApproval(protocolAddresses.vault);
  const {
    depositLiquidity,
    isPending: depositing,
    isConfirming: depositConfirming,
    hash: depositHash,
  } = useDepositVault();

  const [amount, setAmount] = useState(100);

  useEffect(() => {
    if (depositHash) refetchUsdc();
  }, [depositHash, refetchUsdc]);

  const ready = isConnected && isOnMonad && contractsReady;
  const usdcFormatted = usdcBalance
    ? Number(formatUnits(usdcBalance as bigint, USDC_DECIMALS)).toFixed(2)
    : "0.00";
  const amountBigInt = parseUnits(String(amount || 0), USDC_DECIMALS);
  const needsApproval =
    allowance !== undefined && (allowance as bigint) < amountBigInt;

  if (!open) return null;

  const handleDeposit = () => {
    if (!ready) return;
    if (needsApproval) approve(amountBigInt);
    else depositLiquidity(amount);
  };

  const busy =
    approving || approveConfirming || depositing || depositConfirming;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-line bg-canvas p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line pb-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em]">
            Deposit to Nolos Loss-to-LP
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Wallet</span>
            <span className="font-mono text-foreground">
              {usdcFormatted} USDC
            </span>
          </div>

          <label className="block text-xs">
            <span className="mb-1 block text-muted">Amount (USDC)</span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-2xl border border-line bg-panel px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <p className="text-xs leading-5 text-muted">
            Manual liquidity earns from trading fees + future strategy yield.
            You can withdraw later via the Vault contract.
          </p>

          <button
            disabled={!ready || busy || amount <= 0}
            onClick={handleDeposit}
            className="w-full rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {approving
              ? "Approving..."
              : approveConfirming
                ? "Confirming approval..."
                : depositing
                  ? "Confirm in wallet..."
                  : depositConfirming
                    ? "Depositing..."
                    : !ready
                      ? "Wallet not ready"
                      : needsApproval
                        ? `Approve ${amount} USDC`
                        : `Deposit ${amount} USDC`}
          </button>
        </div>
      </div>
    </div>
  );
}
