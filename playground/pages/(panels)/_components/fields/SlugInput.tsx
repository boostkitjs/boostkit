import type { FieldInputProps } from './types.js'

export function SlugInput({ field, value, onChange, disabled = false }: FieldInputProps) {
  const isDisabled = disabled || field.readonly
  return (
    <div className="flex items-center rounded-md border border-input bg-muted overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
      <span className="px-3 text-sm text-muted-foreground select-none border-r border-input bg-muted">/</span>
      <input
        type="text"
        name={field.name}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        readOnly={field.readonly}
        disabled={isDisabled}
        placeholder="my-slug"
        className="flex-1 px-3 py-2 text-sm bg-background focus:outline-none disabled:bg-muted disabled:text-muted-foreground"
      />
    </div>
  )
}
