import { editorRegistry } from '@boostkit/panels'
import type { FieldInputProps } from './types.js'
import { INPUT_CLS } from './types.js'

export function RichContentInput({ field, value, onChange, disabled = false, userName, userColor, wsPath, docName }: FieldInputProps) {
  const isDisabled = disabled || field.readonly
  const RichEditor = editorRegistry.richcontent
  if (RichEditor) {
    return (
      <RichEditor
        value={value}
        onChange={onChange}
        {...((field.extra?.placeholder as string | undefined) !== undefined ? { placeholder: field.extra?.placeholder as string } : {})}
        disabled={isDisabled}
        wsPath={field.yjs ? (wsPath ?? null) : null}
        docName={field.yjs ? (docName ?? null) : null}
        fragmentName={`richcontent:${field.name}`}
        {...(Array.isArray(field.extra?.['blocks']) ? { blocks: field.extra['blocks'] as unknown[] } : {})}
        {...(userName !== undefined ? { userName } : {})}
        {...(userColor !== undefined ? { userColor } : {})}
      />
    )
  }
  return (
    <textarea
      name={field.name}
      value={typeof value === 'string' ? value : (value ? JSON.stringify(value, null, 2) : '')}
      onChange={(e) => onChange(e.target.value)}
      rows={8}
      disabled={isDisabled}
      placeholder={(field.extra?.placeholder as string) ?? 'Rich content editor not installed. Install @boostkit/panels-lexical for rich editing.'}
      className={INPUT_CLS}
    />
  )
}
