# PanelForge Frontend

Web client for **PanelForge**, an AI-assisted manga and webtoon production management platform.

[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

- **What it is:** React 19 web client featuring role-specific screens, Kanban pipeline boards, script editor, and Konva panel canvas.
- **How to run:** `npm install && npm run dev` on port `3000` (requires [Backend running](../PanelForge_FA26SE251/README.md#getting-started)).
- **Where to read more:** [Frontend Docs](docs/README.md) · [Backend README](../PanelForge_FA26SE251/README.md) for product overview, roles, and business rules.

---

## Getting Started

1. Start [Backend](../PanelForge_FA26SE251/README.md#getting-started) on `http://localhost:5044` (requires Node.js 20+).
2. Install dependencies and start dev server: `npm install && npm run dev` (`http://localhost:3000`).
> Dev server must run on port **3000** (or 5173/5174); Backend CORS rejects other origins.

---

## 🎨 Design System & Visual Identity
- **Visual Tone:** Quiet Editorial Print Magazine (`#f5f5f5` canvas, warm near-black ink `#292524` typography).
- **Brand Voltage:** Soft atmospheric pastel gradient orbs (Mint `#a7e5d3`, Peach `#f4c5a8`, Lavender `#c8b8e0`, Sky `#a8c8e8`, Rose `#e8b8c4`).
- **Typography:** Standardized on `@fontsource/inter` (Weights: 400, 500, 600, 700). Minimum font size is `text-xs` (12px).
- **Core Rules:** See detailed specs in [`panelforge-hub/docs/spec/DESIGN_RULES.md`](../panelforge-hub/docs/spec/DESIGN_RULES.md).

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

## Deploy (Cloudflare Pages)

`.github/workflows/deploy-cloudflare.yml` deploys `dist/` to the Cloudflare Pages project `panelforge-fe` after **Frontend CI** passes on `main`, `stg`, `dev` or `trungkien` (or manually via *Run workflow*). `main` is the production deployment; other branches get a preview URL `https://<branch>.panelforge-fe.pages.dev`. SPA fallback and headers come from `public/_redirects` and `public/_headers`.

One-time setup:

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Direct Upload**, name the project `panelforge-fe`, production branch `main` (or run `npx wrangler pages project create panelforge-fe --production-branch=main`).
2. Create an API token with **Account → Cloudflare Pages → Edit**; copy the Account ID from the dashboard sidebar.
3. GitHub repo → **Settings → Environments**: create `production` and `preview`. In each, add:
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`
   - Variables: `VITE_API_URL`, `VITE_APP_URL`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`
4. The workflow file must exist on the repo's **default branch**: GitHub only fires `workflow_run` triggers from there.
5. Add the Pages domain (`panelforge-fe.pages.dev` or a custom domain) to Firebase Auth **Authorized domains** and to the backend CORS allow-list.

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

- Editorial print magazine style (`#f5f5f5` canvas, `#292524` ink, pastel accents, Inter typography). Full specifications in [`DESIGN_RULES.md`](../panelforge-hub/docs/spec/DESIGN_RULES.md).
- Further documentation: [Documentation index](./docs/README.md) · [Product](./PRODUCT.md).

---

## Troubleshooting

| Symptom | Resolution |
|---|---|
| Network / CORS errors | Ensure Backend runs on 5044 and dev server is on port 3000, 5173, or 5174 |
| Login fails | Backend is not running in `Development` mode or database is not seeded |
| Google sign-in does nothing | Missing or invalid `VITE_FIREBASE_*` credentials in `.env` |
| Missing translation text | Run `npm run i18n:check` |
| Playwright tests fail | Run `npx playwright install` to install browser binaries |

---

## 📚 Technical Documentation Hub
All architectural documentation and design specifications are organized under [`docs/`](./docs/README.md). Business spec for all three repos: [`panelforge-hub/docs/V2.6/PANELFORGE_MASTER_SPECIFICATION_V2_6.md`](../panelforge-hub/docs/V2.6/PANELFORGE_MASTER_SPECIFICATION_V2_6.md). Who is working on what: [`panelforge-hub/docs/tracking/TEAM_WORKBOARD.md`](../panelforge-hub/docs/tracking/TEAM_WORKBOARD.md) (update it when you start and finish a task).
- [Documentation Hub & Index](./docs/README.md)
- [Design Rules & Tokens](../panelforge-hub/docs/spec/DESIGN_RULES.md)
