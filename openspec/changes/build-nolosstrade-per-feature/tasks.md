## Conventions

Each numbered group below is **one commit**. Every commit MUST leave every workspace independently buildable (`forge build`, `npm run build` in `be/`, `npm run build` in `fe/`). Pull individual files from `reference/` as needed; never import from `reference/` in the workspaces.

Commit message format: `feat(<scope>): <short summary>` where scope ∈ {`repo`, `sc`, `be`, `fe`, `glue`}. Example: `feat(sc): add Vault with idle deposit/withdraw`.

## 1. Repo skeleton + workspace baselines (commit 1)

- [x] 1.1 Add root `.gitignore` covering `sc/{lib,out,cache,broadcast,.env*}`, `be/{node_modules,dist,.env*}`, `fe/{node_modules,.next,.vercel,.env*,tsconfig.tsbuildinfo,next-env.d.ts}`, `.DS_Store`, `*.log`
- [x] 1.2 Rewrite root `README.md`: product summary, three workspaces table, run order, links to `docs/blueprint/` and `openspec/`, retain hackathon submission section
- [x] 1.3 Create `docs/blueprint/` and copy `reference/{overview.txt,techarc.txt,flow.txt,be.txt → backend-notes.txt,README.md}` into it
- [x] 1.4 Init `sc/` via `forge init sc --no-git --quiet`; pin `solc_version = "0.8.27"` and OZ remapping in `foundry.toml`; install `lib/openzeppelin-contracts`; verify `cd sc && forge build` passes
- [x] 1.5 Init `be/` with `package.json` (deps copied from `reference/be/package.json`), `tsconfig.json`, minimal `src/server.ts` (Express on `PORT`, `GET /health` → `{status:"ok"}`, SIGTERM shutdown); add `.env.example`; verify `cd be && npm install && npm run build`
- [x] 1.6 Init `fe/` with hand-written `package.json` pinned to `reference/fe/package.json` versions, baseline layout/page/globals.css; add `.env.example`; verify `cd fe && npm install && npm run build`
- [ ] 1.7 Commit: `feat(repo): initialize workspaces with baseline scaffolds`

## 2. SC: MockUSDC (commit 2)

- [ ] 2.1 Copy `reference/sc/src/MockUSDC.sol` to `sc/src/MockUSDC.sol`; ensure compiles
- [ ] 2.2 Add minimal Foundry test `sc/test/MockUSDC.t.sol` for mint + decimals
- [ ] 2.3 Verify `cd sc && forge build && forge test`
- [ ] 2.4 Commit: `feat(sc): add MockUSDC test token`

## 3. SC: vUSD receipt token (commit 3)

- [ ] 3.1 Copy `reference/sc/src/VUSD.sol` to `sc/src/VUSD.sol`; ensure vault-only mint, no burn
- [ ] 3.2 Add `sc/test/VUSD.t.sol`: only-vault mint, transfer works, supply tracks mints
- [ ] 3.3 Verify `forge build && forge test`
- [ ] 3.4 Commit: `feat(sc): add vUSD non-burning receipt token`

## 4. SC: Vault — deposits & idle balance (commit 4)

- [ ] 4.1 Copy `reference/sc/src/interfaces/IVaultReceiptSync.sol` if needed by Vault
- [ ] 4.2 Copy `reference/sc/src/Vault.sol` to `sc/src/Vault.sol`, but stub out `lockMargin/releaseMargin/lockLossToLP/accumulateYield/claimYield` as TODO bodies (revert "not implemented") if those features depend on TradingEngine — OR keep full file if it compiles standalone
- [ ] 4.3 Add `sc/test/Vault.deposits.t.sol`: deposit increases idle, withdraw decreases idle, unauthorized callers revert
- [ ] 4.4 Verify `forge build && forge test`
- [ ] 4.5 Commit: `feat(sc): add Vault deposits and idle accounting`

## 5. SC: Vault — Loss-to-LP + claimYield (commit 5)

- [ ] 5.1 Fill in `lockLossToLP` (mint vUSD 1:1, increment `accumulatedLiquidity`), `accumulateYield`, `claimYield` (proportional, non-burning)
- [ ] 5.2 Wire `setTradingEngine`, authorization modifiers
- [ ] 5.3 Add `sc/test/Vault.lossToLP.t.sol` and `Vault.claimYield.t.sol` covering loss minting, proportional claim, zero-balance revert, non-burn invariant
- [ ] 5.4 Verify `forge build && forge test`
- [ ] 5.5 Commit: `feat(sc): add Vault Loss-to-LP and pull-based yield claim`

