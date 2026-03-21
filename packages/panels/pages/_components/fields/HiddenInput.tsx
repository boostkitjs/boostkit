import type { FieldInputProps } from './types.js'

export function HiddenInput({ field, value }: FieldInputProps) {
  return (
    <input
      type="hidden"
      name={field.name}
      value={String((value ?? field.extra?.default) ?? '')}
    />
  )
}
