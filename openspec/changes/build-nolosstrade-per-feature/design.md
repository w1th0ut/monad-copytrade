## Context

`reference/` already holds a working blueprint (`reference/sc`, `reference/be`, `reference/fe` plus four design notes). The product is a No-Loss Copy Trade Perp DEX on Monad: vault is the counterparty; follower SL losses convert to permanent vault liquidity and mint `vUSD` ERC-20 receipt tokens that earn perpetual yield from trading fees.

The previous proposal (`port-reference-to-root`) treated this as a single bulk move. We are reframing the work as a per-feature build with one commit per feature, using `reference/` as a read-only source-of-truth from which to copy individual files. The repo root has no implementation yet, so we have a clean slate.

## Goals / Non-Goals

**Goals:**
- Every commit on `main` leaves every workspace independently buildable (`forge build`, `npm run build` in `be/`, `npm run build` in `fe/`).
- Each commit ships exactly one feature (one contract, one backend layer, one FE route, etc.).
- Repo history reads as a vertical-slice build, not a code dump.
- `reference/` is a citation, not a dependency. Nothing in `sc/`, `be/`, `fe/` imports from it.

**Non-Goals:**
- Production hardening (no persistent DB, no auth, no monitoring).
- Account abstraction / session keys.
- Secondary market for vUSD.
- Real USDC integration — `MockUSDC` is sufficient.
- Persisting backend state across restarts (in-memory by design).
- Running CI for build verification — manual `forge build` / `npm run build` per commit is enough for the hackathon.

## Decisions

### D1. Pristine baseline scaffolds, not move
Run framework init commands fresh in each workspace, then layer features. We do not `mv reference/sc sc`. The first commit lands these baselines so subsequent commits each have a small, focused diff.

**Alternative considered:** Bulk move + small follow-up commits. Rejected — git diff would attribute all code to commit #1, defeating per-feature review.

### D2. `reference/` is read-only source-of-truth, deleted at the end
We keep `reference/` intact during the build so each feature commit can copy/adapt from it. The final commit removes `reference/` once parity is verified end-to-end.

### D3. Commit boundary = one capability slice
A commit is one of:
- one Solidity contract + its compile-clean state (tests may come in a follow-up commit per contract)
- one backend layer (config, repository, API, indexer, keeper) — each its own commit
- one frontend route or component group (web3 plumbing, shell, trade dashboard, leaders, vault, account)
- one piece of glue (sync script, README run-order)

Build must pass after every commit. Tests can be a separate commit per contract once contract code lands.

### D4. Dependency order constrains commit order
Smart-contract commits must follow `MockUSDC → vUSD → Vault → TradingEngine → CopyTradeRegistry`, because each later contract imports/wires the earlier ones. Backend commits follow `config → repository → API stubs → indexer → keeper`. Frontend commits follow `web3 → shell → dashboard → leaders → vault → account`. Workspaces are otherwise independent — SC and FE work can interleave as long as each workspace's order is respected.

### D5. Sync script is the only SC↔BE↔FE coupling
Contract addresses and ABIs flow from `sc/broadcast/...` → `be/src/config/contracts.ts` and `fe/src/lib/web3/contracts.ts` via a Node script (`scripts/sync-addresses.ts` at repo root or under `be/scripts/`). This avoids cross-workspace imports and keeps each workspace independently buildable using a committed snapshot of addresses (placeholders before first deploy).

### D6. Adapt-on-copy when copying from `reference/`
Reference code may reference paths or modules we haven't created yet. When copying a file, also stub or adjust imports so the workspace builds at that commit. If a stub is needed (e.g., a placeholder type that the next commit fills in), call it out in the commit message body.

### D7. Pyth + keeper + non-burning vUSD as in the prior design
These product/architecture decisions carry over unchanged from the previous proposal:
- Vault is counterparty; loss → vUSD 1:1 mint; vUSD is non-burning.
- Yield distribution is pull-based, proportional, paid in liquid USDC into `idleBalance`.
- Trading fee 0.1% on close; default split 70 (yield) / 20 (leader) / 10 (treasury), owner-configurable.
- Keeper polls Pyth (`priceAge ≤ 30s`) and submits `executeSL` from a hot-keeper EOA.

### D8. Skill/agent configs reviewed in commit #1, not regenerated
The repo already has `.claude/`, `.codex/`, `.gemini/`, `.agent/` directories. Commit #1 only adds the root `README.md`, root `.gitignore`, and `docs/blueprint/` (copied from `reference/`'s text files). It does not regenerate or modify the existing agent dirs.

## Risks / Trade-offs

- **Build-after-every-commit discipline is manual.** No CI is set up; an inattentive commit can land broken. Mitigation: each task in `tasks.md` ends with an explicit "verify build" sub-step, and the contributor must run it before the commit.
- **Per-commit copying is slower than bulk move.** Acceptable trade-off for clean history.
- **Reference may drift if edited mid-build.** Mitigation: treat `reference/` as frozen until the final cleanup commit. No edits.
- **Framework init defaults may not match `reference/` choices** (e.g., Tailwind v4 vs v3, ESLint flat config). Mitigation: the baseline-init commit pins versions to match `reference/fe/package.json`; subsequent commits don't have to fight defaults.
- **Address sync placeholders before first deploy** mean the FE/BE will compile with zero-addresses until commit-after-deploy. Acceptable; document clearly.
- **Test commits are separate from contract commits**, so a contract may exist for one or two commits without tests. Acceptable for hackathon velocity; tests still land before E2E verification.

## Migration Plan

1. Land all openspec artifacts (this proposal, design, specs, tasks). No `main` code changes yet.
2. Implement tasks in `tasks.md` order. Each numbered group below = one commit.
3. After commit `Glue: address sync + run-order docs`, deploy + seed on Monad testnet, verify the demo flow.
4. Final commit: delete `reference/` (verified no longer needed).

Rollback: each commit is independently revertable. No squash.

## Open Questions

- Markets supported at launch — default ETH/USD only for MVP. (carry-over)
- Keeper containerization — default local `tsx` for hackathon. (carry-over)
- Where to host BE for the demo — default local + tunnel. (carry-over)
- Should we add a `Makefile` at the repo root for `make deploy`, `make sync`, `make dev`? Default: yes, in the glue commit, if it stays under ~30 lines.
