'use client'

import { ResourceIcon } from '../ResourceIcon.js'
import type { ResourceMeta, PanelI18n } from './ResourceListTypes.js'
import { t } from './ResourceListTypes.js'

export function ResourceEmptyState({ hasActiveFilters, resourceMeta, pathSegment, slug, i18n }: {
  hasActiveFilters: boolean
  resourceMeta:     ResourceMeta
  pathSegment:      string
  slug:             string
  i18n:             PanelI18n
}) {
  if (hasActiveFilters) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
          <ResourceIcon icon="search" className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{i18n.noResultsTitle}</p>
        <p className="text-sm text-muted-foreground">{i18n.noResultsHint}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
        <ResourceIcon icon={resourceMeta.emptyStateIcon ?? resourceMeta.icon} className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">
        {resourceMeta.emptyStateHeading
          ? t(resourceMeta.emptyStateHeading, { label: resourceMeta.label })
          : t(i18n.noRecordsTitle, { label: resourceMeta.label })}
      </p>
      {resourceMeta.emptyStateDescription && (
        <p className="text-sm text-muted-foreground">{resourceMeta.emptyStateDescription}</p>
      )}
      <a
        href={`/${pathSegment}/resources/${slug}/create`}
        className="text-sm text-primary hover:underline"
      >
        {t(i18n.createFirstLink, { singular: resourceMeta.labelSingular })}
      </a>
    </div>
  )
}
