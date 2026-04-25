import Link from "next/link";
import { ScrollVideo } from "@/components/landing/scroll-video";

export default function LandingPage() {
  return (
    <main className="relative text-foreground">
      {/* Scroll-driven video backdrop fixed behind the whole landing */}
      <ScrollVideo
        src="/BG.mp4"
        className="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-background/30 via-background/30 to-background/70" />
      <div className="surface-grid pointer-events-none fixed inset-0 z-0 opacity-10" />

      {/* All content sits above the fixed video layer */}
      <div className="relative z-10">

      {/* Sticky nav */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-6 w-1.5 rounded-full bg-foreground" />
              <span className="h-4 w-1.5 translate-y-1 rounded-full bg-foreground/55" />
            </span>
            <span className="text-lg font-semibold tracking-[0.18em] uppercase">
              Nolos
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#metrics" className="hover:text-foreground">
              Metrics
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </nav>
          <Link
            href="/app"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/4"
          >
            Open Trade App
          </Link>
        </div>
      </header>

      {/* Hero (first viewport) */}
      <section className="relative mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[1600px] flex-col justify-center px-4 sm:px-6">
        <div className="fade-up max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-accent">
            Monad Perps + Loss-to-LP
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight text-foreground sm:text-7xl">
            Trade first. If the stop hits, the loss keeps working for you.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted sm:text-lg">
            Copy-trade perpetual futures on Monad. When a stop-loss triggers,
            the loss is recycled into vault liquidity that mints you a yield-
            bearing receipt instead of vanishing into the void.
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
            <a
              href="#how"
              className="rounded-full border border-line/60 px-5 py-3 text-sm font-semibold text-muted hover:text-foreground hover:bg-white/4"
            >
              How it works
            </a>
          </div>

          <div className="mt-14 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-muted">
            <span className="status-orb h-2 w-2 rounded-full bg-positive" />
            Live on Monad testnet
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-muted">
          scroll ↓
        </div>
      </section>

      {/* How it works (3 steps) */}
      <section
        id="how"
        className="relative mx-auto w-full max-w-[1600px] px-4 py-32 sm:px-6"
      >
        <p className="font-mono text-xs uppercase tracking-[0.26em] text-accent">
          How it works
        </p>
        <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Three moves. One protocol that turns drawdowns into liquidity.
        </h2>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              tag: "01",
              title: "Follow a leader",
              body:
                "Pick a registered leader, set margin and leverage. Their entries mirror to your account 1:1 with your size.",
            },
            {
              tag: "02",
              title: "Stop hits, loss is captured",
              body:
                "When the keeper executes a stop-loss, the loss does not just disappear — it is routed into the protocol vault.",
            },
            {
              tag: "03",
              title: "Receive vUSD receipts",
              body:
                "You get a vUSD receipt for the captured loss. It accrues yield from open trader fees and pool earnings.",
            },
          ].map((step) => (
            <div
              key={step.tag}
              className="border border-line bg-panel/60 p-7 backdrop-blur-xl"
            >
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
                Step {step.tag}
              </p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section
        id="features"
        className="relative mx-auto w-full max-w-[1600px] px-4 py-32 sm:px-6"
      >
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-accent">
              Features
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Built around the moments that matter.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted">
              Speed of Monad, ergonomics of a pro futures terminal, and a vault
              mechanic that quietly compounds in the background.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Copy-trade futures",
                body:
                  "Mirror leader trades automatically with your own margin, leverage and stop-loss policy.",
              },
              {
                title: "Loss-to-LP vault",
                body:
                  "Stopped-out collateral is captured into the vault and redeemed as yield-bearing vUSD.",
              },
              {
                title: "Keeper-driven SL",
                body:
                  "An on-chain keeper enforces your stop-loss against fresh oracle prices, no manual babysitting.",
              },
              {
                title: "Real-time charting",
                body:
                  "TradingView-grade chart, order ticket, and risk panel — wired to live Pyth feeds.",
              },
              {
                title: "Transparent registry",
                body:
                  "Leader stats and follower lists live on-chain. Pick partners by track record, not vibes.",
              },
              {
                title: "Built for Monad",
                body:
                  "Sub-second confirmations and high throughput, so position management feels like a CEX.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="border border-line bg-panel/55 p-6 backdrop-blur-xl"
              >
                <h3 className="text-base font-semibold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics strip */}
      <section
        id="metrics"
        className="relative mx-auto w-full max-w-[1600px] px-4 py-32 sm:px-6"
      >
        <div className="border border-line bg-panel/60 p-10 backdrop-blur-xl">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-accent">
            Protocol metrics
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Vault economics, plain and on-chain.
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Network", value: "Monad", sub: "Testnet · 10143" },
              { label: "Settlement", value: "USDC", sub: "Mock on testnet" },
              { label: "Receipt token", value: "vUSD", sub: "1:1 captured loss" },
              { label: "Stop-loss", value: "Keeper", sub: "Pyth-backed" },
            ].map((m) => (
              <div key={m.label} className="border-t border-line pt-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">
                  {m.label}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {m.value}
                </p>
                <p className="mt-1 text-xs text-muted">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For traders / leaders */}
      <section className="relative mx-auto w-full max-w-[1600px] px-4 py-32 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="border border-line bg-panel/60 p-9 backdrop-blur-xl">
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-accent">
              For followers
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">
              Trade like the leaders you trust.
            </h3>
            <ul className="mt-6 space-y-3 text-sm leading-6 text-muted">
              <li>· Per-leader margin, leverage and SL configuration</li>
              <li>· Mirror entries automatically — exits are yours</li>
              <li>· Capture stopped-out value as vUSD receipts</li>
            </ul>
            <Link
              href="/app/leaders"
              className="mt-7 inline-flex rounded-full border border-line px-5 py-3 text-sm font-semibold hover:bg-white/4"
            >
              Browse leaders →
            </Link>
          </div>

          <div className="border border-line bg-panel/60 p-9 backdrop-blur-xl">
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-accent">
              For leaders
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">
              Register a public track record.
            </h3>
            <ul className="mt-6 space-y-3 text-sm leading-6 text-muted">
              <li>· On-chain identity with username + perf history</li>
              <li>· Earn from follower flow as your edge compounds</li>
              <li>· No off-chain promises — entries are settled by keeper</li>
            </ul>
            <Link
              href="/app"
              className="mt-7 inline-flex rounded-full border border-line px-5 py-3 text-sm font-semibold hover:bg-white/4"
            >
              Become a leader →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="relative mx-auto w-full max-w-[1200px] px-4 py-32 sm:px-6"
      >
        <p className="font-mono text-xs uppercase tracking-[0.26em] text-accent">
          FAQ
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Quick answers.
        </h2>

        <div className="mt-12 divide-y divide-line border-t border-b border-line">
          {[
            {
              q: "What does loss-to-LP actually mean?",
              a: "When a stop-loss triggers, the lost collateral is routed into the protocol vault rather than to a counterparty. You receive a vUSD receipt for that amount. The vault earns fees from active traders, and the receipt is redeemable as that yield accumulates.",
            },
            {
              q: "Is this live on mainnet?",
              a: "Currently deployed on Monad testnet (chain id 10143). The protocol uses MockUSDC for settlement until canonical USDC is wired up.",
            },
            {
              q: "Who runs the keeper?",
              a: "The keeper is permissionless logic enforced by the contracts — currently operated by the team during testnet, with rotation planned post-mainnet. It checks Pyth prices and triggers stop-loss execution.",
            },
            {
              q: "Do I need to trust a leader's word?",
              a: "No. Leader registration, follower lists and trade execution all live on-chain. You judge a leader by their public history, not by promises.",
            },
          ].map((item, i) => (
            <details key={i} className="group py-6">
              <summary className="flex cursor-pointer items-center justify-between gap-6 text-base font-semibold list-none">
                <span>{item.q}</span>
                <span className="font-mono text-muted transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto w-full max-w-[1600px] px-4 pb-32 sm:px-6">
        <div className="border border-line bg-panel/70 p-12 text-center backdrop-blur-xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Stop wasting your stop-losses.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted">
            Connect your wallet on Monad testnet and try the full flow:
            register, follow a leader, deposit collateral and watch the vault
            mechanics in real time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/app"
              className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90"
            >
              Launch App
            </Link>
            <Link
              href="/app/vault"
              className="rounded-full border border-line px-6 py-3 text-sm font-semibold hover:bg-white/4"
            >
              Vault overview
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-5 w-1.5 rounded-full bg-foreground" />
              <span className="h-3 w-1.5 translate-y-1 rounded-full bg-foreground/55" />
            </span>
            <span className="text-sm font-semibold tracking-[0.18em] uppercase">
              Nolos
            </span>
          </div>
          <p className="text-xs text-muted">
            Loss-to-LP perpetual futures on Monad. Testnet build.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted">
            <Link href="/app" className="hover:text-foreground">
              App
            </Link>
            <Link href="/app/leaders" className="hover:text-foreground">
              Leaders
            </Link>
            <Link href="/app/vault" className="hover:text-foreground">
              Vault
            </Link>
          </div>
        </div>
      </footer>
      </div>
    </main>
  );
}
