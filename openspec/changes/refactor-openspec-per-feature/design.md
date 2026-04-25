## Context

Currently, the implementation steps for `monad-copytrade` are siloed by workspace (SC, BE, FE). While this might be simpler initially, it means we don't test the actual e2e integration until the very end. The user has requested to reorganize the implementation process to be feature-based: for a single feature, we implement the Smart Contract, then the Backend, then the Frontend in a single step (or set of closely grouped steps), ensuring end-to-end functionality for each feature.

## Goals / Non-Goals

**Goals:**
- Break down the implementation of features into vertical slices (SC + BE + FE).
- Ensure each feature commit leaves the repo in a testable, independently verifiable state across all workspaces.

**Non-Goals:**
- We are not changing the core architecture, libraries, or design patterns used in the actual code workspaces.
- We are not migrating files into monorepo-style feature folders; the workspace structure (`/sc`, `/be`, `/fe`) remains intact.

## Decisions

1.  **Feature Vertical Slices:** We will group tasks by core features:
    *   **Baseline/Glue**: Repo skeleton, basic env, mock USDC.
    *   **Vault**: Smart contract Vault deposits/withdraws, BE Indexer for Vault, FE Vault Dashboard.
    *   **Trading Engine**: SC open/close positions, Pyth integration, BE Pyth Keeper, FE Trade Dashboard.
    *   **CopyTrade**: SC CopyTradeRegistry, BE Leaders API, FE Leaders and Account views.
    *   **End-to-End**: Final deployment scripts, address sync, and demo verification.

2.  **Commit Scoping:** Each feature slice will correspond to a single, verifiable commit across the monorepo workspaces. For example, `feat(vault): implement Vault core across SC, BE, and FE`.

## Risks / Trade-offs

- **Risk:** Context switching for developers between Solidity, TypeScript Backend, and React Frontend in the same commit.
  - *Mitigation:* The tasks will be clearly broken down step-by-step so the transition is smooth.
