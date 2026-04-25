## ADDED Requirements

### Requirement: `sc/` is initialized as a clean Foundry project
`sc/` SHALL contain `foundry.toml`, `lib/forge-std`, `lib/openzeppelin-contracts`, and a buildable empty `src/` (no app contracts yet) at the baseline commit. Solc version SHALL be pinned to 0.8.27 with optimizer enabled.

#### Scenario: Baseline forge build passes
- **WHEN** a contributor runs `cd sc && forge build` immediately after the baseline commit
- **THEN** the build completes successfully with no compilation errors

#### Scenario: Remappings are configured for OZ and forge-std
- **WHEN** a developer references `@openzeppelin/contracts/token/ERC20/ERC20.sol` or `forge-std/Test.sol`
- **THEN** `forge build` resolves the imports via remappings declared in `foundry.toml`

### Requirement: `be/` is initialized as a clean Express + TypeScript project
`be/` SHALL contain `package.json`, `tsconfig.json`, and a minimal `src/server.ts` that boots an Express app on a port from env, returns `{status:"ok"}` on `GET /health`, and exits cleanly on `SIGTERM`. No domain code yet.

#### Scenario: Baseline server starts
- **WHEN** a contributor runs `npm install && npm run dev` in `be/` immediately after the baseline commit
- **THEN** the server listens, `GET /health` returns 200 with `{"status":"ok"}`, and `SIGTERM` shuts it down without errors

#### Scenario: TypeScript compiles
- **WHEN** a contributor runs `npm run build` in `be/`
- **THEN** `dist/server.js` is produced with no type errors

### Requirement: `fe/` is initialized as a clean Next.js project
`fe/` SHALL be initialized via `create-next-app` with TypeScript, App Router, Tailwind v4, ESLint flat config, no `src/` flag deviating from the layout used in `reference/fe`. Versions pinned to those in `reference/fe/package.json`. No app pages beyond the default landing.

#### Scenario: Baseline next build passes
- **WHEN** a contributor runs `npm install && npm run build` in `fe/` immediately after the baseline commit
- **THEN** the production build completes with no errors

#### Scenario: Default landing renders
- **WHEN** a contributor runs `npm run dev` in `fe/` and opens `/`
- **THEN** the default Next.js landing page renders without runtime errors

### Requirement: Each workspace has its own `.env.example`
Each of `sc/`, `be/`, `fe/` SHALL have a `.env.example` enumerating required variables, included in the baseline commit (values can be empty placeholders).

#### Scenario: Operator copies env from examples
- **WHEN** an operator runs `cp .env.example .env` in each workspace
- **THEN** the file contains all variables the workspace will need (RPC URL, keys, contract addresses), with comments describing each
