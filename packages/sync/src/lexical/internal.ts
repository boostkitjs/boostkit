/**
 * Private helpers for the Lexical adapter. Not re-exported from the
 * `@rudderjs/sync/lexical` barrel — these walk the Lexical-Yjs tree shape
 * and have no value outside the adapter's own implementation.
 *
 * Lexical-Yjs tree structure (verified via `sync:inspect`):
 *
 *   root (Y.XmlText)
 *     ├── Y.XmlText (__type="heading", __tag="h1")
 *     │     ├── Y.Map  (__type="text", __format=0)   ← offset += 1
 *     │     └── "hello world"                         ← offset += 11
 *     ├── Y.XmlText (__type="paragraph")
 *     │     ├── Y.XmlElement (custom-block)           ← block! offset += 1
 *     │     ├── Y.Map  (__type="text")                ← offset += 1
 *     │     └── "some text"                           ← offset += 9
 *     ├── Y.XmlText (__type="list")
 *     │     ├── Y.XmlText (list item)                 ← offset += 1
 *     │     └── Y.XmlText (list item)                 ← offset += 1
 *     └── Y.XmlText (__type="quote") ...
 *
 * - Root children are Y.XmlText (NOT Y.XmlElement) — paragraphs, headings, quotes, lists, code
 * - Text content is in string items within each child's inner delta
 * - Y.Map items are TextNode metadata (format, style) — count as offset 1
 * - Y.XmlElement items inside paragraphs are blocks (DecoratorNode) — count as offset 1
 * - Blocks store data as raw objects in __blockData attribute (NOT JSON strings)
 * - Y.XmlText.delete(offset, len) / insert(offset, text) use the flattened offset
 */

import * as Y from 'yjs'
import type { InnerDeltaItem } from './types.js'

/**
 * Walk the root Y.XmlText's children to find a text match.
 *
 * Searches per text run (matching client-side `applyTextOp` behavior).
 * Returns the target Y.XmlText element and the flattened character offset
 * for use with `target.delete(offset, len)` / `target.insert(offset, text)`.
 */
export function findTextInXmlTree(
  root:   Y.XmlText,
  search: string,
): { target: Y.XmlText; offset: number } | null {
  const rootDelta = root.toDelta() as InnerDeltaItem[]

  for (const entry of rootDelta) {
    // Root children are Y.XmlText (paragraphs, headings, quotes, code, lists)
    if (!(entry.insert instanceof Y.XmlText)) continue
    const child = entry.insert as Y.XmlText

    const innerDelta = child.toDelta() as InnerDeltaItem[]
    let offset = 0

    for (const item of innerDelta) {
      if (typeof item.insert === 'string') {
        const idx = item.insert.indexOf(search)
        if (idx !== -1) {
          return { target: child, offset: offset + idx }
        }
        offset += item.insert.length
      } else {
        // Y.Map, Y.XmlElement, Y.XmlText — all count as 1
        offset += 1
      }
    }
  }

  return null
}

/**
 * Find a block (DecoratorNode) by type and index in a Lexical Y.Doc.
 *
 * Blocks are Y.XmlElement items embedded INSIDE paragraph Y.XmlText children
 * (not at the root level). They have attributes:
 *   __type = "custom-block"
 *   __blockType = "callToAction" | "video" | etc.
 *   __blockData = { title: "...", ... }  (raw object, NOT JSON string)
 */
export function findBlockInXmlTree(
  root:       Y.XmlText,
  blockType:  string,
  blockIndex: number,
): Y.XmlElement | null {
  return findBlockWithParentInXmlTree(root, blockType, blockIndex)?.elem ?? null
}

/**
 * Like {@link findBlockInXmlTree} but also returns the parent paragraph
 * Y.XmlText and the paragraph's offset within `root`. Used by `removeBlock`
 * which needs to delete the entire parent paragraph from the root delta.
 */
export function findBlockWithParentInXmlTree(
  root:       Y.XmlText,
  blockType:  string,
  blockIndex: number,
): { elem: Y.XmlElement; parent: Y.XmlText; parentRootOffset: number } | null {
  const rootDelta = root.toDelta() as InnerDeltaItem[]
  let matchIdx   = 0
  let rootOffset = 0

  for (const entry of rootDelta) {
    if (!(entry.insert instanceof Y.XmlText)) {
      rootOffset += 1
      continue
    }
    const child      = entry.insert as Y.XmlText
    const innerDelta = child.toDelta() as InnerDeltaItem[]

    for (const item of innerDelta) {
      if (!(item.insert instanceof Y.XmlElement)) continue
      const elem = item.insert as Y.XmlElement

      if (elem.getAttribute('__blockType') === blockType) {
        if (matchIdx === blockIndex) {
          return { elem, parent: child, parentRootOffset: rootOffset }
        }
        matchIdx++
      }
    }
    rootOffset += 1
  }
  return null
}

/** Encode a varuint (lib0/y-protocols wire format), inlined here so the
 *  adapter doesn't import from the core transport layer. */
export function writeVarUint(val: number): Uint8Array {
  const buf: number[] = []
  while (val > 0x7f) { buf.push((val & 0x7f) | 0x80); val >>>= 7 }
  buf.push(val)
  return new Uint8Array(buf)
}

/** Transaction origin used by all server-side Lexical mutations. Mirrors
 *  the SERVER_ORIGIN constant in the core transport so the WS broadcaster
 *  recognises these updates as server-initiated and forwards them. */
export const SERVER_ORIGIN = 'rudderjs:server'
