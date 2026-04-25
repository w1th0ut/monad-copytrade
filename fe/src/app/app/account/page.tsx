import { AppShell } from "@/components/shell/app-shell";
import { AccountPanel } from "@/components/trading/account-panel";

export default function AccountPage() {
  return (
    <AppShell
      active="account"
      title="Account"
      description="Mint test USDC, deposit to the trading engine, or register yourself as a Leader so others can copy your trades."
    >
      <AccountPanel />
    </AppShell>
  );
}
