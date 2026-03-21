import type { FieldInputProps } from './types.js'
import { INPUT_CLS } from './types.js'

export function PasswordInput({ field, value, onChange, disabled = false, i18n }: FieldInputProps) {
  const isDisabled = disabled || field.readonly
  return (
    <div className="flex flex-col gap-2">
      <input
        type="password"
        name={field.name}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        disabled={isDisabled}
        placeholder="••••••••"
        autoComplete="new-password"
        className={INPUT_CLS}
      />
      {!!field.extra?.confirm && (
        <input
          type="password"
          name={`${field.name}_confirmation`}
          placeholder={i18n.confirmPassword}
          autoComplete="new-password"
          className={INPUT_CLS}
        />
      )}
    </div>
  )
}
