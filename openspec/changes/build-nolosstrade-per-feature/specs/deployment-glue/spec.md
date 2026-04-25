## ADDED Requirements

### Requirement: Address+ABI sync script wires SC artifacts to BE and FE configs
A script SHALL read the latest Foundry broadcast JSON for `DeployProtocol.s.sol` and write deployed addresses (and ABIs where useful) to `be/src/config/contracts.ts` and `fe/src/lib/web3/contracts.ts`. The script SHALL be runnable as `npm run sync:addresses` from `be/` (or equivalent root command).

#### Scenario: Sync after deploy
- **WHEN** an operator runs the sync command after `forge script DeployProtocol --broadcast`
- **THEN** both target files are rewritten with the freshly deployed addresses, and a subsequent `npm run build` in `be/` and `fe/` succeeds

#### Scenario: Idempotent re-run
- **WHEN** the sync script is run twice in a row without a new deploy
- **THEN** the second run produces no diff in the target files

#### Scenario: Missing broadcast aborts
- **WHEN** the broadcast file does not exist
- **THEN** the script exits non-zero with a clear "deploy first" message and does not modify target files

### Requirement: Root README documents canonical run order
The root `README.md` SHALL document, with copy-pasteable commands: deploy contracts → sync addresses → start backend → start frontend, plus how to seed the demo state and how to run a manual end-to-end check.

#### Scenario: New contributor runs from README
- **WHEN** a contributor follows the README from a fresh clone with valid Monad testnet credentials
- **THEN** they reach a working `/app` route connected to the deployed protocol within the documented steps

### Requirement: Each workspace remains independently buildable after every commit
At every commit on `main`, each of `sc/`, `be/`, `fe/` SHALL build cleanly using only that workspace's tooling, against the committed snapshot of contract addresses (placeholders allowed before first deploy).

#### Scenario: Mid-build commit still passes builds
- **WHEN** a contributor checks out any commit between the baseline and the final cleanup
- **THEN** `forge build`, `npm run build` in `be/`, and `npm run build` in `fe/` each complete without errors
