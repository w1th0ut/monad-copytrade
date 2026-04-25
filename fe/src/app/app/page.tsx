import { AppShell } from "@/components/shell/app-shell";

export default function AppPage() {
  return (
    <AppShell active="trade" title="Trade" description="Open a new position">
      <div className="p-4 sm:p-6 text-center text-muted">
        Stub Trade Dashboard
      </div>
    </AppShell>
  );
}
