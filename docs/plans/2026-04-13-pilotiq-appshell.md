# @pilotiq/pilotiq — AppShell Layout

**Goal:** Build a proper admin layout using shadcn UI primitives with 3-panel structure, two layout modes, and component slot injection points.

---

## Structure

```
packages/pilotiq/src/react/
  ui/                        ← shadcn primitives (copied from playground)
    button.tsx
    separator.tsx
    sheet.tsx
    skeleton.tsx
    tooltip.tsx
    sidebar.tsx              ← shadcn sidebar (collapsible, mobile-responsive)
  hooks/
    use-mobile.ts            ← mobile breakpoint detection
  utils.ts                   ← cn() helper
  layouts/
    SidebarLayout.tsx         ← left nav + content + aux panel
    TopbarLayout.tsx          ← top nav + content + aux panel
  AppShell.tsx               ← picks layout based on config, renders slots
  AuxPanel.tsx               ← right auxiliary panel (plugins register here)
  slots.tsx                  ← slot registry context + useSlots() hook
  index.ts                   ← barrel exports
```

---

## Phase 1: Shadcn Primitives

### Task 1: Copy shadcn UI components

Copy from `playground/src/components/ui/` into `packages/pilotiq/src/react/ui/`:
- `button.tsx`
- `separator.tsx`
- `sheet.tsx`
- `skeleton.tsx`
- `tooltip.tsx`
- `sidebar.tsx`

Also copy:
- `playground/src/hooks/use-mobile.ts` → `src/react/hooks/use-mobile.ts`
- `playground/src/lib/utils.ts` → `src/react/utils.ts` (just the `cn()` helper)

Update all import paths from `@/components/ui/...` → relative `../ui/...` and `@/hooks/...` → relative `../hooks/...`.

### Task 2: Verify build

```bash
cd packages/pilotiq && pnpm build
```

---

## Phase 2: SidebarLayout

### Task 3: Build SidebarLayout

3-panel structure:
```
[ Sidebar  ][   Content   ][ AuxPanel ]
  - Logo      flex-1          collapsible
  - Nav                       empty by default
  - Footer
```

Uses shadcn `Sidebar` component. Features:
- Collapsible (icon-only mode)
- Mobile-responsive (Sheet overlay)
- Logo from `panel.branding`
- Nav items from `panel.resources`
- Keyboard shortcut (Cmd+B)

### Task 4: Build AuxPanel

Right-side panel shared by both layouts:
- Hidden when no panels registered
- Collapsible
- Tab UI when multiple panels registered
- Plugins register via `registerAuxPanel()`

### Task 5: Build slot system

React context for component slot injection:
```tsx
<SlotProvider slots={config.components}>
  {slot('beforeNav')}
  <Nav />
  {slot('afterNav')}
</SlotProvider>
```

Slots: `nav`, `header`, `footer`, `beforeNav`, `afterNav`, `beforeContent`, `afterContent`

---

## Phase 3: TopbarLayout

### Task 6: Build TopbarLayout

```
[ Logo | Nav Items | Search | User  ][ AuxPanel ]
[          Content                   ][          ]
```

Horizontal nav, same content area + aux panel.

---

## Phase 4: AppShell

### Task 7: AppShell entry component

Picks layout based on config:
```tsx
export function AppShell({ layout = 'sidebar', ...props }) {
  return layout === 'topbar'
    ? <TopbarLayout {...props} />
    : <SidebarLayout {...props} />
}
```

### Task 8: Update Vite plugin stubs

Generated page stubs use `AppShell` (already done — just verify it works with the new layout).

### Task 9: Test

- `/new-admin` — sidebar layout, collapsible, mobile
- Change to `.layout('topbar')` — topbar layout
- Verify aux panel renders empty (no plugins)

---

## Dependencies

The shadcn sidebar component needs:
- `class-variance-authority` — already in playground deps
- `@base-ui/react` — already in playground deps
- `lucide-react` — already in playground deps
- `clsx` + `tailwind-merge` — already in playground deps

These should be peerDependencies of `@pilotiq/pilotiq`.
