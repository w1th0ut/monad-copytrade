import { AppShell } from "@/components/shell/app-shell";
import { TradeDashboard } from "@/components/trading/trade-dashboard";

export default function TradeAppPage() {
  return (
    <AppShell active="trade">
      <TradeDashboard />
    </AppShell>
  );
}
