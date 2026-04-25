import { AppShell } from "@/components/shell/app-shell";
import { AccountPanel } from "@/components/trading/account-panel";
import { MyPositionsPanel } from "@/components/trading/my-positions-panel";

export default function AccountPage() {
  return (
    <AppShell
      active="account"
      title="Account"
      description="Mint test USDC, deposit to the trading engine, or register yourself as a Leader so others can copy your trades."
    >
      <AccountPanel />
      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-4 pb-10 sm:px-6">
        <MyPositionsPanel />
      </div>
    </AppShell>
  );
}
