'use client'

import { Checkbox } from '@base-ui-components/react/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.js'
import { CellValue, resolveCellValue } from '../CellValue.js'
import { InlineEditCell } from '../InlineEditCell.js'
import { ResourceEmptyState } from './ResourceEmptyState.js'
import { RowActionsCell } from './ResourceRowActions.js'
import type { FieldMeta, ActionMeta, ResourceMeta, PanelI18n } from './ResourceListTypes.js'

/* ── Small icons ──────────────────────────────────────────── */

function SortIcon({ active, dir }: { active: boolean; dir: 'ASC' | 'DESC' }) {
  return (
    <svg
      width="10" height="12" viewBox="0 0 10 12" fill="none"
      className={active ? 'opacity-100' : 'opacity-30'}
    >
      {/* Up arrow */}
      <path
        d="M5 1L2 4h6L5 1Z"
        fill="currentColor"
        opacity={!active || dir === 'ASC' ? 1 : 0.3}
      />
      {/* Down arrow */}
      <path
        d="M5 11L2 8h6L5 11Z"
        fill="currentColor"
        opacity={!active || dir === 'DESC' ? 1 : 0.3}
      />
    </svg>
  )
}

function MiniCheckIcon() {
  return (
    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
      <path d="M1 3.5L3 5.5L8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── ResourceTable ────────────────────────────────────────── */

export function ResourceTable({ allRecords, tableFields, sortFields, allFields, selected, currentSort, currentDir, isTrashed, needsRestore, hasActiveFilters, resourceMeta, rowActions, slug, pathSegment, i18n, onToggleAll, onToggleOne, onToggleSort, onRowAction }: {
  allRecords:       unknown[]
  tableFields:      FieldMeta[]
  sortFields:       FieldMeta[]
  allFields:        FieldMeta[]
  selected:         string[]
  currentSort:      string
  currentDir:       'ASC' | 'DESC'
  isTrashed:        boolean
  needsRestore:     boolean
  hasActiveFilters: boolean
  resourceMeta:     ResourceMeta
  rowActions:       ActionMeta[]
  slug:             string
  pathSegment:      string
  i18n:             PanelI18n
  onToggleAll:      (checked: boolean) => void
  onToggleOne:      (id: string, checked: boolean) => void
  onToggleSort:     (col: string) => void
  onRowAction:      (action: ActionMeta, record: Record<string, unknown>) => void
}) {
  const allIds      = (allRecords as Array<{ id: string }>).map((r) => r.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id))

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-10 px-4 py-3">
              <Checkbox.Root
                checked={allSelected}
                onCheckedChange={onToggleAll}
                className="h-4 w-4 rounded border-2 border-input bg-background flex items-center justify-center data-[checked]:bg-primary data-[checked]:border-primary focus:outline-none cursor-pointer"
              >
                <Checkbox.Indicator className="text-primary-foreground">
                  <MiniCheckIcon />
                </Checkbox.Indicator>
              </Checkbox.Root>
            </TableHead>
            {tableFields.map((f) => {
              const sortable = sortFields.some(s => s.name === f.name)
              const isSorted = currentSort === f.name
              return (
                <TableHead
                  key={f.name}
                  className={[
                    'px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide',
                    sortable ? 'cursor-pointer select-none hover:text-foreground transition-colors' : '',
                  ].join(' ')}
                  onClick={sortable ? () => onToggleSort(f.name) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {f.label}
                    {sortable && (
                      <SortIcon active={isSorted} dir={currentDir} />
                    )}
                  </span>
                </TableHead>
              )
            })}
            <TableHead className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {i18n.actions}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {needsRestore ? (
            <TableRow><TableCell colSpan={tableFields.length + 2} className="px-6 py-12 text-center text-muted-foreground text-sm">Loading...</TableCell></TableRow>
          ) : (<>
          {(allRecords as Array<Record<string, unknown>>).map((record) => {
            const id       = record['id'] as string
            const isChecked = selected.includes(id)
            return (
              <TableRow
                key={id}
                className={['transition-colors hover:bg-muted/30', isChecked ? 'bg-primary/5' : ''].join(' ')}
              >
                <TableCell className="px-4 py-3">
                  <Checkbox.Root
                    checked={isChecked}
                    onCheckedChange={(checked) => onToggleOne(id, !!checked)}
                    className="h-4 w-4 rounded border-2 border-input bg-background flex items-center justify-center data-[checked]:bg-primary data-[checked]:border-primary focus:outline-none cursor-pointer"
                  >
                    <Checkbox.Indicator className="text-primary-foreground">
                      <MiniCheckIcon />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                </TableCell>
                {tableFields.map((f, fi) => (
                  <TableCell key={f.name} className="px-4 py-3 text-foreground">
                    {fi === 0
                      ? (
                        <span className="inline-flex items-center gap-2">
                          <a
                            href={`/${pathSegment}/resources/${slug}/${id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            <CellValue value={resolveCellValue(record, f)} type={f.type} extra={f.extra} displayTransformed={f.displayTransformed} pathSegment={pathSegment} i18n={i18n} />
                          </a>
                          {resourceMeta.draftable && record['draftStatus'] === 'draft' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              {i18n.draft ?? 'Draft'}
                            </span>
                          )}
                        </span>
                      )
                      : f.extra?.['inlineEditable'] && !isTrashed
                        ? <InlineEditCell record={record} field={f} slug={slug} pathSegment={pathSegment} i18n={i18n} />
                        : <CellValue value={resolveCellValue(record, f)} type={f.type} extra={f.extra} displayTransformed={f.displayTransformed} pathSegment={pathSegment} i18n={i18n} />
                    }
                  </TableCell>
                ))}
                <TableCell className="px-4 py-3 text-end">
                  <RowActionsCell
                    record={record}
                    rowActions={rowActions}
                    isTrashed={isTrashed}
                    slug={slug}
                    pathSegment={pathSegment}
                    allFields={allFields}
                    labelSingular={resourceMeta.labelSingular}
                    i18n={i18n}
                    onRowAction={onRowAction}
                  />
                </TableCell>
              </TableRow>
            )
          })}
          {allRecords.length === 0 && (
            <TableRow>
              <TableCell colSpan={tableFields.length + 2} className="py-16 text-center">
                <ResourceEmptyState
                  hasActiveFilters={hasActiveFilters}
                  resourceMeta={resourceMeta}
                  pathSegment={pathSegment}
                  slug={slug}
                  i18n={i18n}
                />
              </TableCell>
            </TableRow>
          )}
          </>)}
        </TableBody>
      </Table>
    </div>
  )
}
