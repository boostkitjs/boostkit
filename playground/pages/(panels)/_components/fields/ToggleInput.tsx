import { Switch } from '@base-ui-components/react/switch'
import type { FieldInputProps } from './types.js'

export function ToggleInput({ field, value, onChange, disabled = false }: FieldInputProps) {
  const isDisabled = disabled || field.readonly
  const checked  = !!value
  const onLabel  = (field.extra?.onLabel  as string) ?? 'On'
  const offLabel = (field.extra?.offLabel as string) ?? 'Off'
  return (
    <div className="flex items-center gap-3">
      <Switch.Root
        checked={checked}
        onCheckedChange={(c) => !isDisabled && onChange(c)}
        disabled={isDisabled}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          checked ? 'bg-primary' : 'bg-muted',
          isDisabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <Switch.Thumb
          className={[
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </Switch.Root>
      <span className="text-sm text-muted-foreground">
        {checked ? onLabel : offLabel}
      </span>
    </div>
  )
}
