# Null Loss — No-Loss Copy-Trade Perp DEX on Monad

> A perpetual DEX where every "loss" you take is converted into a yield-bearing
> LP position instead of disappearing into the market.

Null Loss is a non-custodial copy-trading and perpetuals protocol built on
**Monad**. Followers mirror the on-chain trades of vetted leaders in real time;
when a copy-trade hits its Stop Loss, the lost margin is **permanently locked
into the protocol Vault** and the user receives `vUSD` ERC-20 receipts that
earn perpetual yield from DEX trading fees.

The result: trading losses stop being a sunk cost. They become productive
liquidity that pays the loser back over time.

---

## ✨ Why Null Loss

| Traditional perp DEX                          | Null Loss                                                       |
| --------------------------------------------- | --------------------------------------------------------------- |
| SL hits → margin gone forever                 | SL hits → margin → Vault → user gets `vUSD` yield receipt       |
| Followers must trust off-chain copy bots      | Copy logic + execution fully on-chain, keeper-triggered         |
| LPs and traders are different people          | Every trader is automatically also an LP after their first loss |
| Idle deposits earn nothing                    | Vault deposits earn fees from all protocol flow                 |

**Built on Monad** because sub-second finality and high throughput make
trade-for-trade mirror execution actually viable on-chain — slippage and
latency are low enough that a follower's fill is meaningfully close to the
leader's fill.

---

## 🏗️ Architecture

```
                    ┌────────────────────────────────────────┐
                    │              Monad Testnet             │
                    │                                        │
   ┌────────┐  tx   │   TradingEngine  ◄── Vault (counter-   │
   │   FE   │──────►│        │                party + LP)   │
   │ Next.js│       │        │             ▲                │
   └────▲───┘       │        ▼             │ vUSD mint      │
        │           │   CopyTradeRegistry  │                │
        │ REST      │        ▲             │                │
   ┌────┴───┐       │        │             │                │
   │   BE   │ events│        │  SL trigger │                │
   │indexer │◄──────┼────────┘             │                │
   │ keeper │───────┼──────────────────────┘                │
   └────▲───┘       └────────────────────────────────────────┘
        │
        │ price feeds
   ┌────┴──────┐
   │ Pyth Hermes│
   └───────────┘
```

### Workspaces

| Path  | Stack                                | Purpose                                                                                                    |
| ----- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `sc/` | Solidity 0.8.27 · Foundry            | `Vault`, `TradingEngine`, `CopyTradeRegistry`, `vUSD`, `MockUSDC`; deploy & seed scripts; tests             |
| `be/` | Node 20+ · Express · viem · TS       | Event indexer, Pyth keeper for SL execution, REST API for the FE (in-memory store, clean architecture)     |
| `fe/` | Next.js 16 · wagmi · viem · Tailwind | Landing page, `/app` trade dashboard, leaderboard, vault page, account page                                |

Each workspace is independent — install and run per workspace.

---

## 🔑 Core contracts

- **`Vault.sol`** — Holds protocol USDC, mints `vUSD` to losers, distributes fee
  yield pro-rata to `vUSD` holders, handles claims.
- **`TradingEngine.sol`** — Opens/closes perp positions, enforces leverage and
  SL, pulls/pushes margin to/from the Vault, emits the events the indexer and
  keeper consume.
- **`CopyTradeRegistry.sol`** — On-chain mapping of follower → leader with
  per-follow margin, leverage, and SL config. Source of truth for the keeper.
- **`VUSD.sol`** — ERC-20 receipt token for locked losses; yield-bearing.
- **`MockUSDC.sol`** — Test collateral for the Monad testnet demo.

---

## 📍 Deployed contracts (Monad testnet)

| Contract              | Address                                      |
| --------------------- | -------------------------------------------- |
| `MockUSDC`            | `0xF515Fd4fAf79E263d6E38c77A6be7165d3F746Df` |
| `vUSD`                | `0x2f994B6Ffbe5f943cb1F1932b1CF41d81780A091` |
| `Vault`               | `0xE47b99032f7a7Efef1917A7CAA81455A3C552d17` |
| `TradingEngine`       | `0xB9E1a566FF4F60D5d760F2316D092896856116d4` |
| `CopyTradeRegistry`   | `0x8c93ebAB6ef9eAA2a181Cb179f26BF27CC2652E8` |

