# PanelForge 🖋️✨
> *An AI-Assisted Manga & Webtoon Production Management Platform*

[![React](https://img.shields.io/badge/React-18.x-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-3.x-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📖 Overview
**PanelForge** is a modern, collaborative SaaS platform tailored for manga studios, writers, artists, and editors. It bridges the gap between creative storytelling and complex project management, combining an intuitive **Kanban production pipeline**, an **AI-powered script breakdown & continuity engine**, and a centralized **Series Bible (RAG repository)**.

Designed around a pristine **"Manga Paper × Ink × Tangerine"** artistic editorial aesthetic, PanelForge provides a distraction-free, professional digital workspace for comic creators.

---

## 🎨 Design System & Theme
* **Visual Identity:** Clean, bright editorial light-theme inspired by high-grade manuscript drawing paper and traditional Japanese manga publishing.
* **Color Palette:**
  * **Paper & Backgrounds:** Pure White (`#FFFFFF`) & Warm Organic Paper (`#FAF8F5`).
  * **Ink & Structure:** Crisp Ink Black (`#171717`) for typography, outlines, and borders (`1.5px`).
  * **Brand Accent:** Tangerine Orange (`#F97316`) for primary creator actions.
  * **AI Accent:** Refined AI Violet (`#8B5CF6`) for intelligent assistance and vectorization logs.
* **Typography:**
  * **Headings & Series Titles:** Serif editorial font (`Playfair Display` / `Cinzel`).
  * **UI & Body Elements:** Clean geometric sans-serif (`Plus Jakarta Sans` / `Inter`).
  * **Scripts & Technical Metadata:** Crisp monospace (`JetBrains Mono`).

---

## 🚀 Core Features & Modules
1. **Portfolio Content Hub:** Manage multiple manga series/projects with live progress tracking, publication metadata, and a streamlined "Create New Series" setup flow.
2. **Project Workspace (App Shell):** Persistent navigation and single-page application (SPA) routing across four core modules:
   * **Dashboard:** Real-time burndown metrics, velocity charts, and append-only SHA-256 provenance audit logs.
   * **Production Pipeline (Kanban):** Multi-stage workflow board (Script ➔ Thumbnail ➔ Pencil ➔ Ink ➔ Review ➔ Approved) featuring rich page cards with strict deadline tracking and assignee filters.
   * **Series Bible (RAG Repository):** Categorized lore storage (Characters, Locations, Props, Plot Rules) synced with `pgvector` for real-time AI continuity checking.
   * **Members & Roles (RBAC):** Role-based permission matrix and team management for Producers, Writers, Artists, and Reviewers.

---

## 🛠️ Tech Stack
* **Frontend Library:** React (Vite / Next.js architecture)
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **State Management:** React Hooks (`useState` SPA navigation)

---

## 📂 Project Structure
```text
panel-forge/
├── public/                 # Static assets & cover art placeholders
├── src/
│   ├── components/         # Reusable UI components (Modals, Cards, App Shell)
│   ├── views/              # Core screen modules (Content Hub, Kanban, Bible, Dashboard)
│   ├── styles/             # Tailwind configuration & global typography
│   └── App.jsx             # Main SPA router & state controller
├── DESIGN.md               # Complete design system & UI guidelines
├── package.json
└── README.md
