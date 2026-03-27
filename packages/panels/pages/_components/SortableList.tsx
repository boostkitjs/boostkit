'use client'

import { useCallback } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Re-exports for SchemaDataView ──────────────────────────

export { arrayMove }
export type { DragEndEvent }

// ─── Grip icon ──────────────────────────────────────────────

function GripIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
      <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
    </svg>
  )
}

// ─── SortableWrapper — wraps a list/grid in DndContext ───────

export function SortableWrapper({ items, onDragEnd, strategy, children }: {
  items:     string[]
  onDragEnd: (event: DragEndEvent) => void
  strategy:  'vertical' | 'grid'
  children:  React.ReactNode
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={strategy === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

// ─── SortableItem — wraps a record row/card ─────────────────

export function SortableItem({ id, children, showHandle }: {
  id:          string
  children:    React.ReactNode
  showHandle?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: 'relative' }}
    >
      {showHandle && (
        <button
          type="button"
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
      )}
      {children}
    </div>
  )
}

// ─── SortableTableRow — wraps a <tr> ────────────────────────

export function SortableTableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
    >
      {children}
    </tr>
  )
}

// ─── TableDragHandle ────────────────────────────────────────

export function TableDragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({ id })
  return (
    <td className="px-1 py-2.5 w-6">
      <button
        type="button"
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
    </td>
  )
}