## 6. SC: TradingEngine — open & close (commit 6)

- [ ] 6.1 Copy `reference/sc/src/TradingEngine.sol`; in this commit keep `executeSL` as a stub that reverts `NotImplemented`
- [ ] 6.2 Implement `openPosition` / `openPositionFor` (lock margin via Vault), `closePosition` (PnL math, fee, route to Vault), fee splits
- [ ] 6.3 Add `sc/test/TradingEngine.openClose.t.sol`: profitable close, losing close → vUSD, fee math, unauthorized revert
- [ ] 6.4 Verify `forge build && forge test`
- [ ] 6.5 Commit: `feat(sc): add TradingEngine open/close with fee splits`

## 7. SC: TradingEngine — Stop-Loss & Pyth staleness (commit 7)

- [ ] 7.1 Implement `executeSL(positionId, priceUpdate)` — keeper-only, Pyth staleness check (≤30s), close path reuses commit-6 settlement
- [ ] 7.2 Add `sc/test/TradingEngine.executeSL.t.sol`: SL by keeper succeeds, non-keeper reverts, stale price reverts
- [ ] 7.3 Verify `forge build && forge test`
- [ ] 7.4 Commit: `feat(sc): add keeper-only Stop-Loss execution`

## 8. SC: CopyTradeRegistry (commit 8)

- [ ] 8.1 Copy `reference/sc/src/CopyTradeRegistry.sol`
- [ ] 8.2 Implement `followLeader` / `unfollowLeader` / `executeMirrorTrade` (skip-on-insufficient-balance behavior)
- [ ] 8.3 Add `sc/test/CopyTradeRegistry.t.sol`: follow/unfollow, mixed-eligibility batch mirror, unauthorized batch caller revert
- [ ] 8.4 Verify `forge build && forge test`
- [ ] 8.5 Commit: `feat(sc): add CopyTradeRegistry with batched mirror execution`

## 9. SC: Deploy + Seed scripts (commit 9)

- [ ] 9.1 Copy `reference/sc/script/DeployProtocol.s.sol`; ensure ordered deployment + authorization wiring
- [ ] 9.2 Copy `reference/sc/script/SeedDemo.s.sol`; mints demo USDC, registers ≥2 leaders, prefunds Vault
- [ ] 9.3 Verify `forge build` (scripts compile); document run command in `sc/README.md`
- [ ] 9.4 Commit: `feat(sc): add deploy and seed scripts`

## 10. BE: env + repository (commit 10)

- [ ] 10.1 Copy `reference/be/src/config/env.ts`; validate `MONAD_RPC_URL`, `KEEPER_PRIVATE_KEY`, `PYTH_ENDPOINT`, `START_BLOCK` with zod, fail-fast on missing
- [ ] 10.2 Copy `reference/be/src/repository/memory.ts`; typed wrappers over `users/leaders/subscriptions/activeTrades/priceCache`
- [ ] 10.3 Wire `server.ts` to import env (so missing key kills startup)
- [ ] 10.4 Verify `cd be && npm run build`
- [ ] 10.5 Commit: `feat(be): add env config and in-memory repository`

## 11. BE: REST API endpoints (commit 11)

- [ ] 11.1 Copy `reference/be/src/delivery/api.ts`; mount `/api/v1/leaders`, `/api/v1/user/:address/vault`, `/api/v1/stats` reading via repository
- [ ] 11.2 Add CORS for FE origin, JSON error format, request logging middleware
- [ ] 11.3 Verify `npm run build` and `curl localhost:$PORT/api/v1/stats` returns 200 with empty-state JSON
- [ ] 11.4 Commit: `feat(be): add REST API for leaders, user vault, stats`

## 12. BE: viem indexer (commit 12)

- [ ] 12.1 Copy `reference/be/src/usecase/indexer.ts`; subscribe to Vault/TradingEngine/CopyTradeRegistry events
- [ ] 12.2 Wire reconnect-with-backoff and resume-from-last-block
- [ ] 12.3 Add `POST /api/v1/sync` endpoint for full rescan from `START_BLOCK`
- [ ] 12.4 Verify `npm run build`
- [ ] 12.5 Commit: `feat(be): add viem event indexer with sync endpoint`

## 13. BE: Pyth keeper (commit 13)

- [ ] 13.1 Copy `reference/be/src/usecase/keeper.ts`; setInterval loop, Pyth fetch with staleness check (30s)
- [ ] 13.2 Per-position try/catch; log keeper EOA balance each tick
- [ ] 13.3 Verify `npm run build`
- [ ] 13.4 Commit: `feat(be): add Pyth keeper for Stop-Loss execution`

