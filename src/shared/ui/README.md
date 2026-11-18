# Shared UI primitives

Use `Modal` for centered workflows, `Drawer` for side panels and mobile navigation, and `ConfirmDialog` for promise-based confirmation. Use `Alert` for inline feedback, `Toast` through `ToastContext` for transient global feedback, and the sidebar primitives for all navigation rails.

Feature code owns content and localized labels. The primitives own dismissal, focus, scroll locking, portals, ARIA, and motion. Preserve existing `data-testid` values when migrating.

Do not add new `fixed inset-0` overlays. Compose `Modal`, `Drawer`, or `ConfirmDialog` instead.
