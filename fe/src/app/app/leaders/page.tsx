import { AppShell } from "@/components/shell/app-shell";
import { LeadersOverview } from "@/components/trading/leaders-overview";

export default function LeadersPage() {
  return (
    <AppShell
      active="leaders"
      title="Leaderboard"
      description="Curated leader profiles for copy-trading. Followers define their own margin, leverage, and maximum stop loss before the keeper mirrors any position."
    >
      <LeadersOverview />
    </AppShell>
  );
}
