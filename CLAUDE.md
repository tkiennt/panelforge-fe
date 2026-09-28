# CLAUDE.md – PanelForge Frontend

React + TypeScript · Vite · Tailwind CSS · HTML5 Canvas editor · dnd-kit · TanStack Query · Vitest.
(Konva and Playwright are planned in the stack but are not in `package.json` yet — do not add them without asking.)

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run quality   # typecheck + lint + tests
```

Frontend ↔ Backend coordination happens through `../../HANDOFF.md` (see the workspace-level `CLAUDE.md` and `../../.agent/rules/handoff-frontend.md`). Only call backend endpoints marked `DONE` there; take field names from Swagger, never guess.

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

- Any skill that asks for **Chrome DevTools MCP** (`browser-testing-with-devtools`, `test-driven-development`, `performance-optimization`) → use **Playwright MCP** instead (tool mapping in `panelforge-tooling`). Do not install `chrome-devtools-mcp`.
- Library/framework API questions (MediatR, EF Core, ASP.NET Core, React, Tailwind, TanStack, dnd-kit) → `context7` before relying on memory.
- Business-rule / schema checks (BR-01, 03, 05, 08, 11, 13, 18) → `postgres` SELECT/EXPLAIN only; DB names are snake_case.
- PR/issue/branch context for review and planning → `github` (read-only; writes are done manually by the user).
- Multi-step planning/debugging → `sequentialthinking`.

## Resolved conflicts between skills

- **Ponytail "one assert-based self-check, no frameworks"**: tests use the existing Vitest setup (`vitest.config.ts`, `src/test`), not ad-hoc checks.
- **Ponytail "minimal output"**: still list affected BR IDs and tests in the plan/response.
- **Ponytail never removes**: input validation, permission-aware error handling (401/403/409), accessibility basics, concurrency handling, AI accept/reject steps, provenance display required by the spec.
- **Canvas/drag**: persist the committed final change (drop/resize end), not every pointer move (`panelforge-event-sourcing`).
- **`browser-testing-with-devtools` suggests installing `chrome-devtools-mcp`**: do not install it without asking (rule 16). Prefer the already-configured Playwright MCP (`--isolated --headless`) or the built-in browser.
- **`ci-cd-and-automation` examples (Vercel, Prisma)**: adapt to the existing `.github/workflows`; do not add deploy targets without asking.
- **`.agents/skills/ponytail/ponytail.md`** (Antigravity ruleset) and the Claude Ponytail plugin describe the same philosophy; the precedence above applies to both.

## Ponytail

Installed as a Claude Code plugin at project scope (`.claude/settings.json`, marketplace pinned to `v4.10.0`). Default mode is **lite** (`PONYTAIL_DEFAULT_MODE=lite`). Do not switch the project default to `full` or `ultra`.

## Agent configuration files

- `.claude/skills/` – 16 upstream skills (addyosmani/agent-skills, MIT) + 6 `panelforge-*` skills. Upstream copies are unmodified; to update, re-copy from `../../agent-tools/agent-skills/skills/<name>`.
- `.claude/references/` – checklists referenced by upstream skills as `../../references/*.md`.
- `.claude/settings.json` – shared: Ponytail plugin, `PONYTAIL_DEFAULT_MODE`, deny rules for reading secret files.
- `.agents/skills/` – existing skills used by the Antigravity agent; left unchanged.
