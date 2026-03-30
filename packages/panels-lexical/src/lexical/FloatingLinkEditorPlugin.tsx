import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection, $isRangeSelection,
  SELECTION_CHANGE_COMMAND, COMMAND_PRIORITY_LOW, COMMAND_PRIORITY_HIGH,
  KEY_ESCAPE_COMMAND,
} from 'lexical'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import type { LinkNode } from '@lexical/link'
import { mergeRegister, $findMatchingParent } from '@lexical/utils'
import { computePosition, flip, offset, shift, autoUpdate } from '@floating-ui/dom'

function getSelectedLinkNode(): LinkNode | null {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return null
  const node = selection.anchor.getNode()
  const parent = node.getParent()
  if ($isLinkNode(parent)) return parent
  if ($isLinkNode(node)) return node as unknown as LinkNode
  return $findMatchingParent(node, $isLinkNode) as LinkNode | null
}

interface Props {
  /** Shared state: when true, the editor shows the URL input for a new/existing link */
  isEditMode: boolean
  setIsEditMode: (v: boolean) => void
}

export function FloatingLinkEditorPlugin({ isEditMode, setIsEditMode }: Props) {
  const [editor] = useLexicalComposerContext()
  const editorRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [editedUrl, setEditedUrl] = useState('')
  const [isLink, setIsLink] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Update link state when selection changes
  const updateLinkEditor = useCallback(() => {
    const linkNode = editor.getEditorState().read(() => getSelectedLinkNode())
    if (linkNode) {
      const url = linkNode.getURL()
      setLinkUrl(url)
      setEditedUrl(url)
      setIsLink(true)
    } else {
      setLinkUrl('')
      setEditedUrl('')
      setIsLink(false)
      setIsEditMode(false)
    }
  }, [editor, setIsEditMode])

  // Listen for selection changes
  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => { updateLinkEditor() })
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => { updateLinkEditor(); return false },
        COMMAND_PRIORITY_LOW,
      ),
      // Escape closes edit mode
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (isLink) {
            setIsEditMode(false)
            return true
          }
          return false
        },
        COMMAND_PRIORITY_HIGH,
      ),
    )
  }, [editor, updateLinkEditor, isLink, setIsEditMode])

  // Find the link DOM element from the Lexical link node
  const getLinkDomElement = useCallback((): HTMLElement | null => {
    const rootEl = editor.getRootElement()
    if (!rootEl) return null

    let linkDom: HTMLElement | null = null
    editor.getEditorState().read(() => {
      const linkNode = getSelectedLinkNode()
      if (linkNode) {
        linkDom = editor.getElementByKey(linkNode.getKey())
      }
    })
    return linkDom
  }, [editor])

  // Auto-position when visible
  useEffect(() => {
    if (!isLink) {
      cleanupRef.current?.()
      cleanupRef.current = null
      return
    }

    const floatingEl = editorRef.current
    if (!floatingEl) return

    // Wait a frame for the DOM to settle after link creation
    requestAnimationFrame(() => {
      const linkDom = getLinkDomElement()
      if (!linkDom) return

      const update = () => {
        computePosition(linkDom, floatingEl, {
          placement: 'bottom-start',
          strategy: 'fixed',
          middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          floatingEl.style.opacity = '1'
          floatingEl.style.left = `${x}px`
          floatingEl.style.top = `${y}px`
        })
      }

      update()
      cleanupRef.current = autoUpdate(linkDom, floatingEl, update)
    })

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [isLink, isEditMode, editor, getLinkDomElement])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditMode && isLink) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [isEditMode, isLink])

  const handleSubmit = () => {
    if (editedUrl.trim()) {
      const url = editedUrl.trim().startsWith('http') ? editedUrl.trim() : `https://${editedUrl.trim()}`
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
    }
    setIsEditMode(false)
    editor.focus()
  }

  const handleRemove = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    setIsEditMode(false)
    editor.focus()
  }

  if (!isLink) return null

  return createPortal(
    <div
      ref={editorRef}
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg p-2 w-[320px]"
      style={{ opacity: 0 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {isEditMode ? (
        // Edit mode — URL input
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={editedUrl}
            onChange={(e) => setEditedUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
              if (e.key === 'Escape') { e.preventDefault(); setIsEditMode(false); editor.focus() }
            }}
            placeholder="https://example.com"
            className="flex-1 h-7 rounded border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="h-7 px-2 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => { setIsEditMode(false); editor.focus() }}
            className="h-7 px-1.5 rounded text-xs text-muted-foreground hover:bg-accent/50"
          >
            ✕
          </button>
        </div>
      ) : (
        // View mode — show URL + edit/remove buttons
        <div className="flex items-center gap-1.5">
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-xs text-primary truncate hover:underline"
          >
            {linkUrl}
          </a>
          <button
            type="button"
            onClick={() => { setIsEditMode(true) }}
            className="h-6 px-1.5 rounded text-xs text-muted-foreground hover:bg-accent/50"
            title="Edit link"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="h-6 px-1.5 rounded text-xs text-destructive hover:bg-destructive/10"
            title="Remove link"
          >
            ✕
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
