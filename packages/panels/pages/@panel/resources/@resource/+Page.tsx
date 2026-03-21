'use client'

import { useState, useEffect, useRef } from 'react'
import { useData }   from 'vike-react/useData'
import { useConfig } from 'vike-react/useConfig'
import { navigate } from 'vike/client/router'
import { toast } from 'sonner'
import { ConfirmDialog } from '../../../_components/ConfirmDialog.js'
import { useLiveTable } from '../../../_hooks/useLiveTable.js'
import { flattenFields, t } from '../../../_components/resource/ResourceListTypes.js'
import type { SchemaItem, ActionMeta } from '../../../_components/resource/ResourceListTypes.js'
import { ResourceHeader, ResourceListTabs, TrashedBanner } from '../../../_components/resource/ResourceHeader.js'
import { ResourceToolbar } from '../../../_components/resource/ResourceToolbar.js'
import { ResourceBulkActions } from '../../../_components/resource/ResourceBulkActions.js'
import { ResourceTable } from '../../../_components/resource/ResourceTable.js'
import { ResourceLoadMore, ResourcePagePagination } from '../../../_components/resource/ResourcePagination.js'
import type { Data } from './+data.js'

export default function ResourceListPage() {
  const config = useConfig()
  const { panelMeta, resourceMeta, records, pagination, pathSegment, slug, urlSearch } = useData<Data>()
  const panelName = panelMeta.branding?.title ?? panelMeta.name
  const i18n = panelMeta.i18n
  config({ title: `${resourceMeta.label} — ${panelName}` })

  const [selected,       setSelected]       = useState<string[]>([])
  const [confirm,        setConfirm]        = useState<{ action: ActionMeta; records: unknown[] } | null>(null)
  const [actionPending,  setActionPending]  = useState(false)
  const [bulkDeletePending,     setBulkDeletePending]     = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)

  // ── Load-more state ──────────────────────────────────
  const isLoadMore = resourceMeta.paginationType === 'loadMore'
  const [extraRecords,     setExtraRecords]     = useState<unknown[]>([])
  const [loadMorePending,  setLoadMorePending]  = useState(false)
  const allRecords = isLoadMore ? [...(records as unknown[]), ...extraRecords] : records as unknown[]
  const hasMorePages = isLoadMore && pagination != null && allRecords.length < pagination.total

  const allFields    = flattenFields(resourceMeta.fields as SchemaItem[])
  const tableFields  = allFields.filter((f) => !f.hidden.includes('table'))
  const sortFields   = allFields.filter((f) => f.sortable)
  const searchFields = allFields.filter((f) => f.searchable)
  const hasSearch    = searchFields.length > 0
  const hasFilters   = resourceMeta.filters.length > 0

  // ── Live table auto-refresh (opt-in via Resource.live) ──
  useLiveTable({ enabled: resourceMeta.live, slug, pathSegment })

  // ── Remember table state (opt-in via Resource.rememberTable) ──
  const storageKey          = `panels:${pathSegment}:${slug}:tableState`
  const selectionStorageKey = `panels:${pathSegment}:${slug}:selected`
  const persist = resourceMeta.rememberTable

  // Compute on every render: does the URL lack params but sessionStorage has saved ones?
  const needsRestore = persist
    && typeof window !== 'undefined'
    && !urlSearch
    && !!sessionStorage.getItem(storageKey)

  // Save params to sessionStorage whenever URL has them
  // In loadMore mode, once extra pages are loaded, handleLoadMore saves the updated URL directly
  // — skip the render-time save to avoid overwriting with stale SSR urlSearch
  // Exclude trashed param from persistence — trash toggle is a view switch, not a filter to restore
  if (persist && typeof window !== 'undefined' && urlSearch && !(isLoadMore && extraRecords.length > 0)) {
    const persistParams = new URLSearchParams(urlSearch)
    persistParams.delete('trashed')
    persistParams.delete('draft')
    const cleanSearch = persistParams.toString()
    if (cleanSearch) {
      sessionStorage.setItem(storageKey, '?' + cleanSearch)
    } else {
      sessionStorage.removeItem(storageKey)
    }
  }

  // Trigger the restore navigation (once per restore)
  const restoredRef = useRef<string | null>(null)
  useEffect(() => {
    if (!needsRestore) return
    const saved = sessionStorage.getItem(storageKey)
    if (saved && restoredRef.current !== storageKey) {
      restoredRef.current = storageKey
      void navigate(`${window.location.pathname}${saved}`, { overwriteLastHistoryEntry: true })
    }
  }) // no deps — runs every render but the ref guard prevents re-firing

  // ── Current URL params (use SSR-provided urlSearch to avoid hydration mismatch) ──
  const urlParams  = new URLSearchParams(urlSearch)
  const currentSort   = urlParams.get('sort') ?? resourceMeta.defaultSort ?? ''
  const currentDir    = (urlParams.get('dir') ?? resourceMeta.defaultSortDir ?? 'ASC') as 'ASC' | 'DESC'
  const currentSearch = urlParams.get('search') ?? ''
  const isTrashed     = urlParams.get('trashed') === 'true'
  const hasActiveFilters = urlParams.has('search') || [...urlParams.keys()].some((k) => k.startsWith('filter['))

  // Reset selection and loadMore state when navigating to a different resource
  const searchRef = useRef<HTMLInputElement>(null)
  const [searchValue, setSearchValue] = useState(currentSearch)
  useEffect(() => {
    // Restore persisted selection for this resource
    if (persist) {
      const saved = sessionStorage.getItem(selectionStorageKey)
      setSelected(saved ? JSON.parse(saved) as string[] : [])
    } else {
      setSelected([])
    }
    setExtraRecords([])
    setSearchValue(currentSearch)  // sync search on resource change
    restoredRef.current = null  // allow restore for the new resource
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist selection changes
  useEffect(() => {
    if (!persist) return
    if (selected.length > 0) sessionStorage.setItem(selectionStorageKey, JSON.stringify(selected))
    else sessionStorage.removeItem(selectionStorageKey)
  }, [selected, persist, selectionStorageKey])

  // In loadMore mode, handle browser back/forward by triggering a full Vike navigation
  useEffect(() => {
    if (!isLoadMore) return
    function onPopState() {
      void navigate(window.location.pathname + window.location.search, { overwriteLastHistoryEntry: true })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isLoadMore, pathSegment, slug])

  // Sync search input from URL on external navigation (back/forward button)
  // but NOT from our own debounced updates (which would overwrite user typing)
  const isOwnSearchRef = useRef(false)
  useEffect(() => {
    if (isOwnSearchRef.current) {
      isOwnSearchRef.current = false
      return
    }
    setSearchValue(currentSearch)
  }, [currentSearch])

  // Reset loadMore accumulated records when SSR data changes (filter/sort/search)
  const recordsRef = useRef(records)
  useEffect(() => {
    if (recordsRef.current !== records) {
      recordsRef.current = records
      setExtraRecords([])
    }
  }, [records, pagination?.currentPage])

  // ── Navigate and persist ──────────────────────────────
  function navigateAndPersist(url: URL) {
    if (persist) {
      const search = url.search || ''
      if (search && search !== '?') sessionStorage.setItem(storageKey, search)
      else sessionStorage.removeItem(storageKey)
    }
    void navigate(url.pathname + url.search)
  }

  // ── Search ────────────────────────────────────────────
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearchChange(value: string) {
    setSearchValue(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      isOwnSearchRef.current = true
      const url = new URL(window.location.href)
      if (value.trim()) url.searchParams.set('search', value.trim())
      else url.searchParams.delete('search')
      url.searchParams.delete('page')
      navigateAndPersist(url)
    }, 150)
  }

  // ── Sort ──────────────────────────────────────────────
  function toggleSort(col: string) {
    const url = new URL(window.location.href)
    url.searchParams.set('sort', col)
    if (currentSort === col) {
      url.searchParams.set('dir', currentDir === 'ASC' ? 'DESC' : 'ASC')
    } else {
      url.searchParams.set('dir', 'ASC')
    }
    url.searchParams.delete('page')
    navigateAndPersist(url)
  }

  // ── Selection helpers ────────────────────────────────
  function toggleAll(checked: boolean) {
    const allIds = (allRecords as Array<{ id: string }>).map((r) => r.id)
    setSelected(checked ? allIds : [])
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    )
  }

  // ── Load more ─────────────────────────────────────────
  async function handleLoadMore() {
    if (!pagination || loadMorePending) return
    const currentCount = (records as unknown[]).length + extraRecords.length
    const nextPage = Math.floor(currentCount / pagination.perPage) + 1
    setLoadMorePending(true)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('page', String(nextPage))
      const res = await fetch(`/${pathSegment}/api/${slug}${url.search}`)
      if (res.ok) {
        const body = await res.json() as { data: unknown[] }
        setExtraRecords((prev) => [...prev, ...body.data])
        window.history.pushState(null, '', url.pathname + url.search)
        if (persist) sessionStorage.setItem(storageKey, url.search)
      }
    } catch { /* ignore */ }
    finally { setLoadMorePending(false) }
  }

  // ── Action handlers ──────────────────────────────────
  async function executeAction(action: ActionMeta, ids?: string[]) {
    setActionPending(true)
    try {
      const res = await fetch(`/${pathSegment}/api/${slug}/_action/${action.name}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: ids ?? selected }),
      })
      if (res.ok) {
        toast.success('Action completed successfully.')
      } else {
        toast.error('Action failed. Please try again.')
      }
      setSelected([])
      void navigate(window.location.pathname + window.location.search, { overwriteLastHistoryEntry: true })
    } catch {
      toast.error('Action failed. Please try again.')
    } finally {
      setActionPending(false)
      setConfirm(null)
    }
  }

  function runAction(action: ActionMeta) {
    if (action.requiresConfirm) {
      const selectedRecords = (records as Array<{ id: string }>).filter((r) => selected.includes(r.id))
      setConfirm({ action, records: selectedRecords })
      return
    }
    void executeAction(action)
  }

  function handleRowAction(action: ActionMeta, record: Record<string, unknown>) {
    if (action.requiresConfirm) {
      setConfirm({ action, records: [record] })
    } else {
      void executeAction(action, [record['id'] as string])
    }
  }

  async function handleBulkRestore() {
    setBulkDeletePending(true)
    try {
      const res = await fetch(`/${pathSegment}/api/${slug}/_restore`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: selected }),
      })
      if (res.ok) {
        toast.success(i18n.restoredRecordToast)
        setSelected([])
        void navigate(window.location.pathname + window.location.search, { overwriteLastHistoryEntry: true })
      } else {
        toast.error(i18n.restoreError ?? 'Failed to restore.')
      }
    } catch {
      toast.error(i18n.restoreError ?? 'Failed to restore.')
    } finally {
      setBulkDeletePending(false)
    }
  }

  async function handleBulkForceDelete() {
    setBulkDeletePending(true)
    try {
      const res = await fetch(`/${pathSegment}/api/${slug}/_force`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: selected }),
      })
      if (res.ok) {
        toast.success(i18n.forceDeletedToast)
        setSelected([])
        void navigate(window.location.pathname + window.location.search, { overwriteLastHistoryEntry: true })
      } else {
        toast.error(i18n.deleteError)
      }
    } catch {
      toast.error(i18n.deleteError)
    } finally {
      setBulkDeletePending(false)
      setBulkDeleteConfirmOpen(false)
    }
  }

  async function handleBulkDelete() {
    setBulkDeletePending(true)
    try {
      const res = await fetch(`/${pathSegment}/api/${slug}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: selected }),
      })
      if (res.ok) {
        toast.success(t(i18n.bulkDeletedToast, { n: selected.length }))
        setSelected([])
        void navigate(window.location.pathname + window.location.search, { overwriteLastHistoryEntry: true })
      } else {
        toast.error(i18n.deleteError)
      }
    } catch {
      toast.error(i18n.deleteError)
    } finally {
      setBulkDeletePending(false)
      setBulkDeleteConfirmOpen(false)
    }
  }

  const bulkActions = resourceMeta.actions.filter((a) => a.bulk)
  const rowActions  = resourceMeta.actions.filter((a) => a.row)

  return (
    <>
      {/* ── Header ──────────────────────────────────────── */}
      <ResourceHeader
        resourceMeta={resourceMeta}
        pagination={pagination}
        pathSegment={pathSegment}
        slug={slug}
        isTrashed={isTrashed}
        i18n={i18n}
      />

      {/* ── Trashed banner ──────────────────────────────── */}
      <TrashedBanner isTrashed={isTrashed} i18n={i18n} />

      {/* ── List tabs ───────────────────────────────────── */}
      {!isTrashed && (
        <ResourceListTabs
          tabs={resourceMeta.tabs}
          pathSegment={pathSegment}
          slug={slug}
          urlParams={urlParams}
          persist={persist}
          storageKey={storageKey}
        />
      )}

      {/* ── Toolbar (search + filters) ──────────────────── */}
      <ResourceToolbar
        hasSearch={hasSearch}
        hasFilters={hasFilters}
        searchValue={searchValue}
        searchRef={searchRef}
        onSearchChange={handleSearchChange}
        filters={resourceMeta.filters}
        urlParams={urlParams}
        pathSegment={pathSegment}
        slug={slug}
        resourceLabel={resourceMeta.label}
        persist={persist}
        storageKey={storageKey}
        i18n={i18n}
      />

      {/* ── Bulk action bar ─────────────────────────────── */}
      <ResourceBulkActions
        selected={selected}
        bulkActions={bulkActions}
        isTrashed={isTrashed}
        actionPending={actionPending}
        bulkDeletePending={bulkDeletePending}
        onRunAction={runAction}
        onBulkRestore={handleBulkRestore}
        onBulkDeleteConfirm={() => setBulkDeleteConfirmOpen(true)}
        onClearSelection={() => setSelected([])}
        i18n={i18n}
      />

      {/* ── Table ───────────────────────────────────────── */}
      <ResourceTable
        allRecords={allRecords}
        tableFields={tableFields}
        sortFields={sortFields}
        allFields={allFields}
        selected={selected}
        currentSort={currentSort}
        currentDir={currentDir}
        isTrashed={isTrashed}
        needsRestore={needsRestore}
        hasActiveFilters={hasActiveFilters}
        resourceMeta={resourceMeta}
        rowActions={rowActions}
        slug={slug}
        pathSegment={pathSegment}
        i18n={i18n}
        onToggleAll={toggleAll}
        onToggleOne={toggleOne}
        onToggleSort={toggleSort}
        onRowAction={handleRowAction}
      />

      {/* ── Pagination ──────────────────────────────────── */}
      {pagination && isLoadMore && (
        <ResourceLoadMore
          pagination={pagination}
          allRecordsCount={allRecords.length}
          hasMorePages={hasMorePages}
          loadMorePending={loadMorePending}
          onLoadMore={handleLoadMore}
          i18n={i18n}
        />
      )}
      {pagination && !isLoadMore && (
        <ResourcePagePagination
          pagination={pagination}
          perPageOptions={resourceMeta.perPageOptions}
          i18n={i18n}
        />
      )}

      {/* ── Confirm dialogs ─────────────────────────────── */}
      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          onConfirm={() => executeAction(confirm.action)}
          title={confirm.action.label}
          message={confirm.action.confirmMessage ?? i18n.areYouSure}
          danger={confirm.action.destructive}
          confirmLabel={i18n.confirm}
          cancelLabel={i18n.cancel}
        />
      )}
      {bulkDeleteConfirmOpen && (
        <ConfirmDialog
          open
          onClose={() => setBulkDeleteConfirmOpen(false)}
          onConfirm={isTrashed ? handleBulkForceDelete : handleBulkDelete}
          title={isTrashed ? i18n.forceDelete : t(i18n.deleteSelected, { n: selected.length })}
          message={isTrashed ? i18n.forceDeleteConfirm : t(i18n.bulkDeleteConfirm, { n: selected.length })}
          danger
          confirmLabel={i18n.confirm}
          cancelLabel={i18n.cancel}
        />
      )}
    </>
  )
}
