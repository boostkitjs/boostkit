import { useState } from 'react'
import type { FieldInputProps } from './types.js'

export function FileInput({ field, value, onChange, uploadBase = '', disabled = false, i18n }: FieldInputProps) {
  const isDisabled    = disabled || field.readonly
  const multiple      = !!(field.extra?.multiple)
  const accept        = (field.extra?.accept    as string) || undefined
  const disk          = (field.extra?.disk      as string) ?? 'local'
  const directory     = (field.extra?.directory as string) ?? 'uploads'
  const shouldOptimize = !!(field.extra?.optimize)
  const fieldConversions = (field.extra?.conversions as Array<Record<string, unknown>>) ?? []
  const urls      = multiple ? (Array.isArray(value) ? (value as string[]) : []) : []
  const singleUrl = !multiple ? (value as string | undefined) : undefined
  const [uploading, setUploading] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const results: string[] = []
      for (const f of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', f)
        fd.append('disk', disk)
        fd.append('directory', directory)
        if (shouldOptimize) fd.append('optimize', 'true')
        if (fieldConversions.length > 0) fd.append('conversions', JSON.stringify(fieldConversions))
        const res = await fetch(`${uploadBase}/_upload`, { method: 'POST', body: fd })
        const { url } = await res.json() as { url: string }
        results.push(url)
      }
      onChange(multiple ? [...urls, ...results] : results[0])
    } catch {
      // upload failed — leave value unchanged
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {field.type === 'image' && singleUrl && (
        <img src={singleUrl} alt="" className="max-h-32 w-auto rounded-md border border-input object-cover" />
      )}
      {field.type === 'image' && urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((u) => (
            <img key={u} src={u} alt="" className="h-20 w-20 rounded-md border border-input object-cover" />
          ))}
        </div>
      )}
      {!field.type.startsWith('image') && singleUrl && (
        <a href={singleUrl} target="_blank" rel="noopener noreferrer"
          className="text-sm text-primary underline break-all">
          {singleUrl.split('/').pop()}
        </a>
      )}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={uploading || isDisabled}
        className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-input file:text-sm file:bg-background file:text-foreground hover:file:bg-accent cursor-pointer disabled:opacity-50"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {uploading && <p className="text-xs text-muted-foreground">{i18n.uploading}</p>}
    </div>
  )
}
