import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createParagraphNode, $getNodeByKey, $getRoot, type LexicalNode } from 'lexical'

/**
 * Floating "+" button that appears when hovering between blocks.
 * Clicking it inserts a new paragraph and focuses it.
 * Inspired by PayloadCMS's AddBlockHandlePlugin.
 */
export function AddBlockHandlePlugin({ anchorElem }: { anchorElem: HTMLElement | null }) {
  const [editor] = useLexicalComposerContext()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [visible, setVisible] = useState(false)
  const [top, setTop] = useState(0)
  const targetKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!anchorElem) return

    const rootElem = editor.getRootElement()
    if (!rootElem) return

    function onMouseMove(e: MouseEvent) {
      if (!rootElem) return

      const rootRect = rootElem.getBoundingClientRect()
      // Only show when mouse is within the editor area
      if (e.clientX < rootRect.left - 40 || e.clientX > rootRect.right + 40 ||
          e.clientY < rootRect.top || e.clientY > rootRect.bottom) {
        setVisible(false)
        return
      }

      // Find the closest gap between top-level nodes
      let bestGap: { y: number; afterKey: string | null } | null = null
      let bestDist = Infinity

      editor.getEditorState().read(() => {
        const root = $getRoot()
        const children = root.getChildren()

        // Gap before first child
        if (children.length > 0) {
          const firstKey = children[0]!.getKey()
          const firstElem = editor.getElementByKey(firstKey)
          if (firstElem) {
            const rect = firstElem.getBoundingClientRect()
            const gapY = rect.top
            const dist = Math.abs(e.clientY - gapY)
            if (dist < bestDist && dist < 20) {
              bestDist = dist
              bestGap = { y: gapY - rootRect.top, afterKey: null }
            }
          }
        }

        // Gaps between children
        for (let i = 0; i < children.length; i++) {
          const child = children[i]!
          const childKey = child.getKey()
          const childElem = editor.getElementByKey(childKey)
          if (!childElem) continue

          const rect = childElem.getBoundingClientRect()
          const gapY = rect.bottom

          const dist = Math.abs(e.clientY - gapY)
          if (dist < bestDist && dist < 20) {
            bestDist = dist
            bestGap = { y: gapY - rootRect.top, afterKey: childKey }
          }
        }
      })

      if (bestGap !== null && bestDist < 20) {
        targetKeyRef.current = (bestGap as { afterKey: string | null }).afterKey
        setTop((bestGap as { y: number }).y)
        setVisible(true)
      } else {
        setVisible(false)
      }
    }

    function onMouseLeave() {
      setVisible(false)
    }

    rootElem.addEventListener('mousemove', onMouseMove)
    rootElem.addEventListener('mouseleave', onMouseLeave)
    return () => {
      rootElem.removeEventListener('mousemove', onMouseMove)
      rootElem.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [editor, anchorElem])

  const handleClick = useCallback(() => {
    editor.update(() => {
      const paragraph = $createParagraphNode()
      const afterKey = targetKeyRef.current

      if (afterKey === null) {
        // Insert before the first child
        const root = $getRoot()
        const firstChild = root.getFirstChild()
        if (firstChild) {
          firstChild.insertBefore(paragraph)
        } else {
          root.append(paragraph)
        }
      } else {
        // Insert after the target node
        const targetNode = $getNodeByKey(afterKey) as LexicalNode | null
        if (targetNode) {
          targetNode.insertAfter(paragraph)
        }
      }

      paragraph.select()
    })
    setVisible(false)
  }, [editor])

  if (!anchorElem) return null

  return createPortal(
    <button
      ref={buttonRef}
      type="button"
      aria-label="Add block"
      onClick={handleClick}
      className="absolute left-0 flex items-center justify-center w-6 h-6 -ml-3 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all z-10"
      style={{
        top: `${top}px`,
        transform: 'translateY(-50%)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <span className="text-xs font-bold leading-none">+</span>
    </button>,
    anchorElem,
  )
}
