import { Select } from '@base-ui-components/react/select'
import type { FieldInputProps } from './types.js'
import { INPUT_CLS } from './types.js'
import { CheckIcon, ChevronIcon } from './Icons.js'

export function SelectInput({ field, value, onChange, disabled = false }: FieldInputProps) {
  const isDisabled = disabled || field.readonly
  const options = (field.extra?.options ?? []) as Array<{ label: string; value: string } | string>
  const normalised = options.map((o) =>
    typeof o === 'string' ? { label: o, value: o } : o,
  )
  return (
    <Select.Root
      value={value as string}
      onValueChange={(v) => !isDisabled && onChange(v)}
      name={field.name}
      disabled={isDisabled}
    >
      <Select.Trigger className={`${INPUT_CLS} flex items-center justify-between`}>
        <Select.Value>{(value as string) || `Select ${field.label}…`}</Select.Value>
        <Select.Icon className="text-muted-foreground">
          <ChevronIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup className="z-50 min-w-[180px] rounded-md border border-border bg-popover shadow-lg py-1 outline-none">
            {normalised.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground outline-none"
              >
                <Select.ItemIndicator className="text-primary">
                  <CheckIcon />
                </Select.ItemIndicator>
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
