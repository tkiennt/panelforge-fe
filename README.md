# PanelForge Frontend 🎨📖
> *An AI-Assisted Manga & Webtoon Production Management Platform*

[![React](https://img.shields.io/badge/React-19.x-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-4.x-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)

---

## 📖 Overview
**PanelForge** is a modern, collaborative SaaS platform tailored for manga studios, writers, artists, letterers, editors, and producers. It bridges the gap between creative storytelling and complex project management by combining:
- **Kanban Production Pipeline:** Multi-stage workflow tracking from Scripting to Final Approval.
- **AI-Powered Continuity & Script Breakdown:** Intelligent script analysis and visual consistency checks.
- **Centralized Series Bible:** Lore, character references, and world-building rules synced with `pgvector` for real-time RAG continuity.
- **Editorial AI Studio Design:** A distraction-free, quiet editorial print magazine aesthetic built with Inter typography and atmospheric pastel gradients.

---

## 🎨 Design System & Visual Identity
- **Visual Tone:** Quiet Editorial Print Magazine (`#f5f5f5` canvas, warm near-black ink `#292524` typography).
- **Brand Voltage:** Soft atmospheric pastel gradient orbs (Mint `#a7e5d3`, Peach `#f4c5a8`, Lavender `#c8b8e0`, Sky `#a8c8e8`, Rose `#e8b8c4`).
- **Typography:** Standardized on `@fontsource/inter` (Weights: 400, 500, 600, 700). Minimum font size is `text-xs` (12px).
- **Core Rules:** See detailed specs in [`docs/DESIGN_RULES.md`](./docs/DESIGN_RULES.md).

---

## 🏗️ Project Architecture
```text
panelforge-fe/
├── src/
│   ├── layouts/              # Global application shell and navigation layouts
│   ├── roles/                # Role-isolated views, components, and local READMEs:
│   │   ├── admin/            # System & user management
│   │   ├── artist/           # Page drawing, layer layout, and asset review
│   │   ├── editor/           # Quality control and continuity validation
│   │   ├── guest/            # Public viewer / portfolio preview
│   │   ├── letterer/         # Dialogue balloons and SFX placement
│   │   ├── producer/         # Workspace, sprint timeline, pipeline board
│   │   ├── publisher/        # Catalog, metadata, and export dispatch
│   │   ├── reader/           # Reading view & community comments
│   │   └── writer/           # Scriptwriting & Series Bible lore management
│   ├── shared/               # Shared components, hooks, modals, and pipeline boards
│   ├── services/api/         # REST API clients & endpoints integration
│   └── styles/               # Tailwind CSS v4 design tokens and global styles
├── docs/                     # Central documentation hub (see docs/README.md)
├── PRODUCT.md                # System specification & business rules
└── CLAUDE.md                 # Developer & AI Agent operational instructions
```

---

## 🚀 Quick Start & Development

### 1. Installation
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Quality & Verification Scripts
```bash
# Typecheck
npm run typecheck

# Lint check & auto-fix
npm run lint

# Run all automated tests
npm run test:run

# Full quality gate (typecheck + lint + test)
npm run quality
```

---

## 📚 Technical Documentation Hub
All architectural documentation, implementation plans, and design specifications are organized under [`docs/`](./docs/README.md):
- [Documentation Hub & Index](./docs/README.md)
- [Documentation Process & Sync Protocol](./docs/DOCUMENTATION_PROCESS.md)
- [Design Rules & Tokens](./docs/DESIGN_RULES.md)
- [Completed Implementation Plans](./docs/implement-plan/completed/)
