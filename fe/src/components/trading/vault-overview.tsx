"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import {
  useClaimYield,
  useClaimableYield,
  useVusdBalance,
} from "@/hooks/use-monad-contract";
import { useProtocolReadiness } from "@/hooks/use-protocol-readiness";
import { api } from "@/lib/api";

const USDC_DECIMALS = 6;
const feeBreakdown = [
  { label: "vUSD yield pool", value: "70%" },
  { label: "Leader incentive", value: "20%" },
  { label: "Protocol treasury", value: "10%" },
];

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
  const { claimYield, isPending, isConfirming } = useClaimYield();

  const vusdFormatted = vusdBalance
    ? Number(formatUnits(vusdBalance as bigint, USDC_DECIMALS)).toFixed(2)
    : userVault?.vUsdBalance.toFixed(2) ?? "0.00";

  const yieldFormatted = claimable
    ? Number(formatUnits(claimable as bigint, USDC_DECIMALS)).toFixed(4)
    : userVault?.claimableYield.toFixed(4) ?? "0.0000";

  const canClaim =
    isConnected && isOnMonad && contractsReady && Number(yieldFormatted) > 0 && !isPending && !isConfirming;

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6">
      <section className="overflow-hidden border border-line bg-line xl:grid xl:grid-cols-[minmax(0,1.2fr)_1fr]">
        <div className="bg-canvas">
          <div className="border-b border-line px-4 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
              Yielding vault
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Losses are not burned away. They become permanent vault liquidity,
              while vUSD receipts preserve each user&apos;s claim on future fee
              distribution.
            </p>
          </div>
          <div className="grid gap-px bg-line md:grid-cols-3">
            <Metric
              label="TVL"
              value={stats ? `$${stats.totalTvl.toLocaleString()}` : "—"}
            />
            <Metric
              label="Total yield distributed"
              value={
                stats ? `$${stats.totalYieldDistributed.toLocaleString()}` : "—"
              }
            />
            <Metric
              label="Keeper"
              value={stats?.keeperMode ?? "—"}
            />
          </div>

          <div className="border-t border-line px-4 py-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">
              Your position
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
        </div>

        <aside className="bg-panel">
          <div className="border-b border-line px-4 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
              Fee split
            </h2>
          </div>
          <div className="space-y-4 px-4 py-5 text-sm leading-6 text-muted">
            {feeBreakdown.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 border-b border-line/70 pb-4"
              >
                <span>{item.label}</span>
                <span className="font-mono text-foreground">{item.value}</span>
              </div>
            ))}
            <div className="rounded-3xl border border-line bg-canvas px-4 py-4">
              <p className="font-medium text-foreground">Claim model</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Yield is proportional to your vUSD balance over the total vUSD
                supply. Claims do not burn the receipt, so the stream stays alive
                for future fee epochs.
              </p>
            </div>
            <button
              onClick={() => canClaim && claimYield()}
              disabled={!canClaim}
              className="w-full rounded-full bg-accent px-4 py-3 font-semibold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending
                ? "Confirm in wallet..."
                : isConfirming
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
          </div>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-canvas px-4 py-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 font-mono text-2xl text-foreground">{value}</p>
    </div>
  );
}
