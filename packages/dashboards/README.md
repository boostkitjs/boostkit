# @boostkit/dashboards

User-customizable dashboard builder for BoostKit panels. Drag-and-drop widgets with per-user layout persistence.

```bash
pnpm add @boostkit/dashboards
```

---

## Quick Start

```ts
// bootstrap/providers.ts
import { dashboard } from '@boostkit/dashboards'
import { Widget } from '@boostkit/dashboards'

export default [
  dashboard({
    widgets: [
      Widget.make('total-users')
        .label('Total Users')
        .component('stat')
        .defaultSize('small')
        .icon('👥')
        .data(async () => ({
          value: await User.query().count(),
          trend: 12,
        })),

      Widget.make('revenue')
        .label('Monthly Revenue')
        .component('chart')
        .defaultSize('large')
        .data(async () => ({
          type: 'bar',
          labels: ['Jan', 'Feb', 'Mar', 'Apr'],
          datasets: [{ label: 'Revenue', data: [4200, 5800, 4900, 7100] }],
        })),

      Widget.make('recent-articles')
        .label('Recent Articles')
        .component('table')
        .defaultSize('large')
        .data(async () => ({
          columns: [
            { name: 'title', label: 'Title' },
            { name: 'createdAt', label: 'Date' },
          ],
          records: await Article.query().orderBy('createdAt', 'desc').limit(5).get(),
          href: '/admin/articles',
        })),
    ],
  }),
  // ... other providers
]
```

---

## Widget Class

Register available widgets using the fluent builder API:

```ts
Widget.make('widget-id')
  .label('Display Name')         // shown in the dashboard and palette
  .component('stat')             // 'stat' | 'chart' | 'table' | 'list'
  .defaultSize('medium')         // 'small' | 'medium' | 'large'
  .description('Optional desc')  // shown in the widget palette
  .icon('📊')                    // shown in the widget palette
  .data(async (ctx) => ({        // async data resolver, called on each load
    value: 42,
    trend: 5,
  }))
```

### Widget Sizes

| Size | Grid Columns | Best For |
|------|-------------|----------|
| `small` | 1 of 4 | Single stat, shortcut button |
| `medium` | 2 of 4 | Stat row, mini chart, short list |
| `large` | 4 of 4 (full width) | Full chart, table, activity feed |

### Widget Components

| Component | Expected `data()` Shape |
|-----------|------------------------|
| `stat` | `{ value: number \| string, trend?: number, description?: string }` |
| `chart` | `{ type: 'line' \| 'bar' \| 'area' \| 'pie' \| 'doughnut', labels: string[], datasets: { label, data, color? }[] }` |
| `table` | `{ columns: { name, label }[], records: object[], href: string }` |
| `list` | `{ items: { label, description?, href?, icon? }[], limit?: number }` |

---

## Dashboard Grid

The dashboard renders as a responsive 4-column grid. Users can:

1. **Customize** -- click "Customize" to enter edit mode
2. **Drag** -- reorder widgets by dragging
3. **Resize** -- click the S/M/L pill to cycle through sizes
4. **Add** -- click "+ Add Widget" to add from the palette
5. **Remove** -- click x to remove a widget
6. **Done** -- click "Done" to save the layout

Layout is saved per-user in the `PanelDashboardLayout` database table.

### Responsive Breakpoints

| Screen | Columns |
|--------|---------|
| Large (>=1200px) | 4 |
| Medium (>=768px) | 4 |
| Small (>=480px) | 2 |
| Extra small | 1 |

---

## Database Model

Add this model to your Prisma schema:

```prisma
model PanelDashboardLayout {
  id        String   @id @default(cuid())
  userId    String
  panel     String
  layout    String   @default("[]")  // JSON: [{ widgetId, size, x, y, w, h }]
  updatedAt DateTime @updatedAt

  @@unique([userId, panel])
}
```

Then run:

```bash
pnpm exec prisma generate
pnpm exec prisma db push
```

---

## API Endpoints

The dashboard service provider mounts these routes for each panel:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `{panel}/api/_dashboard/widgets` | GET | All registered widgets with resolved data |
| `{panel}/api/_dashboard/layout` | GET | User's saved layout (or default) |
| `{panel}/api/_dashboard/layout` | PUT | Save user's layout |

---

## Peer Dependencies

- `@boostkit/panels` -- widget rendering
- `react-grid-layout` -- drag-and-drop grid

```bash
pnpm add @boostkit/dashboards @boostkit/panels react-grid-layout
```
