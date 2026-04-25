import { AppShell } from "@/components/shell/app-shell";
import { VaultOverview } from "@/components/trading/vault-overview";

export default function VaultPage() {
  return (
    <AppShell
      active="vault"
      title="Perpetual Vault"
      description="The vault turns realized stop-loss events into yield-bearing LP ownership. vUSD receipts stay in the wallet and keep streaming future fee claims."
    >
      <VaultOverview />
    </AppShell>
  );
}
