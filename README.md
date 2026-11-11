# PanelForge Frontend

Web client for **PanelForge**, an AI-assisted manga and webtoon production management platform.

[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

- **What it is:** React 19 web client featuring role-specific screens, Kanban pipeline boards, script editor, and Konva panel canvas.
- **How to run:** `npm install && npm run dev` on port `3000` (requires [Backend running](../../Backend/PanelForge_FA26SE251/README.md#getting-started)).
- **Where to read more:** [Frontend Docs](docs/README.md) · [Backend README](../../Backend/PanelForge_FA26SE251/README.md) for product overview, roles, and business rules.

---

## Getting Started

1. Start [Backend](../../Backend/PanelForge_FA26SE251/README.md#getting-started) on `http://localhost:5044` (requires Node.js 20+).
2. Install dependencies and start dev server: `npm install && npm run dev` (`http://localhost:3000`).
> Dev server must run on port **3000** (or 5173/5174); Backend CORS rejects other origins.

---

## Environment Variables

Configured in `.env` (all optional for local development; defaults to `http://localhost:5044`):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` (or `VITE_API_BASE_URL`) | `http://localhost:5044/api` | REST API base URL used by Axios |
| `VITE_APP_URL` | `http://localhost:5044` | Backend origin (SignalR hubs, uploaded assets) |
| `VITE_FIREBASE_*` | `dummy` | Firebase Web configuration for Google sign-in |

> AI keys are configured per Workspace on the Backend; never put AI keys or secrets in `.env`.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server at `http://localhost:3000` with HMR |
| `npm run build` / `preview` | Production build into `dist/` / local preview |
| `npm run typecheck` / `lint` / `format` | TypeScript checks / ESLint (zero warnings) / Prettier |
| `npm run i18n:check` | Verify `vi` and `en` translation keys match |
| `npm run test` / `test:e2e` | Vitest unit tests / Playwright E2E tests |
| `npm run quality` | Pre-push verification (typecheck + lint + test) |

---

## Project Structure

```text
src/
├── app/ (bootstrap, routes)    ├── shared/ (components, canvas, board)
├── layouts/ (shell, nav)       ├── services/api/ (Axios REST clients)
├── roles/ (role views)         └── locales/, styles/, config/
```

---

## Design System & Docs

- Editorial print magazine style (`#f5f5f5` canvas, `#292524` ink, pastel accents, Inter typography). Full specifications in [`docs/DESIGN_RULES.md`](./docs/DESIGN_RULES.md).
- Further documentation: [Documentation Hub](./docs/README.md) · [Production Architecture](./docs/CORE_PRODUCTION_ARCHITECTURE.md) · [Product Spec](./PRODUCT.md).

---

## Troubleshooting

| Symptom | Resolution |
|---|---|
| Network / CORS errors | Ensure Backend runs on 5044 and dev server is on port 3000, 5173, or 5174 |
| Login fails | Backend is not running in `Development` mode or database is not seeded |
| Google sign-in does nothing | Missing or invalid `VITE_FIREBASE_*` credentials in `.env` |
| Missing translation text | Run `npm run i18n:check` |
| Playwright tests fail | Run `npx playwright install` to install browser binaries |
