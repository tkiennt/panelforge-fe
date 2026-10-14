# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Professional studio teams and indie manga/webtoon creators:
- **Producers / Studio Leads**: Overseeing series progress, stage matrix, milestone burndown, and publishing exports.
- **Writers**: Developing episodic scripts, dialogue blocks, scene pacing, and version comparisons.
- **Storyboarders & Artists (Pencil, Ink, Color)**: Crafting panel layouts, poses, backgrounds, and visual continuity.
- **Editors**: Reviewing panels, providing contextual feedback, approving/rejecting stage transitions.
- **Readers**: Accessing public catalogs and shared token previews.

## Product Purpose
PanelForge is a specialized sequential art production studio platform. It transforms episodic comic and manga creation from fragmented desktop apps and spreadsheets into an integrated, end-to-end studio pipeline from Series Bible to publication-ready exports.

## Positioning
Unlike generic creative tools (Clip Studio Paint, Photoshop) or generic project trackers (Jira, Trello), PanelForge bridges story continuity, character consistency, script blocks, panel-level AI generation, and multi-role production gating into a cohesive sequential storytelling OS.

## Operating Context
- Fast-paced episodic deadlines (weekly or bi-weekly chapter delivery).
- High visual asset volume (dozens of panels per episode, character turnarounds, color swatches).
- Sequential multi-role handoffs: Script -> Storyboard -> Line Art -> Color -> Lettering -> Final QC.
- Desktop browser viewport (1080p / 1440p) as the primary workspace for dense multi-pane studio layouts (Artist Desk, Stage Matrix, Series Bible).

## Capabilities and Constraints
- **Series Bible**: Managing character turnarounds, costume variants, recurring locations, lore elements, and art style guidelines.
- **Script & Panel Integration**: Linking written scenes and dialogue directly to canvas panels.
- **Workflow Gating & Review**: Stage-based status transitions with reviewer notes (Draft -> In Review -> Changes Requested -> Approved).
- **AI-Assisted Drafting**: Generating panel roughs, reference imagery, and consistency prompts styled to the series bible.
- **Export & Delivery**: Multi-format chapter rendering (Webtoon vertical scroll, Manga page spreads, PDF/CBZ bundles).
- **Technical Constraints**: React 18 + Vite SPA, REST API with JWT authentication, SignalR for real-time progress updates.

## Brand Commitments
- **Name**: PanelForge
- **Personality**: Tactile, editorial, focused, studio-grade craft.
- **Incumbent Visual Language**: "Manga Paper & Ink" foundation (`#FAF8F5`, rich ink borders `#171717`) paired with energetic Tangerine Orange (`#F97316`) for core actions and AI Violet (`#8B5CF6`) for generative capabilities.

## Evidence on Hand
- Implemented and live frontend views in `src/` (`SeriesBibleView`, `IsolatedSeriesBible`, `PublicCatalogView`, `ExportView`, `DashboardView`).
- Detailed screen status audit in `docs/audit/UI_SCREEN_AUDIT.md`.
- Comprehensive design tokens and component specs in `docs/DESIGN.md`.

## Product Principles
1. **Flow Over Friction**: The workspace feels like a physical artist desk; tools and navigation stay unobtrusive until summoned.
2. **Sequential Integrity**: The panel is the atomic unit of comic art; every asset, dialogue line, and approval traces back to a specific panel and chapter.
3. **Studio Craftsmanship**: Professional editorial typography, tactile warm paper surfaces, and deterministic semantic status colors rather than generic AI SaaS templates.
4. **Transparent AI Collaboration**: AI serves as an apprentice/assistant (marked in violet accents); humans maintain authorial intent and final editorial approval.
