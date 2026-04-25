# nolosstrade — No-Loss Copy Trade Perp DEX on Monad

A perpetual DEX where the protocol Vault is the counterparty. When a follower's
copy-trade hits Stop Loss, the lost margin is locked permanently into the Vault
and the user receives `vUSD` ERC-20 receipt tokens that earn perpetual yield
from DEX fees. Trading losses become yield-bearing LP positions instead of
disappearing into the market.

> Built for the Monad Blitz Jogja hackathon. See `docs/blueprint/` for the
> full product, technical, backend, and flow blueprints, and `openspec/` for
> the change proposals driving the build.

## Workspaces

| Path  | Stack                          | Purpose                                            |
| ----- | ------------------------------ | -------------------------------------------------- |
| `sc/` | Solidity 0.8.27 · Foundry      | `Vault`, `TradingEngine`, `CopyTradeRegistry`, `vUSD`, `MockUSDC`, deploy/seed scripts, tests |
| `be/` | Node 20+ · Express · viem · TS | Event indexer, Pyth keeper for SL execution, REST API for the FE (in-memory store) |
| `fe/` | Next.js 16 · wagmi · viem · TS | Landing page, `/app` trade dashboard, leaderboard, vault, account |

Each workspace is independent. There is no root package manager — install per
workspace.

## Run order (Monad testnet)

1. **Deploy contracts**
   ```bash
   cd sc
   cp .env.example .env       # MONAD_RPC_URL, DEPLOYER_PRIVATE_KEY
   forge install
   forge build
   forge script script/DeployProtocol.s.sol --rpc-url $MONAD_RPC_URL --broadcast
   forge script script/SeedDemo.s.sol      --rpc-url $MONAD_RPC_URL --broadcast
   ```

2. **Sync addresses to BE/FE**
   ```bash
   cd ../be && npm install
   npm run sync:addresses     # reads sc/broadcast → writes be/src/config/contracts.ts and fe/src/lib/web3/contracts.ts
   ```

3. **Start the keeper / indexer / API**
   ```bash
   cd be
   cp .env.example .env       # MONAD_RPC_URL, KEEPER_PRIVATE_KEY, PYTH_ENDPOINT, START_BLOCK
   npm run dev
   ```

4. **Start the dApp**
   ```bash
   cd ../fe
   cp .env.example .env.local # NEXT_PUBLIC_MONAD_RPC_URL, NEXT_PUBLIC_BACKEND_URL
   npm install
   npm run dev
   # open http://localhost:3000
   ```

## End-to-end demo flow

`/` (landing) → `/app` (connect wallet) → approve USDC → deposit to Vault →
`/app/leaders` (pick a leader, set margin/leverage/SL, follow) → leader trade
mirrors → SL hits → loss locks into Vault, user receives `vUSD` →
`/app/vault` → claim yield in liquid USDC.

## Repository docs

- `docs/blueprint/overview.txt` — product/business overview
- `docs/blueprint/techarc.txt` — tech stack & architecture
- `docs/blueprint/flow.txt` — end-to-end technical flow
- `docs/blueprint/backend-notes.txt` — in-memory data structures, API, fees
- `openspec/` — change proposals, specs, and per-feature task lists

## Hackathon submission

This repository is a fork of [`monad-developers/monad-blitz-jogja`](https://github.com/monad-developers/monad-blitz-jogja). To submit:

1. Fork the upstream repo and rename it to your project.
2. Push your changes to the fork.
3. Submit through the [Blitz Portal](https://blitz.devnads.com).
