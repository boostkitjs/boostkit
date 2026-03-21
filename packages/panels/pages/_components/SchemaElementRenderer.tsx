'use client'

import { useState, useEffect } from 'react'
import type { PanelSchemaElementMeta, PanelStatMeta, PanelI18n, ChartElementMeta, ChartDataset, ListElementMeta } from '@boostkit/panels'
import { SchemaTable } from './SchemaTable.js'

// Extended type to include custom widget types not in PanelSchemaElementMeta
type SchemaElementRendererElement = PanelSchemaElementMeta
  | { type: 'stat-progress'; data: Record<string, unknown> }
  | { type: 'user-card'; data: Record<string, unknown> }

export interface SchemaElementRendererProps {
  element:    SchemaElementRendererElement
  panelPath:  string
  i18n:       PanelI18n
}

export function SchemaElementRenderer({ element, panelPath, i18n }: SchemaElementRendererProps) {
  if (element.type === 'text') {
    return <p className="text-sm text-muted-foreground">{element.content}</p>
  }

  if (element.type === 'heading') {
    const Tag = (`h${element.level}`) as 'h1' | 'h2' | 'h3'
    const cls = element.level === 1
      ? 'text-2xl font-bold'
      : element.level === 2
      ? 'text-xl font-semibold'
      : 'text-lg font-semibold'
    return <Tag className={cls}>{element.content}</Tag>
  }

  if (element.type === 'code') {
    return <CodeBlock code={element.content} language={element.language} title={element.title} lineNumbers={element.lineNumbers} />
  }

  if (element.type === 'stats') {
    return <StatsRow stats={element.stats} />
  }

  if (element.type === 'chart') {
    return <ChartWidget element={element as ChartElementMeta} />
  }

  if (element.type === 'table') {
    return <SchemaTable element={element} panelPath={panelPath} i18n={i18n} />
  }

  if (element.type === 'list') {
    return <ListWidget element={element as ListElementMeta} />
  }

  if (element.type === 'stat-progress') {
    return <StatProgressWidget data={element.data ?? {}} />
  }

  if (element.type === 'user-card') {
    return <UserCardWidget data={element.data ?? {}} />
  }

  return null
}

