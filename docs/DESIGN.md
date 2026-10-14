# PanelForge Design System & Guidelines (Manga Paper & Ink × Tangerine)

## 1. Core Principles
1. **Paper & Ink Foundation**: The background is rooted in tactile manga paper (`#FAF8F5`, `#FAF8F4`) and rich ink borders (`#171717`, `#E7E7E7`). Warm and studio-grade editorial aesthetics over cold flat designs.
2. **Deterministic Color Semantics**: 
   - **Tangerine Orange (`#F97316`)**: Primary CTAs, active highlights, key navigation state.
   - **AI Violet (`#8B5CF6`)**: AI-assisted elements, prompt bars, suggestions.
   - **Amber (`#F59E0B` / `#D97706`)**: In-review, pending, warning.
   - **Mint/Emerald (`#10B981` / `#059669`)**: Approved, completed, live status.
   - **Red (`#EF4444` / `#DC2626`)**: Critical alerts, rejected, overdue.
3. **Typography Hierarchy**:
   - **Headings / Studio Brand**: Playfair Display / Georgia (Editorial serif tone).
   - **Body / Interface**: Plus Jakarta Sans / Inter (`font-sans`).
   - **Data / Codes / Panel IDs / Metrics**: JetBrains Mono (`font-mono`).

---

## 2. Design Tokens & Color Palette
```css
/* Core Ink & Paper */
--color-ink-black: #171717;
--color-ink-dark: #262626;
--color-ink-gray: #555555;
--color-ink-light: #888888;
--color-ink-border: #E7E7E7;

--color-paper-canvas: #FFFFFF;
--color-paper-warm: #FAF8F5;
--color-paper-muted: #F4F1EA;

/* Brand Tangerine */
--color-tangerine: #F97316;
--color-tangerine-hover: #EA580C;
--color-tangerine-light: #FFF7ED;
--color-tangerine-border: #FDBA74;

/* AI Assistant */
--color-ai-violet: #8B5CF6;
--color-ai-deep: #6D28D9;
--color-ai-surface: #F3E8FF;

/* Status Colors */
--color-status-mint: #10B981;
--color-status-amber: #F59E0B;
--color-status-red: #EF4444;
```

---

## 3. Elevation & Surfaces
- **Level 0 (App Canvas)**: `bg-[#FAF8F5]` or `bg-[#F8F6F0]`.
- **Level 1 (Cards, Workspaces, Sections)**: `bg-white border border-[#E7E7E7] rounded-xl shadow-sm`.
- **Level 2 (Toolbars, Sticky Headers)**: `bg-white/95 backdrop-blur-sm border-b border-[#E7E7E7]`.
- **Level 3 (Modals, Overlays, Floating Menus)**: `bg-white border border-[#E7E7E7] rounded-2xl shadow-xl`.
- **Active Navigation / Selection**: `bg-[#FFF7ED] text-[#EA580C] border-l-4 border-[#F97316]`.

---

## 4. Components & Patterns
- **Buttons (Primary CTA)**: Vibrant Tangerine `#F97316` hover `#EA580C`, text white, `rounded-xl font-medium px-4 py-2.5 shadow-sm active:scale-[0.98]`.
- **Buttons (Secondary / Neutral)**: Paper white `#FFFFFF`, border `#E7E7E7`, text `#171717`, hover `bg-[#F4F1EA]`.
- **Badges & Pills**: `rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold`, contextual color pairing with light surface background.
- **AI Suggested Elements**: Left border accent `border-l-2 border-[#8B5CF6]` and violet spark badge with Lucide `Sparkles` icon.
- **Empty States**: Border dashed `#B8B8B8` with warm orange icon container and Playfair title.
