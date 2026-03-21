'use client'

import { useState } from 'react'
import { navigate } from 'vike/client/router'
import { toast } from 'sonner'
import { ResourceIcon } from '../ResourceIcon.js'
import type { ResourceMeta, PanelI18n, TabMeta } from './ResourceListTypes.js'
import { t } from './ResourceListTypes.js'

/* ── CreateDraftButton ────────────────────────────────────── */

function CreateDraftButton({ slug, pathSegment, labelSingular, i18n }: {
  slug: string; pathSegment: string; labelSingular: string; i18n: PanelI18n
}) {
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await fetch(`/${pathSegment}/api/${slug}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ draftStatus: 'draft' }),
      })
      if (res.ok) {
        const body = await res.json() as { data: { id: string } }
        void navigate(`/${pathSegment}/resources/${slug}/${body.data.id}/edit`)
      } else {
        toast.error(i18n.saveError ?? 'Failed to create draft.')
        setCreating(false)
      }
    } catch {
      toast.error(i18n.saveError ?? 'Failed to create draft.')
      setCreating(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={creating}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
    >
      {creating ? i18n.loading : t(i18n.newButton, { label: labelSingular })}
    </button>
  )
}

/* ── ResourceListTabs ─────────────────────────────────────── */

export function ResourceListTabs({ tabs, pathSegment, slug, urlParams, persist, storageKey }: {
  tabs:        TabMeta[]
  pathSegment: string
  slug:        string
  urlParams:   URLSearchParams
  persist:     boolean
  storageKey:  string
}) {
  if (tabs.length === 0) return null

  const activeTab  = urlParams.get('tab') ?? ''
  const firstTab   = tabs[0]?.name ?? ''
  const basePath   = `/${pathSegment}/resources/${slug}`

  function switchTab(name: string) {
    const url = new URL(basePath, 'http://localhost')
    if (name !== firstTab) url.searchParams.set('tab', name)
    if (persist) {
      const search = url.search || ''
      if (search && search !== '?') sessionStorage.setItem(storageKey, search)
      else sessionStorage.removeItem(storageKey)
    }
    void navigate(url.pathname + url.search)
  }

  return (
    <div className="flex items-center gap-1 mb-4">
      {tabs.map((tab) => {
        const isActive = tab.name === activeTab || (!activeTab && tab.name === firstTab)
        return (
          <button
            key={tab.name}
            type="button"
            onClick={() => switchTab(tab.name)}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            ].join(' ')}
          >
            {tab.icon && <ResourceIcon icon={tab.icon} className="size-4" />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── ResourceHeader ───────────────────────────────────────── */

export function ResourceHeader({ resourceMeta, pagination, pathSegment, slug, isTrashed, i18n }: {
  resourceMeta: ResourceMeta
  pagination:   { total: number } | null
  pathSegment:  string
  slug:         string
  isTrashed:    boolean
  i18n:         PanelI18n
}) {
  return (
    <div className="flex items-start justify-between mb-5 gap-4">
      <div>
        <h1 className="text-xl font-semibold">
          {resourceMeta.label}
          {isTrashed && <span className="text-muted-foreground ms-2 text-base font-normal">— {i18n.trash}</span>}
        </h1>
        {pagination && (
          <p className="text-sm text-muted-foreground mt-0.5">{t(i18n.records, { n: pagination.total })}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {resourceMeta.softDeletes && (
          <a
            href={isTrashed ? `/${pathSegment}/resources/${slug}` : `/${pathSegment}/resources/${slug}?trashed=true`}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border transition-colors shrink-0',
              isTrashed
                ? 'border-primary text-primary bg-primary/10 hover:bg-primary/20'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            ].join(' ')}
          >
            {isTrashed ? i18n.exitTrash : i18n.viewTrash}
          </a>
        )}
        {!isTrashed && resourceMeta.draftable ? (
          <CreateDraftButton slug={slug} pathSegment={pathSegment} labelSingular={resourceMeta.labelSingular} i18n={i18n} />
        ) : !isTrashed ? (
          <a
            href={`/${pathSegment}/resources/${slug}/create`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity shrink-0"
          >
            {t(i18n.newButton, { label: resourceMeta.labelSingular })}
          </a>
        ) : null}
      </div>
    </div>
  )
}

/* ── TrashedBanner ────────────────────────────────────────── */

export function TrashedBanner({ isTrashed, i18n }: { isTrashed: boolean; i18n: PanelI18n }) {
  if (!isTrashed) return null
  return (
    <div className="mb-4 px-4 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-amber-700 dark:text-amber-400">
      {i18n.trashedBanner}
    </div>
  )
}