function StatCard({ stat }: { stat: PanelStatMeta }) {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-1 h-full">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
      <p className="text-3xl font-bold tabular-nums">{stat.value.toLocaleString()}</p>
      {stat.description && (
        <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
      )}
      {stat.trend !== undefined && (
        <p className={`text-xs font-medium mt-0.5 ${stat.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {stat.trend >= 0 ? '\u2191' : '\u2193'} {Math.abs(stat.trend)}%
        </p>
      )}
    </div>
  )
}

function StatsRow({ stats }: { stats: PanelStatMeta[] }) {
  // Single stat — render directly, filling the container
  if (stats.length === 1 && stats[0]) return <StatCard stat={stats[0]} />

  return (
    <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(stats.length, 4)}`}>
      {stats.map((stat, i) => <StatCard key={i} stat={stat} />)}
    </div>
  )
}

function ChartWidget({ element }: { element: ChartElementMeta }) {
  const [mod, setMod] = useState<typeof import('recharts') | null>(null)

  useEffect(() => {
    import('recharts').then(setMod).catch(() => {})
  }, [])

  if (!mod) {
    return (
      <div className="rounded-xl border bg-card p-5" style={{ height: element.height }}>
        <p className="text-sm font-semibold mb-3">{element.title}</p>
        <div className="h-full animate-pulse bg-muted/30 rounded-lg" />
      </div>
    )
  }

  const { ResponsiveContainer, LineChart, BarChart, PieChart, AreaChart, Line, Bar, Pie, Area, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend } = mod
  const colors = ['hsl(var(--primary))', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  // Pie / Doughnut
  if (element.chartType === 'pie' || element.chartType === 'doughnut') {
    const pieData = element.labels.map((label: string, i: number) => ({
      name: label,
      value: element.datasets[0]?.data[i] ?? 0,
    }))
    return (
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-semibold mb-3">{element.title}</p>
        <ResponsiveContainer width="100%" height={element.height}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={element.chartType === 'doughnut' ? '60%' : 0}
              outerRadius="80%"
              paddingAngle={2}
            >
              {pieData.map((_: unknown, i: number) => (
                <Cell key={i} fill={(element.datasets[0]?.color ?? colors[i % colors.length]) as string} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Line / Bar / Area
  const data = element.labels.map((label: string, i: number) => {
    const point: Record<string, unknown> = { name: label }
    for (const ds of element.datasets) {
      point[ds.label] = ds.data[i] ?? 0
    }
    return point
  })

  const ChartComp = element.chartType === 'bar' ? BarChart
    : element.chartType === 'area' ? AreaChart
    : LineChart

  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm font-semibold mb-3">{element.title}</p>
      <ResponsiveContainer width="100%" height={element.height}>
        <ChartComp data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          {element.datasets.length > 1 && <Legend />}
          {element.datasets.map((ds: ChartDataset, i: number) => {
            const color = ds.color ?? colors[i % colors.length]
            if (element.chartType === 'bar') {
              return <Bar key={ds.label} dataKey={ds.label} fill={color} radius={[4, 4, 0, 0]} />
            }
            if (element.chartType === 'area') {
              // @ts-expect-error — recharts types don't handle exactOptionalPropertyTypes
              return <Area key={ds.label} type="monotone" dataKey={ds.label} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
            }
            // @ts-expect-error — recharts types don't handle exactOptionalPropertyTypes
            return <Line key={ds.label} type="monotone" dataKey={ds.label} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
          })}
        </ChartComp>
      </ResponsiveContainer>
    </div>
  )
}

function ListWidget({ element }: { element: ListElementMeta }) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="px-5 py-3 border-b bg-muted/40">
        <p className="text-sm font-semibold">{element.title}</p>
      </div>
      {element.items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">No items.</p>
      ) : (
        <ul className="divide-y">
          {element.items.map((item, i) => (
            <li key={i} className="px-5 py-3 flex items-start gap-3">
              {item.icon && <span className="text-base shrink-0 mt-0.5">{item.icon}</span>}
              <div className="flex-1 min-w-0">
                {item.href ? (
                  <a href={item.href} className="text-sm font-medium hover:text-primary transition-colors">
                    {item.label}
                  </a>
                ) : (
                  <p className="text-sm font-medium">{item.label}</p>
                )}
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatProgressWidget({ data }: { data: Record<string, unknown> }) {
  const value = Number(data?.value ?? 0)
  const max = Number(data?.max ?? 100)
  const label = String(data?.label ?? '')
  const pct = max > 0 ? (value / max) * 100 : 0
  const color = String(data?.color ?? 'hsl(var(--primary))')

  // SVG circular progress
  const radius = 15.9155
  const circumference = 2 * Math.PI * radius

  return (
    <div className="rounded-xl border bg-card p-5 h-full flex items-center gap-4">
      <svg viewBox="0 0 36 36" className="w-14 h-14 shrink-0 -rotate-90">
        <circle
          cx="18" cy="18" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/20"
        />
        <circle
          cx="18" cy="18" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}<span className="text-sm font-normal text-muted-foreground">/{max}</span></p>
        {label && <p className="text-xs text-muted-foreground mt-0.5">{label}</p>}
      </div>
    </div>
  )
}

function CodeBlock({ code, language, title, lineNumbers }: { code: string; language?: string; title?: string; lineNumbers?: boolean }) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    import('shiki').then(async ({ codeToHtml }) => {
      if (cancelled) return
      const result = await codeToHtml(code, {
        lang: language ?? 'text',
        themes: {
          light: 'github-light',
          dark: 'github-dark-high-contrast',
        },
        defaultColor: false,
      })
      if (!cancelled) setHtml(result)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [code, language])

  const lines = code.split('\n')

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {title && (
        <div className="px-4 py-2 border-b bg-muted/40 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <button
            type="button"
            onClick={() => { void navigator.clipboard.writeText(code) }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Copy"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>
      )}
      <div className="relative">
        {!title && (
          <button
            type="button"
            onClick={() => { void navigator.clipboard.writeText(code) }}
            className="absolute top-2 right-2 text-xs text-muted-foreground hover:text-foreground transition-colors z-10"
            title="Copy"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        )}
        {html ? (
          <div
            className="text-sm [&_pre]:!rounded-none [&_pre]:!m-0 [&_pre]:p-4 [&_pre]:overflow-x-auto [&_span]:!text-[var(--shiki-light)] dark:[&_span]:!text-[var(--shiki-dark)] [&_pre]:!bg-[var(--shiki-light-bg,#fff)] dark:[&_pre]:!bg-[var(--shiki-dark-bg,#24292e)]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="flex text-sm font-mono">
            {lineNumbers && (
              <div className="select-none text-right pr-4 pl-4 py-4 text-muted-foreground/40 border-r border-border/50 bg-muted/20">
                {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
            )}
            <pre className="p-4 overflow-x-auto flex-1"><code>{code}</code></pre>
          </div>
        )}
      </div>
    </div>
  )
}

function UserCardWidget({ data }: { data: Record<string, unknown> }) {
  const name = String(data?.name ?? '')
  const role = String(data?.role ?? '')
  const avatar = data?.avatar as string | undefined
  const href = data?.href as string | undefined
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="rounded-xl border bg-card p-5 h-full flex items-center gap-4">
      {avatar ? (
        <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{name}</p>
        {role && <p className="text-xs text-muted-foreground">{role}</p>}
      </div>
      {href && (
        <a href={href} className="text-xs text-primary hover:underline shrink-0">View</a>
      )}
    </div>
  )
}
