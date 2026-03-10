'use client'

import { useState } from 'react'
import { useData } from 'vike-react/useData'
import { navigate } from 'vike/client/router'
import { toast } from 'sonner'
import { AdminLayout } from '../../../../_components/AdminLayout.js'
import { Breadcrumbs } from '../../../../_components/Breadcrumbs.js'
import { FieldInput } from '../../../../_components/FieldInput.js'
import type { Data } from './+data.js'

export default function EditPage() {
  const { panelMeta, resourceMeta, record, pathSegment, slug, id } = useData<Data>()

  if (!record) {
    return (
      <AdminLayout panelMeta={panelMeta} currentSlug={slug}>
        <p className="text-muted-foreground">Record not found.</p>
      </AdminLayout>
    )
  }

  const formFields    = resourceMeta.fields.filter((f) => !f.hidden.includes('edit'))
  const initialValues = Object.fromEntries(
    formFields.map((f) => [f.name, (record as Record<string, unknown>)[f.name] ?? '']),
  )
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)

  function setValue(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: [] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const res = await fetch(`/${pathSegment}/api/${slug}/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(values),
      })
      if (res.status === 422) {
        const body = await res.json() as { errors: Record<string, string[]> }
        setErrors(body.errors)
        return
      }
      if (res.ok) {
        toast.success('Changes saved.')
        void navigate(`/${pathSegment}/${slug}`)
      } else {
        toast.error('Failed to save. Please try again.')
      }
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout panelMeta={panelMeta} currentSlug={slug}>

      <Breadcrumbs crumbs={[
        { label: panelMeta.branding?.title ?? panelMeta.name, href: `/${pathSegment}/${slug}` },
        { label: resourceMeta.label, href: `/${pathSegment}/${slug}` },
        { label: `Edit ${resourceMeta.labelSingular}` },
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
                <FieldInput field={field} value={values[field.name]} onChange={(v: unknown) => setValue(field.name, v)} />
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
                {saving ? 'Saving…' : 'Save Changes'}
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
