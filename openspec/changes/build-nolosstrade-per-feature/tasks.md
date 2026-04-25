## Conventions

Each numbered group below is **one commit**. Every commit MUST leave every workspace independently buildable (`forge build`, `npm run build` in `be/`, `npm run build` in `fe/`). Pull individual files from `reference/` as needed; never import from `reference/` in the workspaces.

Commit message format: `feat(<scope>): <short summary>` where scope ∈ {`repo`, `sc`, `be`, `fe`, `glue`}.

## 1. Repo Skeleton & Baselines (commit 1)

- [x] 1.1 Add root `.gitignore` covering all workspaces, `.DS_Store`, `*.log`
- [x] 1.2 Rewrite root `README.md` and copy `reference/` docs into `docs/blueprint/`
- [x] 1.3 Init `sc/` via `forge init`; pin `solc_version` in `foundry.toml`; install `openzeppelin-contracts`
- [x] 1.4 Init `be/` with `package.json`, `tsconfig.json`, minimal `src/server.ts`, and `.env.example`
- [x] 1.5 Init `fe/` with baseline layout/page/globals.css, `package.json`, and `.env.example`
- [x] 1.6 Copy `reference/sc/src/MockUSDC.sol` and test; ensure `forge build && forge test`
- [x] 1.7 Commit: `feat(repo): initialize workspaces with baseline scaffolds and MockUSDC`

## 2. FE Web3 Plumbing & App Shell (commit 2)

- [x] 2.1 Copy `reference/fe/src/lib/web3/` (monad-testnet, wagmi-config, contracts with placeholders)
- [x] 2.2 Copy `reference/fe/src/components/providers/` and mount wagmi + QueryClient in layout
- [x] 2.3 Copy hooks (`use-monad-contract`, `use-protocol-readiness`)
- [x] 2.4 Copy landing page and app shell components; stub `/app` route
- [x] 2.5 Verify `cd fe && npm run build` and UI works locally
- [x] 2.6 Commit: `feat(fe): add wagmi plumbing, landing page, and app shell`

## 3. Vault Feature Slice (commit 3)

- [x] 3.1 SC: Copy `VUSD.sol`, `Vault.sol` (with stubs for TradingEngine/lossToLP if needed), and add tests
- [x] 3.2 SC: Implement `lockLossToLP`, `accumulateYield`, `claimYield` in `Vault.sol` and add tests
- [x] 3.3 BE: Add env config (`MONAD_RPC_URL`, etc.) and in-memory repository
- [x] 3.4 BE: Add viem event indexer subscribing to Vault events + sync endpoint
- [x] 3.5 FE: Add vault dashboard `/app/vault` and `vault-overview` components
- [x] 3.6 Verify all workspaces build (`forge build`, `npm run build` for BE/FE)
- [x] 3.7 Commit: `feat(vault): add Vault SC, BE indexer, and FE dashboard`

## 4. Trading Engine Feature Slice (commit 4)

- [x] 4.1 SC: Copy `TradingEngine.sol`, implement open/close, SL (Pyth check), fee splits, and tests
- [x] 4.2 BE: Add Pyth keeper (`usecase/keeper.ts`) for Stop-Loss execution
- [x] 4.3 FE: Add trade dashboard `/app` with chart, ticket, and account panel
- [x] 4.4 Verify all workspaces build
- [x] 4.5 Commit: `feat(trading): add TradingEngine SC, BE Pyth keeper, and FE dashboard`

## 5. CopyTrade Feature Slice (commit 5)

- [x] 5.1 SC: Copy `CopyTradeRegistry.sol`, implement follow/unfollow, mirror trade, and tests
- [x] 5.2 BE: Add REST API endpoints (`/api/v1/leaders`, `/api/v1/user/:address/vault`, `/api/v1/stats`)
- [x] 5.3 FE: Add leaders page `/app/leaders` with leaderboard and copy-trade modal
- [x] 5.4 FE: Add account page `/app/account` with deposit/withdraw and history
- [x] 5.5 Verify all workspaces build
- [x] 5.6 Commit: `feat(copytrade): add CopyTradeRegistry SC, BE Leaders API, and FE views`

## 6. End-to-End Glue & Demo (commit 6)

- [ ] 6.1 SC: Copy Deploy + Seed scripts (`DeployProtocol.s.sol`, `SeedDemo.s.sol`)
- [ ] 6.2 Glue: Add address sync script `be/scripts/sync-addresses.ts` and document run order
- [ ] 6.3 Demo: Deploy + seed on Monad testnet, run `sync:addresses`, and walk full demo manually
- [ ] 6.4 Verify all workspaces build
- [ ] 6.5 Commit: `feat(glue): add deploy scripts and address sync`

## 7. Cleanup (commit 7)

- [ ] 7.1 Verify no source references `reference/` and `rm -rf reference/`
- [ ] 7.2 Update docs to remove reference pointers
- [ ] 7.3 Commit: `chore: remove reference/ source-of-truth after parity verified`
