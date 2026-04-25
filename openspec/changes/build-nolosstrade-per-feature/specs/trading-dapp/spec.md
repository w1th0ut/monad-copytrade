## ADDED Requirements

### Requirement: Landing page introduces the protocol and routes to the app
The root route `/` SHALL render a marketing landing describing the No-Loss copy-trade thesis, the Loss-to-LP mechanism, and a primary CTA linking to `/app`.

#### Scenario: Landing CTA navigates to app
- **WHEN** a user clicks the "Launch App" CTA on `/`
- **THEN** the browser navigates to `/app`

### Requirement: App shell exposes wallet connect and core navigation
`/app/*` routes SHALL render inside a shared shell with wallet connect button (wagmi), network indicator (Monad testnet expected), and navigation links to Trade, Leaders, Vault, and Account.

#### Scenario: Wrong network prompts switch
- **WHEN** the connected wallet is not on Monad testnet
- **THEN** the shell shows a "Switch network" prompt and disables write actions

#### Scenario: Disconnected state hides write actions
- **WHEN** no wallet is connected
- **THEN** all transaction-triggering buttons are disabled and show a "Connect wallet" tooltip

### Requirement: Trade dashboard provides chart, ticket, and account panel
`/app` SHALL render a TradingView chart for the selected market, a market-only trade ticket (margin, leverage, SL, long/short), and an account panel showing idle balance, vUSD balance, and open positions.

#### Scenario: Open a manual position
- **GIVEN** alice has idle balance >= margin and is on the correct network
- **WHEN** alice submits the trade ticket with margin 1, leverage 10x, long, SL 50%
- **THEN** the FE calls `TradingEngine.openPosition` via wagmi, shows pending → confirmed states, and the new position appears in the account panel

#### Scenario: Insufficient idle balance disables submit
- **WHEN** the entered margin exceeds idle balance
- **THEN** the submit button is disabled with an "Insufficient balance" hint

### Requirement: Leaders page lists copy-tradeable leaders with one-click follow
`/app/leaders` SHALL fetch `/api/v1/leaders` and render a table with username, win rate, total PnL, follower count, and a "Copy" button per row that opens a TradeModal.

#### Scenario: Copy modal submits followLeader
- **WHEN** alice clicks Copy on bob's row, configures margin/leverage/SL, and confirms
- **THEN** the FE submits `CopyTradeRegistry.followLeader` and on confirmation closes the modal and shows a success toast

### Requirement: Vault dashboard shows yield position and supports claiming
`/app/vault` SHALL show TVL, total vUSD supply, the user's vUSD balance, claimable yield estimate, and a Claim button. Claim SHALL call `Vault.claimYield()`.

#### Scenario: Claim yield
- **GIVEN** alice holds 250 vUSD and the contract reports `claimableYield = 25 USDC`
- **WHEN** alice clicks Claim and confirms the transaction
- **THEN** alice's idle balance increases by 25 USDC, the claim amount resets to 0, and a toast confirms success

#### Scenario: Zero balance hides claim
- **WHEN** the connected user holds 0 vUSD
- **THEN** the Claim button is disabled and a "Trade to earn vUSD" hint is shown

### Requirement: Account page handles deposit/withdraw and shows position history
`/app/account` SHALL provide forms to approve USDC, deposit into Vault, withdraw idle balance, and a list of past positions sourced from indexer events via the BE API.

#### Scenario: First-time deposit flow
- **WHEN** alice deposits with insufficient USDC allowance
- **THEN** the FE first prompts an `approve` transaction, then on success enables the deposit transaction

### Requirement: Contract calls go through a typed wrapper hook
A `useMonadContract` hook SHALL centralize viem/wagmi calls for deposit, withdraw, openPosition, closePosition, followLeader, unfollowLeader, claimYield, and reading view methods, returning typed write/read helpers.

#### Scenario: Hook handles tx lifecycle
- **WHEN** a component calls `useMonadContract().deposit(amount)`
- **THEN** the hook returns `{ status, hash, error }` reflecting submission, confirmation, and failure states

### Requirement: Web3 configuration targets Monad testnet
`wagmi-config.ts` SHALL register Monad testnet as the only supported chain, with the RPC URL, chain id, and explorer URL pulled from environment.

#### Scenario: Production build reads env
- **WHEN** the FE is built with `NEXT_PUBLIC_MONAD_RPC_URL` unset
- **THEN** the build fails or falls back to a documented public RPC, and the failure mode is logged
