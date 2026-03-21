import type { FieldInputProps } from './types.js'

export function TagsInput({ field, value, onChange, i18n }: FieldInputProps) {
  const tags: string[] = Array.isArray(value) ? (value as string[]) : (typeof value === 'string' && value ? (() => { try { return JSON.parse(value) as string[] } catch { return value.split(',') } })() : [])

  function addTag(input: HTMLInputElement) {
    const tag = input.value.trim().replace(/,+$/, '')
    if (!tag || tags.includes(tag)) { input.value = ''; return }
    onChange([...tags, tag])
    input.value = ''
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-input bg-background min-h-[42px] focus-within:ring-2 focus-within:ring-ring">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="hover:text-destructive leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        placeholder={(field.extra?.placeholder as string) ?? i18n.addTag}
        className="flex-1 min-w-[80px] text-sm outline-none bg-transparent"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag(e.currentTarget)
          }
          if (e.key === 'Backspace' && !e.currentTarget.value && tags.length > 0) {
            onChange(tags.slice(0, -1))
          }
        }}
        onBlur={(e) => addTag(e.currentTarget)}
      />
    </div>
  )
}