## 14. FE: web3 plumbing + providers (commit 14)

- [ ] 14.1 Copy `reference/fe/src/lib/web3/{monad-testnet.ts,wagmi-config.ts,contracts.ts}` (contracts.ts uses zero-address placeholders until sync)
- [ ] 14.2 Copy `reference/fe/src/components/providers/app-providers.tsx`; mount wagmi + QueryClient in `app/layout.tsx`
- [ ] 14.3 Copy `reference/fe/src/hooks/{use-monad-contract.ts,use-protocol-readiness.ts}`
- [ ] 14.4 Verify `cd fe && npm run build`
- [ ] 14.5 Commit: `feat(fe): add wagmi + viem plumbing for Monad testnet`

## 15. FE: app shell + landing (commit 15)

- [ ] 15.1 Copy `reference/fe/src/app/page.tsx` (landing) and `reference/fe/src/app/layout.tsx`, `globals.css`
- [ ] 15.2 Copy `reference/fe/src/components/shell/app-shell.tsx` and wallet components (`wallet-status-chip`, `wallet-action-button`, `trade-ticket-status`)
- [ ] 15.3 Stub `/app` route (empty page wrapped in shell) so the build passes
- [ ] 15.4 Verify `npm run build` and visit `/` and `/app`
- [ ] 15.5 Commit: `feat(fe): add landing page and app shell`

## 16. FE: trade dashboard `/app` (commit 16)

- [ ] 16.1 Copy `reference/fe/src/app/app/page.tsx` and `reference/fe/src/components/trading/{trade-dashboard,trading-view-chart,account-panel}.tsx`
- [ ] 16.2 Copy any helpers needed (`lib/api.ts`, `lib/mock-data.ts`)
- [ ] 16.3 Verify `npm run build`
- [ ] 16.4 Commit: `feat(fe): add trade dashboard with chart, ticket, account panel`

## 17. FE: leaders `/app/leaders` (commit 17)

- [ ] 17.1 Copy `reference/fe/src/app/app/leaders/page.tsx` and `reference/fe/src/components/trading/{leaders-overview,trade-modal,leader-open-position}.tsx`
- [ ] 17.2 Verify `npm run build`
- [ ] 17.3 Commit: `feat(fe): add leaderboard with copy-trade modal`

## 18. FE: vault `/app/vault` (commit 18)

- [ ] 18.1 Copy `reference/fe/src/app/app/vault/page.tsx` and `reference/fe/src/components/trading/vault-overview.tsx`
- [ ] 18.2 Verify `npm run build`
- [ ] 18.3 Commit: `feat(fe): add vault dashboard with claim yield`

## 19. FE: account `/app/account` (commit 19)

- [ ] 19.1 Copy `reference/fe/src/app/app/account/page.tsx`
- [ ] 19.2 Verify `npm run build`
- [ ] 19.3 Commit: `feat(fe): add account page with deposit/withdraw and history`

## 20. Glue: address sync + run-order docs (commit 20)

- [ ] 20.1 Add `be/scripts/sync-addresses.ts` reading `sc/broadcast/DeployProtocol.s.sol/<chain>/run-latest.json` → writes `be/src/config/contracts.ts` and `fe/src/lib/web3/contracts.ts`; idempotent; aborts on missing broadcast
- [ ] 20.2 Add `be/package.json` script `sync:addresses`
- [ ] 20.3 Update root `README.md` with deploy → sync → BE → FE flow including the sync command
- [ ] 20.4 Verify both `be` and `fe` still build with placeholder addresses
- [ ] 20.5 Commit: `feat(glue): add address sync script and document run order`

## 21. End-to-end demo verification (no commit unless changes)

- [ ] 21.1 Deploy + seed on Monad testnet, run `sync:addresses`
- [ ] 21.2 Walk full demo: connect → approve → deposit → follow → mirror → SL → vUSD mint → claim
- [ ] 21.3 Capture screenshots/video for submission
- [ ] 21.4 If fixes were needed, commit them as small follow-ups (`fix(<scope>): ...`)

## 22. Cleanup: remove `reference/` (commit final)

- [ ] 22.1 Confirm grep: no source under `sc/`, `be/`, `fe/` references `reference/`
- [ ] 22.2 `rm -rf reference/`
- [ ] 22.3 Update root `README.md` and `docs/blueprint/README.md` to remove any lingering reference pointers
- [ ] 22.4 Verify all three workspaces still build
- [ ] 22.5 Commit: `chore: remove reference/ source-of-truth after parity verified`