---

## ⚙️ Backend services (`be/`)

Single Node process exposing three responsibilities, each isolated under
`src/usecase/` with a clean-architecture split (`delivery` / `usecase` /
`repository` / `lib`):

1. **Indexer** — Subscribes to `TradingEngine`, `Vault`, and
   `CopyTradeRegistry` events, hydrates an in-memory store of trades, leaders,
   followers, vault state, and yield history.
2. **Keeper** — Pulls live prices from **Pyth Hermes**, watches open follower
   positions, and submits on-chain SL execution txs when triggers are hit.
3. **REST API** — Read-only endpoints consumed by the FE (leaderboard, active
   trades, vault stats, account history).

No database — state is rebuilt from chain events on boot. This keeps the
hackathon stack trivial to deploy while staying fully verifiable against
on-chain truth.

---

## 🖥️ Frontend (`fe/`)

Next.js 16 (App Router) + wagmi + viem.

- `/` — Landing page (hero video, product pitch, vault explainer)
- `/app` — Trade dashboard: live prices, active follow positions, PnL
- `/app/leaders` — Leaderboard; pick a leader, configure margin / leverage / SL,
  follow in one tx
- `/app/vault` — Deposit/withdraw, view your `vUSD` balance and accrued yield,
  claim
- `/app/account` — History of your trades, follows, locked margin, claims

---

## 🚀 Run order (Monad testnet)

### 1. Deploy contracts

```bash
cd sc
cp .env.example .env          # MONAD_RPC_URL, DEPLOYER_PRIVATE_KEY
forge install
forge build
forge script script/DeployProtocol.s.sol --rpc-url $MONAD_RPC_URL --broadcast
forge script script/SeedDemo.s.sol       --rpc-url $MONAD_RPC_URL --broadcast
```

### 2. Sync deployed addresses to BE/FE

```bash
cd ../be && npm install
npm run sync:addresses
# reads sc/broadcast → writes be/src/config/contracts.ts and fe/src/lib/web3/contracts.ts
```

### 3. Start indexer + keeper + API

```bash
cd be
cp .env.example .env          # MONAD_RPC_URL, KEEPER_PRIVATE_KEY, PYTH_ENDPOINT, START_BLOCK
npm run dev
```

### 4. Start the dApp

```bash
cd ../fe
cp .env.example .env.local    # NEXT_PUBLIC_MONAD_RPC_URL, NEXT_PUBLIC_BACKEND_URL
npm install
npm run dev
# open http://localhost:3000
```

---

## 🎬 End-to-end demo flow

1. Open `/` (landing) → click **Launch App**.
2. `/app` → connect wallet on Monad testnet.
3. Approve `MockUSDC` → deposit into the Vault.
4. `/app/leaders` → pick a leader, set margin / leverage / SL → **Follow**.
5. Leader opens a position → keeper mirrors it for every follower.
6. Price moves against the position → SL triggers → keeper closes it.
7. Lost margin locks into the Vault → user receives `vUSD`.
8. `/app/vault` → watch `vUSD` accrue fee yield → **Claim** to liquid USDC.

---

## 📚 Repository docs

- `docs/blueprint/overview.txt` — product/business overview
- `docs/blueprint/techarc.txt` — tech stack & architecture
- `docs/blueprint/flow.txt` — end-to-end technical flow
- `docs/blueprint/backend-notes.txt` — in-memory data structures, API surface, fee math
- `openspec/` — change proposals, specs, and per-feature task lists driving the build

---

## 🧪 Tech stack at a glance

- **Chain:** Monad testnet
- **Smart contracts:** Solidity 0.8.27, Foundry
- **Oracle:** Pyth (Hermes pull-based price feeds)
- **Backend:** Node 20+, TypeScript, Express, viem, clean-architecture layout
- **Frontend:** Next.js 16, React 19, wagmi v2, viem, Tailwind
- **Tooling:** pnpm/npm per workspace, Foundry, ESLint

---

## 🏆 Hackathon submission

This repository is a fork of
[`monad-developers/monad-blitz-jogja`](https://github.com/monad-developers/monad-blitz-jogja).
Submit via the [Blitz Portal](https://blitz.devnads.com).

---

## 📜 License

MIT — see individual workspaces for any third-party notices.
