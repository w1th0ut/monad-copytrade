"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { WalletActionButton } from "@/components/wallet/wallet-action-button";
import { marketSnapshot } from "@/lib/mock-data";
import { api } from "@/lib/api";

type AppShellProps = {
  active: "trade" | "leaders" | "vault" | "account";
  children: ReactNode;
  title?: string;
  description?: string;
};

const navItems = [
  { href: "/app", label: "Trade", key: "trade" },
  { href: "/app/leaders", label: "Leaders", key: "leaders" },
  { href: "/app/vault", label: "Vault", key: "vault" },
  { href: "/app/account", label: "Account", key: "account" },
] as const;

function isActive(
  active: AppShellProps["active"],
  key: (typeof navItems)[number]["key"],
) {
  return active === key;
}

const fmtPrice = (n: number) =>
  `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function AppShell({
  active,
  children,
  title,
  description,
}: AppShellProps) {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 1_000,
  });

  const ethPrice = stats?.prices?.["ETH/USD"]?.price;
  const markPriceLabel = ethPrice && ethPrice > 0 ? fmtPrice(ethPrice) : "—";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="surface-grid pointer-events-none absolute inset-0 opacity-20" />
      <header className="relative z-10 border-b border-line bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-6 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="h-6 w-1.5 rounded-full bg-foreground" />
                <span className="h-4 w-1.5 translate-y-1 rounded-full bg-foreground/55" />
              </span>
              <span className="text-lg font-semibold tracking-[0.18em] uppercase">
                Null Loss
              </span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm text-muted md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`rounded-full px-3 py-2 ${
                    isActive(active, item.key)
                      ? "bg-accent-soft text-foreground"
                      : "hover:bg-white/4 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <WalletActionButton className="bg-foreground text-background hover:opacity-90" />
          </div>
        </div>
        <div className="border-t border-line bg-background/70">
          <div className="mx-auto grid w-full max-w-[1600px] gap-px px-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-7">
            <div className="flex items-center gap-3 py-4">
              <span className="rounded-full border border-line bg-panel px-3 py-1.5 font-mono text-xs text-muted">
                {marketSnapshot.symbol}
              </span>
              <span className="font-mono text-sm text-foreground">
                {markPriceLabel}
              </span>
            </div>
            <StatCell label="Index" value={markPriceLabel} />
            <StatCell
              label="24h"
              value={marketSnapshot.change24h}
              tone="positive"
            />
            <StatCell label="Volume" value={marketSnapshot.volume24h} />
            <StatCell label="Open interest" value={marketSnapshot.openInterest} />
            <StatCell label="Funding" value={marketSnapshot.fundingRate} />
            <StatCell label="Vault APR" value={marketSnapshot.vaultApr} />
          </div>
        </div>
      </header>
      {(title || description) && (
        <section className="relative z-10 mx-auto w-full max-w-[1600px] px-4 pt-8 pb-6 sm:px-6">
          {title && (
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              {description}
            </p>
          )}
        </section>
      )}
      {children}
    </div>
  );
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line py-4 text-sm sm:border-t-0 sm:border-l sm:pl-4">
      <span className="text-muted">{label}</span>
      <span
        className={`font-mono ${
          tone === "positive" ? "text-positive" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
