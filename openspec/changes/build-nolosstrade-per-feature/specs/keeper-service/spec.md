## ADDED Requirements

### Requirement: Backend exposes a versioned REST API consumed by the frontend
The Express service SHALL expose endpoints under `/api/v1` returning JSON, with permissive CORS for the frontend origin.

#### Scenario: Leaders list
- **WHEN** the FE calls `GET /api/v1/leaders`
- **THEN** the service responds 200 with an array of `{ address, username, winRate, totalPnl, followers }` sorted by PnL desc

#### Scenario: User vault snapshot
- **WHEN** FE calls `GET /api/v1/user/:address/vault`
- **THEN** the service responds with `{ vUSDBalance, claimableYield, totalDeposit, totalClaimedYield }`

#### Scenario: Global stats
- **WHEN** FE calls `GET /api/v1/stats`
- **THEN** the service responds with `{ tvl, accumulatedYield, totalVUSDSupply, volume24h, openPositions }`

### Requirement: Indexer ingests on-chain events into the in-memory store
A viem-based listener SHALL subscribe to `DepositReceived`, `WithdrawIdle`, `PositionOpened`, `PositionClosed`, `LossVaulted`, `FollowerAdded`, `FollowerRemoved`, and `YieldClaimed`, and update the in-memory repository accordingly.

#### Scenario: PositionOpened updates active positions and leader stats
- **WHEN** the engine emits `PositionOpened(leader, follower, positionId, ...)` and the indexer receives it
- **THEN** the position is added to `activeTrades`, the leader's `openPositionsCount` increments, and downstream API queries reflect the change within one event-loop tick

#### Scenario: Indexer reconnects after RPC drop
- **WHEN** the websocket subscription errors out
- **THEN** the indexer logs the error, waits backoff, and re-subscribes from the last processed block

### Requirement: Keeper monitors Pyth price feed and triggers Stop-Loss execution
A `setInterval` loop (default 2s) SHALL fetch the latest Pyth price for each tracked market, iterate active positions, and submit `executeSL(positionId, priceUpdate)` for any position whose SL trigger has been reached, using the keeper EOA.

#### Scenario: SL trigger fires within one tick
- **GIVEN** a long position with SL price $2900 and current Pyth price $2895
- **WHEN** the keeper tick runs
- **THEN** the keeper submits `executeSL` with the Pyth update payload and removes the position from local active set after confirmation

#### Scenario: Stale price aborts the tick
- **WHEN** the latest Pyth price has `publishTime` older than 30s
- **THEN** the keeper logs `StalePriceSkip` and submits no transactions in this tick

#### Scenario: Tx failure does not halt monitoring
- **WHEN** an `executeSL` transaction reverts (e.g., out-of-gas, slippage)
- **THEN** the error is caught, logged with the positionId, and the loop continues processing other positions

### Requirement: In-memory repository provides a single source of truth for the API
The repository module SHALL expose typed getters/setters over `users`, `leaders`, `subscriptions`, `activeTrades`, and `priceCache`, with no direct global access from delivery or usecase layers.

#### Scenario: Snapshot endpoint reads only via repository
- **WHEN** `GET /api/v1/stats` is served
- **THEN** the handler calls repository functions only, never accesses module-level Maps directly

### Requirement: Keeper boot loads configuration from environment
The service SHALL load `MONAD_RPC_URL`, `KEEPER_PRIVATE_KEY`, `PYTH_ENDPOINT`, and contract addresses from `.env`, fail fast on missing required values, and never log secrets.

#### Scenario: Missing private key aborts startup
- **WHEN** the service starts without `KEEPER_PRIVATE_KEY`
- **THEN** the process exits non-zero with a clear error message before any RPC connection is attempted

### Requirement: Optional sync endpoint rebuilds in-memory state from chain logs
`POST /api/v1/sync` SHALL re-scan contract events from a configured `START_BLOCK` and rebuild the in-memory store, useful after a backend restart during demo.

#### Scenario: Sync after restart
- **WHEN** the backend restarts and an operator calls `POST /api/v1/sync`
- **THEN** within a bounded time the indexer state matches on-chain state, and `GET /api/v1/stats` reflects the correct TVL
