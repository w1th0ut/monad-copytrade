import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="surface-grid pointer-events-none absolute inset-0 opacity-20" />
      <section className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col justify-between px-4 py-8 sm:px-6">
        <header className="flex items-center justify-between gap-4 border-b border-line pb-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-6 w-1.5 rounded-full bg-foreground" />
              <span className="h-4 w-1.5 translate-y-1 rounded-full bg-foreground/55" />
            </span>
            <span className="text-lg font-semibold tracking-[0.18em] uppercase">
              Nolos
            </span>
          </Link>
          <Link
            href="/app"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/4"
          >
            Open Trade App
          </Link>
        </header>

        <div className="grid gap-12 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="fade-up max-w-4xl">
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-accent">
              Monad Perps + Loss-to-LP
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-foreground sm:text-7xl">
              Trade first. If the stop hits, the loss keeps working for you.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              Root landing page is now reserved for the public-facing site. The
              trading product lives at <span className="font-mono text-foreground">/app</span>,
              with copy-trade futures, TradingView charting, and vault receipt
              mechanics already scaffolded.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90"
              >
                Launch App
              </Link>
              <Link
                href="/app/vault"
                className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground hover:bg-white/4"
              >
                View Vault Flow
              </Link>
            </div>
          </div>

          <div className="fade-up border border-line bg-panel/70 p-5 backdrop-blur-xl">
            <div className="border-b border-line pb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
                Route Plan
              </p>
            </div>
            <div className="space-y-4 pt-5 text-sm leading-6">
              <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-4">
                <span className="text-muted">Landing</span>
                <span className="font-mono text-foreground">/</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-4">
                <span className="text-muted">Trade app</span>
                <span className="font-mono text-foreground">/app</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-4">
                <span className="text-muted">Leaders</span>
                <span className="font-mono text-foreground">/app/leaders</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted">Vault</span>
                <span className="font-mono text-foreground">/app/vault</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
