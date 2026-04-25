## ADDED Requirements

### Requirement: Repository root contains the canonical project README and gitignore
The repo root SHALL contain a `README.md` describing the product, the three workspaces, and the canonical run order. The root SHALL contain a `.gitignore` covering all three workspaces' build outputs and env files.

#### Scenario: Fresh clone shows project README
- **WHEN** a contributor clones the repo and opens `README.md`
- **THEN** the file describes nolosstrade, lists `sc/`, `be/`, `fe/`, and gives a copy-pasteable run order: deploy → sync → backend → frontend

#### Scenario: Build outputs are ignored
- **WHEN** a contributor runs `forge build` in `sc/`, `npm run build` in `be/`, and `npm run build` in `fe/`
- **THEN** `git status` shows no untracked or modified files inside `sc/out`, `sc/cache`, `sc/broadcast`, `sc/lib`, `be/dist`, `be/node_modules`, `fe/.next`, `fe/node_modules`, or any `.env*` file

### Requirement: Blueprint docs live under `docs/blueprint/`
The repo root SHALL contain `docs/blueprint/` with the four blueprint texts (`overview`, `techarc`, `flow`, `backend-notes`) plus the original blueprint README.

#### Scenario: Blueprint docs accessible from root
- **WHEN** a contributor opens `docs/blueprint/`
- **THEN** they find `overview.txt`, `techarc.txt`, `flow.txt`, `backend-notes.txt`, and a `README.md`

### Requirement: Reference directory remains untouched until final cleanup
While features are being built, `reference/` SHALL remain unchanged from its initial committed state and NOTHING in `sc/`, `be/`, or `fe/` SHALL import from `reference/`.

#### Scenario: No cross-imports from reference
- **WHEN** a contributor runs a recursive grep for `reference/` inside `sc/`, `be/`, `fe/` source paths
- **THEN** no matches are returned

#### Scenario: Reference is removed in the final commit only
- **WHEN** the final cleanup commit is made
- **THEN** `reference/` is deleted, and no prior commit deletes it
