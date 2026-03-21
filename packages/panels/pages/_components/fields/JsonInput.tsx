import { useState } from 'react'
import type { FieldInputProps } from './types.js'
import { INPUT_CLS } from './types.js'

export function JsonInput({ field, value, onChange, disabled = false, i18n }: FieldInputProps) {
  const isDisabled = disabled || field.readonly
  const [jsonError, setJsonError] = useState<string | null>(null)
  const rawValue = typeof value === 'string'
    ? value
    : JSON.stringify(value ?? {}, null, 2)

  return (
    <div className="flex flex-col gap-1">
      <textarea
        name={field.name}
        defaultValue={rawValue}
        rows={(field.extra?.rows as number) ?? 6}
        spellCheck={false}
        disabled={isDisabled}
        className={[INPUT_CLS, 'font-mono text-xs', jsonError ? 'border-destructive' : ''].join(' ')}
        onChange={(e) => {
          try {
            JSON.parse(e.target.value)
            setJsonError(null)
            onChange(e.target.value)
          } catch {
            setJsonError(i18n.invalidJson)
          }
        }}
      />
      {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
    </div>
  )
}
