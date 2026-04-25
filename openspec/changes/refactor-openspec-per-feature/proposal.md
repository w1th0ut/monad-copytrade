## Why

The current implementation plan is structured by workspace (all Smart Contracts, then all Backend, then all Frontend). This approach delays end-to-end integration until the very end, increasing the risk of misaligned interfaces and making it difficult to test features holistically. Restructuring the implementation plan to be feature-slice driven (SC, BE, and FE for a single feature together) ensures each feature is fully functional and committed before moving to the next.

## What Changes

- Reorganize the implementation steps in `tasks.md` to group Smart Contract, Backend, and Frontend work by feature rather than by workspace.
- Ensure commits are scoped per feature (e.g., "feat(vault): add Vault SC, BE indexer, and FE dashboard").
- Update the openspec specs if necessary to reflect a feature-first architecture approach.

## Capabilities

### New Capabilities
- `feature-sliced-tasks`: A reorganized implementation plan that interleaves SC, BE, and FE tasks for each core feature (Vault, Trading Engine, CopyTrade, etc.).

### Modified Capabilities

## Impact

- Modifies the execution order in the current openspec change.
- Does not change the final application code, only the process and order of implementation.
