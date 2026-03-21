import { useState, useEffect } from 'react'
import type { FieldInputProps } from './types.js'
import { INPUT_CLS } from './types.js'

export function BelongsToInput({ field, value, onChange, uploadBase = '', disabled = false, i18n }: FieldInputProps) {
  const isDisabled   = disabled || field.readonly
  const resourceSlug = field.extra?.['resource'] as string | undefined
  const labelField   = (field.extra?.['displayField'] as string) ?? 'name'
  const [opts, setOpts] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!resourceSlug || !uploadBase) { setLoading(false); return }
    fetch(`${uploadBase}/${resourceSlug}/_options?label=${labelField}`)
      .then(r => r.json())
      .then((data) => { setOpts(data as Array<{ value: string; label: string }>); setLoading(false) })
      .catch(() => setLoading(false))
  }, [resourceSlug, labelField, uploadBase])

  return (
    <select
      name={field.name}
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={loading || isDisabled}
      className={INPUT_CLS}
    >
      <option value="">{loading ? i18n.loading : i18n.none}</option>
      {opts.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
