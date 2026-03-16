---
'@boostkit/panels': minor
---

Add Chart and List schema elements, shared WidgetRenderer component, and Resource.widgets() for show page widgets.

- `Chart.make(title)` — line, bar, pie, doughnut, area charts with `.chartType()`, `.labels()`, `.datasets()`, `.height()`
- `List.make(title)` — card with items list, each with optional description, href, icon; `.items()`, `.limit()`
- `WidgetRenderer` — shared component used by panel dashboard, resource show page, and dashboard builder
- `Resource.widgets(record?)` — define schema element widgets scoped to the show page
- `recharts` added as optional peer dependency
- Dashboard i18n keys added (en + ar): customizeDashboard, doneDashboard, addWidget, removeWidget, noWidgets, availableWidgets
