import { Checkbox } from '@base-ui-components/react/checkbox'
import type { FieldInputProps } from './types.js'
import { CheckIcon } from './Icons.js'

export function BooleanInput({ field, value, onChange, disabled = false }: FieldInputProps) {
  const isDisabled = disabled || field.readonly
  return (
    <div className="flex items-center gap-3">
      <Checkbox.Root
        checked={!!value}
        onCheckedChange={(checked) => !isDisabled && onChange(checked)}
        disabled={isDisabled}
        className="h-5 w-5 rounded border-2 border-input bg-background flex items-center justify-center transition-colors data-[checked]:bg-primary data-[checked]:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Checkbox.Indicator className="text-primary-foreground">
          <CheckIcon />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <span className="text-sm">{field.label}</span>
    </div>
  )
}
