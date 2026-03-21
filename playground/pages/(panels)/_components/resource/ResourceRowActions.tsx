'use client'

import { useState } from 'react'
import { navigate } from 'vike/client/router'
import { toast } from 'sonner'
import { ConfirmDialog } from '../ConfirmDialog.js'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.js'
import type { FieldMeta, ActionMeta, PanelI18n } from './ResourceListTypes.js'
import { t } from './ResourceListTypes.js'

/* ── DeleteRowButton ──────────────────────────────────────── */

export function DeleteRowButton({ slug, id, pathSegment, labelSingular, i18n }: {
  slug: string; id: string; pathSegment: string; labelSingular: string; i18n: PanelI18n
}) {
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    try {
      const res = await fetch(`/${pathSegment}/api/${slug}/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t(i18n.deletedToast, { label: labelSingular }))
      } else {
        toast.error(i18n.deleteError)
      }
    } catch {
      toast.error(i18n.deleteError)
    }
    setOpen(false)
    void navigate(window.location.pathname + window.location.search, { overwriteLastHistoryEntry: true })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
      >
        {i18n.deleteRecord}
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title={i18n.deleteRecord}
        message={i18n.deleteConfirm}
        danger
        confirmLabel={i18n.confirm}
        cancelLabel={i18n.cancel}
      />
    </>
  )
}

/* ── RestoreRowButton ─────────────────────────────────────── */

export function RestoreRowButton({ slug, id, pathSegment, i18n }: {
  slug: string; id: string; pathSegment: string; i18n: PanelI18n
}) {
  const [pending, setPending] = useState(false)

  async function handleRestore() {
    setPending(true)
    try {
      const res = await fetch(`/${pathSegment}/api/${slug}/${id}/_restore`, { method: 'POST' })
      if (res.ok) {
        toast.success(i18n.restoredRecordToast)
      } else {
        toast.error(i18n.restoreError ?? 'Failed to restore.')
      }
    } catch {
      toast.error(i18n.restoreError ?? 'Failed to restore.')
    }
    setPending(false)
    void navigate(window.location.pathname + window.location.search, { overwriteLastHistoryEntry: true })
  }

  return (
    <button
      onClick={handleRestore}
      disabled={pending}
      className="text-xs px-2.5 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
    >
      {i18n.restoreRecord}
    </button>
  )
}

/* ── ForceDeleteRowButton ─────────────────────────────────── */

export function ForceDeleteRowButton({ slug, id, pathSegment, i18n }: {
  slug: string; id: string; pathSegment: string; i18n: PanelI18n
}) {
  const [open, setOpen] = useState(false)

  async function handleForceDelete() {
    try {
      const res = await fetch(`/${pathSegment}/api/${slug}/${id}/_force`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(i18n.forceDeletedToast)
      } else {
        toast.error(i18n.deleteError)
      }
    } catch {
      toast.error(i18n.deleteError)
    }
    setOpen(false)
    void navigate(window.location.pathname + window.location.search, { overwriteLastHistoryEntry: true })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
      >
        {i18n.forceDelete}
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleForceDelete}
        title={i18n.forceDelete}
        message={i18n.forceDeleteConfirm}
        danger
        confirmLabel={i18n.confirm}
        cancelLabel={i18n.cancel}
      />
    </>
  )
}

/* ── DuplicateRowButton ───────────────────────────────────── */

export function DuplicateRowButton({ slug, id, pathSegment, schema, i18n }: {
  slug:        string
  id:          string
  pathSegment: string
  schema:      FieldMeta[]
  i18n:        PanelI18n
}) {
  const [loading, setLoading] = useState(false)

  async function handleDuplicate() {
    setLoading(true)
    try {
      const res  = await fetch(`/${pathSegment}/api/${slug}/${id}`)
      if (!res.ok) { toast.error(i18n.deleteError); return }
      const body = await res.json() as { data: Record<string, unknown> }
      const record = body.data

      const params = new URLSearchParams()

      // Determine which fields auto-generate a slug, so we can suffix their value with " (copy)"
      const slugSourceFields = new Set(
        schema.filter((f) => f.type === 'slug' && f.extra?.['from']).map((f) => String(f.extra?.['from']))
      )

      for (const field of schema) {
        if (field.hidden.includes('create')) continue
        if (field.readonly) continue
        if (field.name === 'id') continue
        if (field.type === 'password' || field.type === 'hidden' || field.type === 'slug') continue

        let val = record[field.name]
        if (val === null || val === undefined) continue

        // Append " (copy)" so the auto-generated slug won't collide with the original
        if (slugSourceFields.has(field.name) && typeof val === 'string') val = `${val} (copy)`

        if (field.type === 'belongsToMany') {
          const items = Array.isArray(val) ? (val as Array<{ id?: string }>) : []
          const ids   = items.map(r => r.id ?? String(r)).filter(Boolean)
          if (ids.length > 0) params.set(`prefill[${field.name}]`, ids.join(','))
        } else if (field.type === 'boolean' || field.type === 'toggle') {
          params.set(`prefill[${field.name}]`, val ? 'true' : 'false')
        } else if (typeof val === 'object') {
          params.set(`prefill[${field.name}]`, JSON.stringify(val))
        } else {
          params.set(`prefill[${field.name}]`, String(val))
        }
      }

      const back = window.location.pathname + window.location.search
      params.set('back', back)

      void navigate(`/${pathSegment}/resources/${slug}/create?${params.toString()}`)
    } catch {
      toast.error(i18n.deleteError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={loading}
      className="text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
    >
      {loading ? i18n.loading : i18n.duplicate}
    </button>
  )
}

/* ── RowActionsCell ────────────────────────────────────────── */

export function RowActionsCell({ record, rowActions, isTrashed, slug, pathSegment, allFields, labelSingular, i18n, onRowAction }: {
  record:          Record<string, unknown>
  rowActions:      ActionMeta[]
  isTrashed:       boolean
  slug:            string
  pathSegment:     string
  allFields:       FieldMeta[]
  labelSingular:   string
  i18n:            PanelI18n
  onRowAction:     (action: ActionMeta, record: Record<string, unknown>) => void
}) {
  const id = record['id'] as string

  return (
    <div className="flex items-center justify-end gap-2">
      {rowActions.map((action) => (
        <Tooltip key={action.name}>
          <TooltipTrigger
            onClick={() => onRowAction(action, record)}
            className={[
              'px-2 py-1 rounded text-xs font-medium transition-colors',
              action.destructive
                ? 'text-destructive hover:bg-destructive/10'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            ].join(' ')}
          >
            {action.icon && <span className="me-1">{action.icon}</span>}
            {action.label}
          </TooltipTrigger>
          <TooltipContent>{action.label}</TooltipContent>
        </Tooltip>
      ))}
      {isTrashed ? (
        <>
          <RestoreRowButton slug={slug} id={id} pathSegment={pathSegment} i18n={i18n} />
          <ForceDeleteRowButton slug={slug} id={id} pathSegment={pathSegment} i18n={i18n} />
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              const back = window.location.pathname + window.location.search
              void navigate(`/${pathSegment}/resources/${slug}/${id}/edit?back=${encodeURIComponent(back)}`)
            }}
            className="text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {i18n.edit}
          </button>
          <DuplicateRowButton
            slug={slug}
            id={id}
            pathSegment={pathSegment}
            schema={allFields}
            i18n={i18n}
          />
          <DeleteRowButton slug={slug} id={id} pathSegment={pathSegment} labelSingular={labelSingular} i18n={i18n} />
        </>
      )}
    </div>
  )
}
