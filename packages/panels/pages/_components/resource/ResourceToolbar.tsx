'use client'

import { navigate } from 'vike/client/router'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { ResourceIcon } from '../ResourceIcon.js'
import type { FilterMeta, PanelI18n } from './ResourceListTypes.js'
import { t } from './ResourceListTypes.js'

export function ResourceToolbar({ hasSearch, hasFilters, searchValue, searchRef, onSearchChange, filters, urlParams, pathSegment, slug, resourceLabel, persist, storageKey, i18n }: {
  hasSearch:      boolean
  hasFilters:     boolean
  searchValue:    string
  searchRef:      React.RefObject<HTMLInputElement | null>
  onSearchChange: (value: string) => void
  filters:        FilterMeta[]
  urlParams:      URLSearchParams
  pathSegment:    string
  slug:           string
  resourceLabel:  string
  persist:        boolean
  storageKey:     string
  i18n:           PanelI18n
}) {
  if (!hasSearch && !hasFilters) return null

  const currentSearch = urlParams.get('search') ?? ''

  function applyFilter(name: string, value: string) {
    const url = new URL(window.location.href)
    if (value) url.searchParams.set(`filter[${name}]`, value)
    else url.searchParams.delete(`filter[${name}]`)
    url.searchParams.delete('page')
    if (persist) {
      const search = url.search || ''
      if (search && search !== '?') sessionStorage.setItem(storageKey, search)
      else sessionStorage.removeItem(storageKey)
    }
    void navigate(url.pathname + url.search)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">

      {/* Search */}
      {hasSearch && (
        <div className="relative">
          <ResourceIcon icon="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            name="search"
            value={searchValue}
            placeholder={t(i18n.search, { label: resourceLabel.toLowerCase() })}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            className="h-9 pl-8 pr-8 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[220px]"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ResourceIcon icon="x" className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* Select filters */}
      {filters.map((filter) => {
        if (filter.type !== 'select') return null
        const options = (filter.extra['options'] ?? []) as Array<{ label: string; value: string | number | boolean }>
        const current = urlParams.get(`filter[${filter.name}]`) ?? ''
        return (
          <Select
            key={filter.name}
            value={current || null}
            onValueChange={(val) => applyFilter(filter.name, val ?? '')}
          >
            <SelectTrigger>
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{filter.label}</SelectItem>
              {options.map((o) => (
                <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      })}

      {/* Clear filters link */}
      {(currentSearch || filters.some(f => urlParams.has(`filter[${f.name}]`))) && (
        <a
          href={`/${pathSegment}/resources/${slug}`}
          onClick={(e) => {
            e.preventDefault()
            if (persist) sessionStorage.removeItem(storageKey)
            void navigate(`/${pathSegment}/resources/${slug}`)
          }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {i18n.clearFilters}
        </a>
      )}

    </div>
  )
}
