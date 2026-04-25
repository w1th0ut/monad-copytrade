## ADDED Requirements

### Requirement: Vault holds protocol liquidity and acts as trade counterparty
The `Vault` contract SHALL hold all USDC liquidity, expose deposit/withdraw of idle balance, and serve as the counterparty for every position opened in `TradingEngine`. Idle balances per user SHALL be tracked in `idleBalance[user]`. Only the configured `TradingEngine` address SHALL be authorized to debit margin and credit PnL.

#### Scenario: User deposits USDC liquidity
- **WHEN** a user calls `depositLiquidity(amount)` after approving USDC
- **THEN** the Vault transfers USDC from the user, increases `idleBalance[user]` by `amount`, and emits `DepositReceived(user, amount)`

#### Scenario: User withdraws idle balance
- **WHEN** a user calls `withdrawIdle(amount)` and `idleBalance[user] >= amount`
- **THEN** the Vault transfers USDC back to the user, decreases `idleBalance[user]`, and emits `WithdrawIdle(user, amount)`

#### Scenario: Unauthorized caller cannot move funds
- **WHEN** any address other than `TradingEngine` calls `lockMargin`, `releaseMargin`, or `lockLossToLP`
- **THEN** the call reverts with an authorization error

### Requirement: Loss-to-LP locks loss permanently and mints vUSD 1:1
When `TradingEngine` settles a losing close (manual or SL), it SHALL invoke `Vault.lockLossToLP(user, lossAmount)`. The Vault SHALL move `lossAmount` USDC into `accumulatedLiquidity` (permanent, non-withdrawable) and mint exactly `lossAmount` vUSD to `user`.

#### Scenario: Loss converts to vUSD receipt
- **WHEN** `TradingEngine` calls `lockLossToLP(alice, 0.5e6)`
- **THEN** Vault increments `accumulatedLiquidity` by `0.5e6`, vUSD `totalSupply` increases by `0.5e6`, alice's vUSD balance increases by `0.5e6`, and `LossVaulted(alice, 0.5e6, 0.5e6)` is emitted

#### Scenario: Locked liquidity is non-withdrawable
- **WHEN** any user attempts to withdraw against `accumulatedLiquidity`
- **THEN** no function path permits the transfer; only `claimYield` distributes from `accumulatedYield`, never from `accumulatedLiquidity`

### Requirement: Yield distribution is proportional, pull-based, and non-burning
The Vault SHALL maintain `accumulatedYield` (USDC) fed by trading fees. `claimYield()` SHALL transfer `(userVUSD / totalVUSDSupply) * accumulatedYield` to the caller's `idleBalance` and decrement `accumulatedYield` accordingly. vUSD is NOT burned, so the user retains rights to future yield.

#### Scenario: Holder claims proportional yield
- **GIVEN** `accumulatedYield = 100 USDC`, `totalVUSDSupply = 1000 vUSD`, `aliceVUSD = 250`
- **WHEN** alice calls `claimYield()`
- **THEN** alice's idle balance increases by `25 USDC`, `accumulatedYield` becomes `75 USDC`, and alice's vUSD balance is unchanged

#### Scenario: Holder with zero vUSD reverts
- **WHEN** a caller with `vUSDBalance = 0` calls `claimYield()`
- **THEN** the call reverts with `NoYieldShare`

### Requirement: TradingEngine opens, closes, and liquidates perpetual positions
The `TradingEngine` SHALL allow opening a position with `(market, margin, leverage, isLong, slPrice)`, locking margin from `Vault.idleBalance[user]`. On close (manual or SL), it SHALL compute PnL against the current oracle price, deduct trading fee, route fee to `Vault.accumulatedYield` (with leader/treasury splits), return remaining margin + profit to `idleBalance`, and call `lockLossToLP` if PnL is negative.

#### Scenario: Profitable manual close
- **GIVEN** alice has an open long ETH position, margin 1, leverage 10x, entry $3000, current $3300 (+10% on notional = +1.0 USDC profit)
- **WHEN** alice calls `closePosition(positionId)`
- **THEN** trading fee is deducted from notional, alice's `idleBalance` increases by `margin + profit - fee`, the fee is split per configured ratios, and `PositionClosed` is emitted

