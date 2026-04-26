/**
 * Adapter shape for Tiptap collaborative documents.
 *
 * Tiptap binds to Yjs via `prosemirror-y-binding` (`y-prosemirror`).
 * Collaborative state lives in a `Y.XmlFragment` under a configurable
 * field name (defaults to "default" via Tiptap's `fragmentField` option
 * on the `Collaboration` extension).
 *
 * This subpath is currently a contract-only scaffold. Importing any
 * runtime symbol throws with a clear "not implemented" error so
 * consumers fail loudly instead of seeing silent `undefined`s.
 *
 * See ./README.md (alongside this file in source) for the integration
 * plan and acceptance criteria for the implementation.
 */

import type { Doc as YDoc } from 'yjs'

export interface TiptapAdapterOptions {
  /** Y.XmlFragment field name. Default: 'default' (matches Tiptap's `fragmentField`). */
  fragmentField?: string
}

export interface TiptapNode {
  type:     string
  attrs?:   Record<string, unknown>
  content?: TiptapNode[]
  text?:    string
  marks?:   Array<{ type: string; attrs?: Record<string, unknown> }>
}

export interface TiptapTextEdit {
  /** Inclusive start position in the document. */
  from:    number
  /** Exclusive end position. */
  to:      number
  /** Text to insert. Empty string = pure deletion. */
  insert:  string
}

export interface TiptapAiCursor {
  /** Caret position. */
  cursor?:    number
  /** Anchored selection range. */
  selection?: [from: number, to: number]
}

const NOT_IMPLEMENTED =
  '@rudderjs/sync/tiptap: adapter is scaffolded but not yet implemented. ' +
  'See packages/sync/src/tiptap/README.md or ' +
  'docs/plans/2026-04-26-rename-live-to-sync.md (Phase 4 → follow-up plan).'

const stub = ((): never => { throw new Error(NOT_IMPLEMENTED) }) as never

/** Read the document tree as a serialized JSON shape. */
export const readDoc:          (doc: YDoc, opts?: TiptapAdapterOptions) => TiptapNode = stub
/** Insert a node at a ProseMirror position. */
export const insertNode:       (doc: YDoc, position: number, node: TiptapNode, opts?: TiptapAdapterOptions) => void = stub
/** Remove the node at the given position. */
export const removeNode:       (doc: YDoc, position: number, opts?: TiptapAdapterOptions) => void = stub
/** Apply a surgical text edit at the given position. */
export const editText:         (doc: YDoc, edit: TiptapTextEdit, opts?: TiptapAdapterOptions) => void = stub
/** Set AI cursor / selection awareness for the AI client (id 999999999, matching @rudderjs/sync's reserved AI client id). */
export const setAiAwareness:   (doc: YDoc, cursor: TiptapAiCursor, opts?: TiptapAdapterOptions) => void = stub
/** Clear AI awareness. */
export const clearAiAwareness: (doc: YDoc, opts?: TiptapAdapterOptions) => void = stub
