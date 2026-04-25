## 1. Refactor tasks.md

- [x] 1.1 Replace `openspec/changes/build-nolosstrade-per-feature/tasks.md` with a new feature-sliced task list. The new groups should interleave SC, BE, and FE tasks for: Baseline/Glue, Vault, Trading Engine, CopyTrade, and End-to-End.
- [x] 1.2 Verify that each group in the new `tasks.md` represents a single commit encompassing `sc`, `be`, and `fe` workspaces.
- [x] 1.3 Verify that the new `tasks.md` still adheres to the `build-nolosstrade-per-feature` specs (which require independent buildability per commit and proper mock integrations).

## 2. Validation

- [x] 2.1 Verify that the file `openspec/changes/build-nolosstrade-per-feature/tasks.md` has been updated and contains the correct `- [ ]` syntax.
- [x] 2.2 Stage and commit the `openspec` modifications with message: `chore(openspec): refactor tasks to be feature-sliced`
