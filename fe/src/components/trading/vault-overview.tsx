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
  category: "Loss-to-LP" | "Liquid Staking" | "Lending" | "Restaking";
  depositToken: string;
  depositSubLabel: string;
  tvl: string;
  tvlUsd: string;
  cap?: string;
  apy: string;
  apyTone: "positive" | "muted";
  rewardTags: string[];
  composability: string[];
  strategist: string;
  status: "live" | "coming-soon";
};

const FAKE_VAULTS: VaultRow[] = [
  {
    id: "kintsu-mon",
    name: "sMON Liquid Staking",
    category: "Liquid Staking",
    depositToken: "MON",
    depositSubLabel: "Monad Mainnet",
    tvl: "284.1K MON",
    tvlUsd: "$1.42M",
    apy: "5.21%",
    apyTone: "positive",
    rewardTags: ["KIN"],
    composability: ["NOLOS", "MGM", "CRV"],
    strategist: "Kintsu",
    status: "coming-soon",
  },
  {
    id: "apriori-eth",
    name: "Restaked ETH Vault",
    category: "Restaking",
    depositToken: "rsETH",
    depositSubLabel: "Monad",
    tvl: "1.93K rsETH",
    tvlUsd: "$5.94M",
    apy: "3.04%",
    apyTone: "positive",
    rewardTags: ["APR", "EIGEN"],
    composability: ["NOLOS"],
    strategist: "Apriori",
    status: "coming-soon",
  },
  {
    id: "magma-usdc",
    name: "USDC Lending Strategy",
    category: "Lending",
    depositToken: "USDC",
    depositSubLabel: "Monad",
    tvl: "612K USDC",
    tvlUsd: "$612,041",
    apy: "8.74%",
    apyTone: "positive",
    rewardTags: ["MGM"],
    composability: ["NOLOS", "KIN"],
    strategist: "Magma",
    status: "coming-soon",
  },
];

const TABS = [
  { key: "all", label: "All vaults" },
  { key: "lending", label: "Lending" },
  { key: "defi", label: "DeFi Yield" },
  { key: "ls", label: "Liquid Staking" },
  { key: "new", label: "Recently launched", badge: "New" },
] as const;

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
      name: "Nolos Loss-to-LP",
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
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
            {row.depositToken.slice(0, 3)}
          </span>
          <div className="leading-tight">
            <p className="font-mono text-foreground">{row.depositToken}</p>
            <p className="text-[11px] text-muted">{row.depositSubLabel}</p>
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
        <p
          className={`font-mono ${
            row.apyTone === "positive" ? "text-positive" : "text-muted"
          }`}
        >
          {row.apy}
        </p>
        <p className="text-[11px] text-muted">(30D)</p>
      </Cell>

      {/* Rewards */}
      <Cell label="+ Rewards">
        <div className="flex flex-wrap gap-1">
          {row.rewardTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] font-mono text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </Cell>

      {/* Composability */}
      <Cell label="Composability">
        <div className="flex flex-wrap gap-1">
          {row.composability.length > 0 ? (
            row.composability.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] font-mono text-muted"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-muted">—</span>
          )}
        </div>
      </Cell>

      {/* Strategist */}
      <Cell label="Strategist">
        <span className="font-medium text-foreground">{row.strategist}</span>
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
