# Shared UI primitives

Use `Modal` for centered workflows, `Drawer` for side panels and mobile navigation, and `ConfirmDialog` for promise-based confirmation. Use `Alert` for inline feedback, `Toast` through `ToastContext` for transient global feedback, and the sidebar primitives for all navigation rails.

Feature code owns content and localized labels. The primitives own dismissal, focus, scroll locking, portals, ARIA, and motion. Preserve existing `data-testid` values when migrating.

Do not add new `fixed inset-0` overlays. Compose `Modal`, `Drawer`, or `ConfirmDialog` instead.

## Surface & Header Primitives

| Primitive                 | Role & Key Props                                                                                                                                         | Default Styling                                                                          |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| `PageHeader`              | Main page header or sticky workbench toolbar (`variant: 'page' \| 'toolbar'`, `icon`, `eyebrow`, `title`, `description`, `actions`, `as`/`headingLevel`) | Paper base + 48x3px ink rule (page) or inset top orange strip (toolbar)                  |
| `SectionHeader`           | Section titles on paper (`eyebrow`, `title`, `count`, `actions`, `level`/`as`)                                                                           | H2 text-stone-900 + bg-kraft count chip                                                  |
| `Card`                    | Card container (`tone`, `featured`, `as: 'section' \| 'article' \| 'div'`)                                                                               | bg-white rounded-xl border border-stone-200/80 shadow-xs. `featured` adds border-t-[3px] |
| `CardHeader`              | Card header band (`icon`, `title`, `subtitle`, `actions`, `tone`, `titleAs`)                                                                             | bg-head-wash border-b border-head-line px-4 py-3, 28px icon tile                         |
| `CardBody`                | Card body wrapper                                                                                                                                        | px-4 py-4                                                                                |
| `StatKpiCard`             | Reusable KPI card (`title`, `value`, `icon`, `badge`, `description`, `footer`)                                                                           | Card + anchored warm header + high-contrast metric body                                  |
| `Badge`                   | Semantic pill (`brand`, `ai`, `success`, `warning`, `danger`, `info`, `neutral`)                                                                         | Tinted fill + matching border + non-wrapping 12px label                                  |
| `StatusBadge`             | Business status pill (`kind`, `status`) resolved through `shared/lib/statusTone.ts`                                                                      | One tone, icon, and localized label per status                                           |
| `Button` / `IconButton`   | Semantic actions, loading and icon-only controls                                                                                                         | Rounded CTA, 32/36px minimum height, visible focus                                       |
| `Field` + controls        | Labelled native input, textarea, select and search contracts                                                                                             | Warm border, text error + `aria-invalid`                                                 |
| `Tabs`                    | Controlled in-page tabs with Arrow/Home/End keyboard support                                                                                             | Orange underline plus `aria-selected`                                                    |
| `EmptyState` / `Skeleton` | Empty and loading feedback                                                                                                                               | Dashed paper panel / warm pulse block                                                    |
| `ProgressBar` / `Metric`  | Accessible progress and compact numeric summary                                                                                                          | Semantic fill / mono value                                                               |
| `Avatar` / `CountChip`    | User image or initials and reusable kraft count                                                                                                          | Fixed image dimensions / kraft pill                                                      |
