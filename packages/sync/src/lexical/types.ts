/**
 * Shared types for the @rudderjs/sync/lexical adapter.
 *
 * These describe the Yjs delta shape produced by Lexical's `@lexical/yjs`
 * binding when serialising the editor state into a `Y.XmlText` tree. They
 * are not Lexical APIs themselves — the adapter only walks the resulting
 * Yjs tree, so it stays free of a `lexical` peer dependency.
 */

/** A single entry in a `Y.XmlText.toDelta()` result. */
export type InnerDeltaItem = { insert: unknown; attributes?: Record<string, unknown> }

/** Discriminated union of text edit operations supported by `editText` / `editTextBatch`. */
export type LexicalTextOperation =
  | { type: 'replace';      search: string; replace: string }
  | { type: 'insert_after'; search: string; text: string }
  | { type: 'delete';       search: string }

/** AI cursor identity — name + colour shown on the synthetic AI awareness presence. */
export interface LexicalAiCursor {
  name:  string
  color: string
}
