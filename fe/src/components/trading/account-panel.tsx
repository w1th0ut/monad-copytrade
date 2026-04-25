"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import {
  useDeposit,
  useIdleBalance,
  useMintUsdc,
  useRegisterLeader,
  useUsdcApproval,
  useUsdcBalance,
  USDC_ADDRESS,
  USDC_DECIMALS,
} from "@/hooks/use-monad-contract";
import { useProtocolReadiness } from "@/hooks/use-protocol-readiness";
import { protocolAddresses } from "@/lib/web3/contracts";
import { parseUnits } from "viem";
import { LeaderOpenPosition } from "@/components/trading/leader-open-position";

export function AccountPanel() {
  const { isConnected, isOnMonad, contractsReady, shortAddress } =
    useProtocolReadiness();

  const [mintAmount, setMintAmount] = useState(1000);
  const [depositAmount, setDepositAmount] = useState(100);
  const [username, setUsername] = useState("");

  const { data: usdcBalance, refetch: refetchUsdc } = useUsdcBalance();
  const { data: idleBalance, refetch: refetchIdle } = useIdleBalance();

  const { mint, isPending: minting, isConfirming: mintConfirming, hash: mintHash } =
    useMintUsdc();
  const { approve, allowance, isPending: approving, isConfirming: approveConfirming, hash: approveHash } =
    useUsdcApproval(protocolAddresses.tradingEngine);
  const { deposit, isPending: depositing, isConfirming: depositConfirming, hash: depositHash } =
    useDeposit();
  const {
    registerLeader,
    isPending: registering,
    isConfirming: registerConfirming,
    hash: registerHash,
  } = useRegisterLeader();

  useEffect(() => {
    if (mintHash) refetchUsdc();
  }, [mintHash, refetchUsdc]);

  useEffect(() => {
    if (depositHash) {
      refetchUsdc();
      refetchIdle();
    }
  }, [depositHash, refetchUsdc, refetchIdle]);

  const ready = isConnected && isOnMonad && contractsReady;
  const usdcFormatted = usdcBalance
    ? Number(formatUnits(usdcBalance as bigint, USDC_DECIMALS)).toFixed(2)
    : "0.00";
  const idleFormatted = idleBalance
    ? Number(formatUnits(idleBalance as bigint, USDC_DECIMALS)).toFixed(2)
    : "0.00";

  const depositAmountBigInt = parseUnits(String(depositAmount || 0), USDC_DECIMALS);
  const needsApproval =
    allowance !== undefined && (allowance as bigint) < depositAmountBigInt;

  const handleDeposit = () => {
    if (!ready) return;
    if (needsApproval) {
      approve(depositAmountBigInt);
    } else {
      deposit(depositAmount);
    }
  };

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1100px] px-4 pb-10 sm:px-6">
      <section className="border border-line bg-canvas">
        <div className="border-b border-line px-4 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
            Account
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {shortAddress ? `Wallet: ${shortAddress}` : "Connect wallet to manage your account."}
          </p>
        </div>

        <div className="grid gap-px bg-line md:grid-cols-2">
          <Card title="USDC balance (wallet)" value={`${usdcFormatted} USDC`} />
          <Card title="Idle balance (engine)" value={`${idleFormatted} USDC`} />
        </div>

        <div className="grid gap-px bg-line md:grid-cols-3">
          {/* Mint USDC */}
          <Panel title="1. Mint mock USDC">
            <p className="text-xs leading-5 text-muted">
              Testnet helper — mint free USDC to your wallet to play with the demo.
            </p>
            <NumberField
              label="Amount"
              value={mintAmount}
              onChange={setMintAmount}
            />
            <ActionButton
              disabled={!ready || minting || mintConfirming || !USDC_ADDRESS}
              onClick={() => mint(mintAmount)}
              label={
                minting
                  ? "Confirm in wallet..."
                  : mintConfirming
                    ? "Minting..."
                    : `Mint ${mintAmount} USDC`
              }
            />
          </Panel>

          {/* Deposit */}
          <Panel title="2. Deposit to trading engine">
            <p className="text-xs leading-5 text-muted">
              Required before following a leader. Approve once, then deposit.
            </p>
            <NumberField
              label="Amount"
              value={depositAmount}
              onChange={setDepositAmount}
            />
            <ActionButton
              disabled={
                !ready ||
                approving ||
                approveConfirming ||
                depositing ||
                depositConfirming
              }
              onClick={handleDeposit}
              label={
                approving
                  ? "Approving..."
                  : approveConfirming
                    ? "Confirming approval..."
                    : depositing
                      ? "Confirm in wallet..."
                      : depositConfirming
                        ? "Depositing..."
                        : needsApproval
                          ? `Approve ${depositAmount} USDC`
                          : `Deposit ${depositAmount} USDC`
              }
            />
          </Panel>

          {/* Register as Leader */}
          <Panel title="3. Register as Leader">
            <p className="text-xs leading-5 text-muted">
              Become a mentor — others can copy your trades.
            </p>
            <label className="block text-xs">
              <span className="mb-1 block text-muted">Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Delta K"
                className="w-full rounded-2xl border border-line bg-panel px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>
            <ActionButton
              disabled={
                !ready || registering || registerConfirming || !username.trim()
              }
              onClick={() => registerLeader(username.trim())}
              label={
                registering
                  ? "Confirm in wallet..."
                  : registerConfirming
                    ? "Registering..."
                    : registerHash
                      ? "Registered"
                      : "Register"
              }
            />
          </Panel>
        </div>

        {!ready && (
          <div className="border-t border-line px-4 py-4 text-xs text-muted">
            {!isConnected
              ? "Connect wallet to use these actions."
              : !isOnMonad
                ? "Switch to Monad Testnet."
                : !contractsReady
                  ? "Contract addresses missing in .env.local."
                  : null}
          </div>
        )}
      </section>

      <div className="mt-6">
        <LeaderOpenPosition />
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-canvas px-4 py-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{title}</p>
      <p className="mt-2 font-mono text-2xl text-foreground">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 bg-canvas px-4 py-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-muted">{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-2xl border border-line bg-panel px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
      />
    </label>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full bg-foreground px-3 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
