'use client'

import type { ActionMeta, PanelI18n } from './ResourceListTypes.js'
import { t } from './ResourceListTypes.js'

export function ResourceBulkActions({ selected, bulkActions, isTrashed, actionPending, bulkDeletePending, onRunAction, onBulkRestore, onBulkDeleteConfirm, onClearSelection, i18n }: {
  selected:             string[]
  bulkActions:          ActionMeta[]
  isTrashed:            boolean
  actionPending:        boolean
  bulkDeletePending:    boolean
  onRunAction:          (action: ActionMeta) => void
  onBulkRestore:        () => void
  onBulkDeleteConfirm:  () => void
  onClearSelection:     () => void
  i18n:                 PanelI18n
}) {
  if (selected.length === 0) return null

  return (
    <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
      <span className="text-sm font-medium">{t(i18n.selected, { n: selected.length })}</span>
      <div className="flex gap-2">
        {bulkActions.map((action) => (
          <button
            key={action.name}
            onClick={() => onRunAction(action)}
            disabled={actionPending || bulkDeletePending}
            className={[
              'px-3 py-1 text-sm rounded-md font-medium transition-colors disabled:opacity-50',
              action.destructive
                ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                : 'bg-primary/10 text-primary hover:bg-primary/20',
            ].join(' ')}
          >
            {action.label}
          </button>
        ))}
        {isTrashed ? (
          <>
            <button
              onClick={onBulkRestore}
              disabled={actionPending || bulkDeletePending}
              className="px-3 py-1 text-sm rounded-md font-medium transition-colors disabled:opacity-50 bg-primary/10 text-primary hover:bg-primary/20"
            >
              {bulkDeletePending ? i18n.loading : i18n.bulkRestore}
            </button>
            <button
              onClick={onBulkDeleteConfirm}
              disabled={actionPending || bulkDeletePending}
              className="px-3 py-1 text-sm rounded-md font-medium transition-colors disabled:opacity-50 bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              {bulkDeletePending ? i18n.loading : i18n.bulkForceDelete}
            </button>
          </>
        ) : (
          <button
            onClick={onBulkDeleteConfirm}
            disabled={actionPending || bulkDeletePending}
            className="px-3 py-1 text-sm rounded-md font-medium transition-colors disabled:opacity-50 bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            {bulkDeletePending ? i18n.loading : t(i18n.deleteSelected, { n: selected.length })}
          </button>
        )}
      </div>
      <button
        onClick={onClearSelection}
        className="ms-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {i18n.clearSelection}
      </button>
    </div>
  )
}
