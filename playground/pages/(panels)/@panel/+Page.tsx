'use client'

import { useData }   from 'vike-react/useData'
import { useConfig } from 'vike-react/useConfig'
import { WidgetRenderer } from '../_components/WidgetRenderer.js'
import { DashboardGrid }  from '../_components/DashboardGrid.js'
import type { Data } from './+data.js'

export default function PanelRootPage() {
  const config = useConfig()
  const { panelMeta, schemaData } = useData<Data>()
  const panelName = panelMeta.branding?.title ?? panelMeta.name
  config({ title: panelName })

  const i18n = panelMeta.i18n
  const pathSegment = panelMeta.path.replace(/^\//, '')

  const hasSchema = schemaData && schemaData.length > 0

  return (
    <div className="flex flex-col gap-6">
      {hasSchema && schemaData.map((el, i) => (
        <WidgetRenderer key={i} element={el} panelPath={panelMeta.path} i18n={i18n} />
      ))}

      <DashboardGrid pathSegment={pathSegment} panelPath={panelMeta.path} i18n={i18n} />
    </div>
  )
}
