# CLAUDE.md – PanelForge Frontend

React 19 + TypeScript · Vite · Tailwind CSS v4 · HTML5 / Konva Canvas editor · dnd-kit · TanStack Query · Vitest · Playwright.

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run quality   # typecheck + lint + tests
npm run i18n:check # ensure 100% VI <-> EN key parity
```

Frontend ↔ Backend coordination follows `.agents/CODEBASE_MAP.md` and Backend DTOs/Swagger. Take field names directly from Backend models (`PanelForge.Application/Features/<Domain>/...`), never guess.

## PanelForge Agent Rules

1. Read existing implementation before writing code.
2. Identify the affected Use Case, Business Rules (BR-xx) and Requirements.
3. Follow Clean Architecture and MediatR CQRS (backend), and respect the API contract they expose.
4. The Handler is the application use-case boundary by default (backend).
5. Do not create a service/interface per feature.
6. Prefer reuse over new abstractions (existing components, hooks, `src/services`, `src/lib`).
7. Do not modify unrelated code.
8. Preserve append-only provenance.
9. Preserve optimistic concurrency (send the version you edited; handle 409 by reloading/merging, never by blindly re-sending).
10. Enforce Workspace authorization server-side. Hiding UI is UX only.
11. AI output requires a human decision (explicit accept/reject UI).
12. Write/update automated tests for business-rule changes (Vitest; manual browser checks via Playwright MCP).
13. Do not introduce dependencies unless existing platform/project dependencies cannot solve the problem.
14. Do not read or expose secrets unnecessarily (`.env*` except `.env.example`, tokens, keys).
15. Do not send source code or local files to unknown external services.
16. Ask before enabling a new network-connected MCP server.
17. **Documentation Sync**: Follow `docs/DOCUMENTATION_PROCESS.md`. Any change to UI tokens/styling, business flows, role workspaces, or shared components must be synchronized into the corresponding docs (`docs/DESIGN_RULES.md`, `PRODUCT.md`, `src/roles/*/README.md`, `src/shared/README.md`). Feature/refactor plans must be tracked in `docs/implement-plan/ongoing/` and moved to `completed/` when done.

## Precedence when instructions conflict

1. PanelForge Business Rules / requirements (`panelforge-business-rules`)
2. Security and data integrity
3. Existing project architecture (what the code already does)
4. PanelForge custom skills (`.claude/skills/panelforge-*`)
5. Upstream engineering skills (`.claude/skills/*` from addyosmani/agent-skills; `.agents/skills/*` from vercel-labs)
6. Ponytail simplification

A lower level never overrides a higher one. Ponytail must never override a mandatory requirement.

## Intent → skill routing

| Intent | Skills |
|---|---|
| Requirement clarification | `interview-me`, `idea-refine`, `spec-driven-development` |
| Planning | `planning-and-task-breakdown` |
| API contract with backend | `api-and-interface-design`, `panelforge-architecture`, `panelforge-cqrs`, `panelforge-business-rules` |
| Versioning / provenance / canvas persistence | `panelforge-event-sourcing`, `panelforge-business-rules` |
| Security | `security-and-hardening`, `panelforge-security` |
| Frontend | `frontend-ui-engineering`, `incremental-implementation` |
| Testing | `test-driven-development`, `browser-testing-with-devtools`, `panelforge-tooling` |
| Debugging | `debugging-and-error-recovery` |
| Performance | `performance-optimization` |
| Review | `code-review-and-quality`, `code-simplification`, Ponytail review (`/ponytail-review`) |
| CI/CD | `git-workflow-and-versioning`, `ci-cd-and-automation` |

## Skills ↔ MCP servers

MCP servers configured for this machine (Claude Code user scope): `playwright` (isolated, headless), `postgres` (read-only, `panelforge_dev`), `github` (read-only + lockdown), `context7` (library docs), `sequential-thinking`, `filesystem` (only `AI_Workspace`). Load `panelforge-tooling` whenever a skill step needs one of them.

- **Browser work defaults to Playwright MCP**, including where `browser-testing-with-devtools` / `test-driven-development` mention Chrome DevTools (tool mapping in `panelforge-tooling`).
- **Performance work uses Chrome DevTools MCP** (from the ECC plugin, `mcp__plugin_ecc_chrome-devtools__*`): performance trace, `lighthouse_audit`, CPU/network throttling, heap snapshots (e.g. canvas editor memory). Only for `performance-optimization` and the performance section of `browser-testing-with-devtools`. Never with `--autoConnect` / `--browser-url`.
- Library/framework API questions (MediatR, EF Core, ASP.NET Core, React, Tailwind, TanStack, dnd-kit) → `context7` before relying on memory.
- Business-rule / schema checks (BR-01, 03, 05, 08, 11, 13, 18) → `postgres` SELECT/EXPLAIN only; DB names are snake_case.
- PR/issue/branch context for review and planning → `github` (read-only; writes are done manually by the user).
- Multi-step planning/debugging → `sequentialthinking`.

## Resolved conflicts between skills

- **Ponytail "one assert-based self-check, no frameworks"**: tests use the existing Vitest setup (`vitest.config.ts`, `src/test`), not ad-hoc checks.
- **Ponytail "minimal output"**: still list affected BR IDs and tests in the plan/response.
- **Ponytail never removes**: input validation, permission-aware error handling (401/403/409), accessibility basics, concurrency handling, AI accept/reject steps, provenance display required by the spec.
- **Canvas/drag**: persist the committed final change (drop/resize end), not every pointer move (`panelforge-event-sourcing`).
- **`browser-testing-with-devtools` assumes Chrome DevTools MCP for everything**: here Chrome DevTools MCP (provided by the ECC plugin, dedicated profile) is used only for performance measurement; Playwright MCP (`--isolated --headless`) stays the default. Do not install any additional browser MCP without asking (rule 16).
- **`ci-cd-and-automation` examples (Vercel, Prisma)**: adapt to the existing `.github/workflows`; do not add deploy targets without asking.
- **`.agents/skills/ponytail/ponytail.md`** (Antigravity ruleset) and the Claude Ponytail plugin describe the same philosophy; the precedence above applies to both.

## Ponytail

Installed as a Claude Code plugin at project scope (`.claude/settings.json`, marketplace pinned to `v4.10.0`). Default mode is **lite** (`PONYTAIL_DEFAULT_MODE=lite`). Do not switch the project default to `full` or `ultra`.

## Agent configuration files

- `.claude/skills/` – 16 upstream skills (addyosmani/agent-skills, MIT) + 6 `panelforge-*` skills. Upstream copies are unmodified; to update, re-copy from https://github.com/addyosmani/agent-skills (`skills/<name>`); a local clone lives in `../../Backend/PanelForge_FA26SE251/agent-tools/agent-skills` (git-ignored).
- `.claude/references/` – checklists referenced by upstream skills as `../../references/*.md`.
- `.claude/settings.json` – shared: Ponytail plugin, `PONYTAIL_DEFAULT_MODE`, deny rules for reading secret files.
- `.agents/skills/` – existing skills used by the Antigravity agent; left unchanged.
