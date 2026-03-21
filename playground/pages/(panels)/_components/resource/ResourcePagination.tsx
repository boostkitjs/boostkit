'use client'

import { navigate } from 'vike/client/router'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import type { PaginationData, PanelI18n } from './ResourceListTypes.js'
import { t } from './ResourceListTypes.js'

/* ── Load More pagination ─────────────────────────────────── */

export function ResourceLoadMore({ pagination, allRecordsCount, hasMorePages, loadMorePending, onLoadMore, i18n }: {
  pagination:       NonNullable<PaginationData>
  allRecordsCount:  number
  hasMorePages:     boolean
  loadMorePending:  boolean
  onLoadMore:       () => void
  i18n:             PanelI18n
}) {
  return (
    <div className="flex flex-col items-center gap-2 mt-4">
      <p className="text-sm text-muted-foreground">
        {t(i18n.showing, { n: allRecordsCount, total: pagination.total })}
      </p>
      {hasMorePages && (
        <button
          onClick={onLoadMore}
          disabled={loadMorePending}
          className="px-6 py-2 text-sm font-medium rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
        >
          {loadMorePending ? i18n.loading : i18n.loadMore}
        </button>
      )}
    </div>
  )
}

/* ── Page-based pagination ────────────────────────────────── */

export function ResourcePagePagination({ pagination, perPageOptions, i18n }: {
  pagination:     NonNullable<PaginationData>
  perPageOptions: number[]
  i18n:           PanelI18n
}) {
  function goToPage(p: number) {
    const url = new URL(window.location.href)
    url.searchParams.set('page', String(p))
    void navigate(url.pathname + url.search)
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {pagination.lastPage > 1
            ? t(i18n.page, { current: pagination.currentPage, last: pagination.lastPage })
            : t(i18n.records, { n: pagination.total })}
        </p>
        {/* Per-page selector */}
        <Select
          value={String(pagination.perPage)}
          onValueChange={(val) => {
            if (!val) return
            const url = new URL(window.location.href)
            url.searchParams.set('perPage', val)
            url.searchParams.delete('page')
            void navigate(url.pathname + url.search)
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {perPageOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>{t(i18n.perPage, { n })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {pagination.lastPage > 1 && (
        <div className="flex gap-1">
          {Array.from({ length: pagination.lastPage }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={[
                'w-8 h-8 text-sm rounded-md transition-colors',
                p === pagination.currentPage
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              ].join(' ')}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
