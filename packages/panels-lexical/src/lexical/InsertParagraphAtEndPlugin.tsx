import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createParagraphNode, $getRoot } from 'lexical'

/**
 * Renders a clickable "+" button at the bottom of the editor.
 * Clicking it appends a new paragraph and focuses it.
 * Inspired by PayloadCMS's InsertParagraphAtEndPlugin.
 */
export function InsertParagraphAtEndPlugin() {
  const [editor] = useLexicalComposerContext()

  const onClick = () => {
    editor.update(() => {
      const paragraph = $createParagraphNode()
      $getRoot().append(paragraph)
      paragraph.select()
    })
  }

  return (
    <div
      aria-label="Insert paragraph"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      className="flex items-center justify-center py-2 cursor-pointer opacity-0 hover:opacity-100 transition-opacity group"
    >
      <div className="flex items-center gap-2 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
        <div className="h-px flex-1 bg-current" />
        <span className="text-xs select-none">+</span>
        <div className="h-px flex-1 bg-current" />
      </div>
    </div>
  )
}
