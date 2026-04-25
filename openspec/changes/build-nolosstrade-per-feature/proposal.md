## Why

The repo root currently has only docs. A working blueprint exists under `reference/` (Foundry contracts, Express keeper, Next.js dApp), but a wholesale "move it to root" port skips the discipline we want: small, reviewable commits where each commit ships one working slice. Building feature-by-feature on top of pristine baseline scaffolds — reading from `reference/` only as a source-of-truth to copy individual pieces — yields a clean git history, easier review, and confidence that every workspace compiles after every commit.

## What Changes

- Treat `reference/` as a **read-only source-of-truth**. Do not move it.
- Stand up three workspaces at the repo root from pristine framework inits:
  - `sc/` via `forge init` (no app contracts yet)
  - `be/` via `npm init` + minimal Express+TS scaffold (no domain code yet)
  - `fe/` via `npx create-next-app` (no app code yet)
- Land repo skeleton (root `README`, `.gitignore`, blueprint docs under `docs/blueprint/`, agent skill configs reviewed) as the **first commit**.
- Layer features in dependency order, **one commit per feature**, copying the relevant code from `reference/` into the corresponding workspace and verifying the workspace still builds:
  1. Smart contracts in order: `MockUSDC` → `vUSD` → `Vault` → `TradingEngine` → `CopyTradeRegistry` → deploy/seed scripts → tests.
  2. Backend: env+config → in-memory repository → REST API stubs → indexer → keeper.
  3. Frontend: web3 plumbing → app shell → trade dashboard → leaders → vault → account.
  4. Glue: address/ABI sync script wiring SC → BE/FE.
- After parity is verified end-to-end on Monad testnet, **delete `reference/`** as the final commit.

## Capabilities

### New Capabilities
- `repo-skeleton`: Root layout, `README.md`, `.gitignore`, `docs/blueprint/`, agent skills review, contribution conventions for per-feature commits.
- `workspace-baselines`: Pristine framework inits for `sc/` (Foundry), `be/` (Express+TS), `fe/` (Next.js) with no app code, each independently buildable.
- `smart-contracts`: Vault Loss-to-LP, TradingEngine perp+SL, CopyTradeRegistry, vUSD, MockUSDC, deploy/seed, tests — landed in dependency order, one commit per contract.
- `keeper-service`: Express service with config, in-memory repo, REST API, viem indexer, Pyth keeper — landed in dependency order, one commit per layer.
- `trading-dapp`: Next.js dApp web3 plumbing, app shell, trade dashboard, leaders, vault, account — landed one route/feature per commit.
- `deployment-glue`: Address+ABI sync script connecting SC broadcast artifacts to BE/FE config; documented run order in root README.

### Modified Capabilities
- (none — first implementation)

## Impact

- New top-level directories: `sc/`, `be/`, `fe/`, `docs/blueprint/`.
- New root `.gitignore` covering all three workspaces and OpenSpec scratch.
- Each workspace has its own `package.json` / `foundry.toml`, no monorepo tooling.
- External deps: Foundry toolchain, Node 20+, Pyth Network HTTP feed, Monad testnet RPC.
- `reference/` stays untouched until the final cleanup commit, then is removed.
- No existing code is broken (root currently has no implementation).
- Git history will contain ~20–25 small commits, one per feature, each leaving every workspace buildable.
