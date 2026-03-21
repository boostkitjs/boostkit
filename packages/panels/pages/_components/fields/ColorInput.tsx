import type { FieldInputProps } from './types.js'

export function ColorInput({ field, value, onChange, disabled = false }: FieldInputProps) {
  const isDisabled = disabled || field.readonly
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        name={field.name}
        value={(value as string) ?? '#000000'}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
        className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <span className="text-sm text-muted-foreground font-mono">
        {(value as string) ?? '#000000'}
      </span>
    </div>
  )
}
