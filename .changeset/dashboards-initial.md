---
'@boostkit/dashboards': minor
---

Initial release — user-customizable dashboard builder for BoostKit panels.

- `Widget.make(id)` — fluent registration: `.label()`, `.defaultSize()`, `.component()`, `.description()`, `.icon()`, `.data(async fn)`
- `dashboard({ widgets })` — service provider factory, registers widgets and mounts API routes
- `DashboardRegistry` — static registry with `register()`, `get()`, `all()`, `has()`, `reset()`
- API: `GET _dashboard/widgets` (with resolved data), `GET _dashboard/layout`, `PUT _dashboard/layout`
- `DashboardGrid` React component — responsive 4-column grid, drag-and-drop via react-grid-layout
- iOS-style widget sizing: Small (1-col) / Medium (2-col) / Large (4-col) with click-to-cycle
- Add/remove widgets from a palette drawer in edit mode
- Per-user layout persistence via `PanelDashboardLayout` Prisma model
- Widget component types: `stat`, `chart`, `table`, `list` — rendered via panels WidgetRenderer
