'use client'

import { useState, useEffect } from 'react'
import { useData } from 'vike-react/useData'
import { navigate } from 'vike/client/router'
import { toast } from 'sonner'
import { AdminLayout } from '../../../_components/AdminLayout.js'
import { Breadcrumbs } from '../../../_components/Breadcrumbs.js'
import { FieldInput } from '../../../_components/FieldInput.js'
import type { Data } from './+data.js'

function generateSlug(str: string): string {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CreatePage() {
  const { panelMeta, resourceMeta, pathSegment, slug } = useData<Data>()

  const formFields = resourceMeta.fields.filter((f) => !f.hidden.includes('create'))
  const initialValues: Record<string, unknown> = Object.fromEntries(formFields.map((f) => [f.name, '']))
  // Initialize hidden fields with their defaults
  for (const hf of resourceMeta.fields.filter((f) => f.type === 'hidden')) {
    if (initialValues[hf.name] === undefined && hf.extra?.['default'] !== undefined) {
      initialValues[hf.name] = hf.extra['default']
    }
  }
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)

  function setValue(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: [] }))
  }

  // Auto-generate slug from source field
  useEffect(() => {
    const slugFields = resourceMeta.fields.filter((f) => f.type === 'slug' && f.extra?.['from'])
    for (const slugField of slugFields) {
      const sourceField = String(slugField.extra?.['from'] ?? '')
      const sourceValue = String(values[sourceField] ?? '')
      const currentSlug = String(values[slugField.name] ?? '')
      if (!currentSlug || currentSlug === generateSlug(currentSlug)) {
        setValues((prev) => ({ ...prev, [slugField.name]: generateSlug(sourceValue) }))
      }
    }
  }, [Object.values(values).join(',')])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const res = await fetch(`/${pathSegment}/api/${slug}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(values),
      })
      if (res.status === 422) {
        const body = await res.json() as { errors: Record<string, string[]> }
        setErrors(body.errors)
        return
      }
      if (res.ok) {
        toast.success(`${resourceMeta.labelSingular} created successfully.`)
        void navigate(`/${pathSegment}/${slug}`)
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout panelMeta={panelMeta} currentSlug={slug}>

      <Breadcrumbs crumbs={[
        { label: panelMeta.branding?.title ?? panelMeta.name, href: `/${pathSegment}/${slug}` },
        { label: resourceMeta.label, href: `/${pathSegment}/${slug}` },
        { label: `New ${resourceMeta.labelSingular}` },
      ]} />

      <div className="max-w-2xl">
        <div className="rounded-xl border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {formFields.map((field) => (
              <div key={field.name}>
                {field.type !== 'boolean' && field.type !== 'hidden' && (
                  <label className="block text-sm font-medium mb-1.5">
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </label>
                )}
                <FieldInput field={field} value={values[field.name]} onChange={(v) => setValue(field.name, v)} />
                {errors[field.name]?.map((e) => (
                  <p key={e} className="mt-1 text-xs text-destructive">{e}</p>
                ))}
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving…' : `Create ${resourceMeta.labelSingular}`}
              </button>
              <a
                href={`/${pathSegment}/${slug}`}
                className="px-5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </a>
            </div>
          </form>
        </div>
      </div>

    </AdminLayout>
  )
}