#### Scenario: Losing close triggers Loss-to-LP
- **GIVEN** alice has an open long, entry $3000, current $2850 (-5% on notional, loss 0.5 USDC, remaining margin 0.5 USDC)
- **WHEN** `closePosition` settles
- **THEN** `idleBalance[alice]` increases by remaining margin (0.5), `Vault.lockLossToLP(alice, 0.5)` is called, alice receives 0.5 vUSD

#### Scenario: Stop-Loss execution is keeper-only
- **WHEN** any address other than the configured keeper calls `executeSL(positionId, priceUpdate)`
- **THEN** the call reverts

#### Scenario: Stop-Loss with stale oracle price reverts
- **WHEN** keeper submits `executeSL` with a Pyth price update whose `publishTime` is older than `MAX_PRICE_AGE` (e.g., 30s)
- **THEN** the contract reverts with `StalePrice`

### Requirement: Trading fee splits are 70/20/10 and protocol-configurable
On every closed position, the fee SHALL be split: 70% to `Vault.accumulatedYield`, 20% to the leader (if position originated from a copy trade, otherwise treasury), 10% to treasury. Owner SHALL be able to update these splits via `setFeeSplits(yieldBps, leaderBps, treasuryBps)` where the three values sum to 10000.

#### Scenario: Default split routes fees correctly
- **WHEN** a copy-trade position closes with fee 1.0 USDC
- **THEN** Vault `accumulatedYield` increases by 0.7, leader receives 0.2, treasury receives 0.1

#### Scenario: Owner updates splits
- **WHEN** owner calls `setFeeSplits(8000, 1500, 500)`
- **THEN** subsequent fee distributions use the new ratios; non-owner callers revert

### Requirement: CopyTradeRegistry tracks follow relationships and supports batched mirror execution
`CopyTradeRegistry` SHALL store `(follower, leader) → (margin, leverage, slBps, active)`. `followLeader` SHALL upsert; `unfollowLeader` SHALL set `active=false`. `executeMirrorTrade(leader, followers[], market, isLong, entryPrice)` SHALL be callable only by keeper or TradingEngine, iterate followers, and call `TradingEngine.openPositionFor(follower, ...)` per active follower with sufficient idle balance.

#### Scenario: Follower subscribes
- **WHEN** alice calls `followLeader(bob, margin=1e6, leverage=10, slBps=5000)`
- **THEN** registry stores the config with `active=true` and emits `FollowerAdded(bob, alice, config)`

#### Scenario: Mirror skips followers with insufficient balance
- **GIVEN** carol follows bob with `margin=1e6` but `idleBalance[carol]=0`
- **WHEN** keeper calls `executeMirrorTrade(bob, [alice, carol], ...)`
- **THEN** alice's position is opened, carol is skipped, and a `MirrorSkipped(carol, "insufficient_idle")` event is emitted

### Requirement: vUSD is a standard ERC-20 minted only by Vault
`vUSD` SHALL implement ERC-20 with 6 decimals (matching USDC). Only the configured Vault address SHALL be allowed to call `mint`. Burn is NOT exposed (yield is non-burning per design).

#### Scenario: Non-vault mint reverts
- **WHEN** any address other than Vault calls `vUSD.mint(user, amount)`
- **THEN** the call reverts with `NotVault`

### Requirement: Deploy and seed scripts produce a usable demo state
A Foundry deploy script SHALL deploy MockUSDC, Vault, vUSD, TradingEngine, CopyTradeRegistry in the correct order, wire authorizations, and emit addresses to `broadcast/`. A seed script SHALL mint demo USDC, register at least two demo leaders with seeded performance metrics, and prefund the Vault with initial liquidity.

#### Scenario: Fresh deploy on Monad testnet
- **WHEN** `forge script DeployProtocol --rpc-url $MONAD_RPC --broadcast` is run
- **THEN** all five contracts are deployed, the Vault recognizes TradingEngine as authorized, and `vUSD.vault()` equals the Vault address

#### Scenario: Seed populates demo data
- **WHEN** `forge script SeedDemo --rpc-url $MONAD_RPC --broadcast` is run after deploy
- **THEN** at least two leaders are registered, the deployer wallet holds testnet MockUSDC, and Vault `accumulatedLiquidity` is non-zero
