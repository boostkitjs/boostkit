# Selection-Rooted AI Popover Plan

Move text-selection AI editing out of the chat panel and into an inline popover anchored to the selection — same architectural correction the Phase 5 per-field action restoration made for `.ai([...])`, applied to the `✦ Ask AI` button that today appears on text selection in `RichContentInput`, `TextInput`, and `TextareaInput`.

**Status:** READY 2026-04-09. Prerequisite `standalone-client-tools-plan.md` shipped 2026-04-08 — `useAgentRun`, `AiActionProgress`, the standalone endpoint, `BuiltInAiActionRegistry`, and the client-tool round-trip are all in place.

| Phase | Description | LOC est |
|---|---|---|
| 1 | Server: accept `selection` on standalone endpoint, plumb through `PanelAgentContext` | ~80 |
| 2 | Built-in selection actions + selection-aware preamble | ~120 |
| 3 | `SelectionAiPopover` component + `useSelectionAi` hook | ~180 |
| 4 | Wire popover into `FloatingToolbarPlugin` (rich) and `useNativeSelectionAi` (plain) | ~80 |
| 5 | Delete chat-bridge `setSelection` path; cleanup, docs, memory | ~60 |

**Total est:** ~520 LOC across 5 PRs.
**Packages affected:** `@rudderjs/panels` (handlers, agents, frontend hooks/components, fields), `@rudderjs/panels-lexical` (FloatingToolbarPlugin signature only — no behavior change).
**Depends on:** `standalone-client-tools-plan.md` (DONE).
**Blocks:** nothing currently scheduled.
**Related memory:** `project_selection_ai_popover_followup.md`, `feedback_standalone_field_actions_vs_chat.md`, `feedback_inline_over_modal.md`, `reference_panels_ai_surfaces.md`, `feedback_client_tool_for_authoring.md`.

---

## Goal

After this plan, four things are true:

1. **Selecting text in any field shows a popover anchored to the selection, not a button that opens the chat panel.** The popover is rooted to the selection rectangle, follows scroll/resize via `autoUpdate`, and dismisses on outside click or `Escape`.

2. **The popover offers three input modes in one surface:**
   - **Quick action buttons** (`Rewrite`, `Shorten`, `Expand`, `Fix grammar`, `Make formal`, `Simplify`, `Translate…`) — scoped to the *selection*, not the whole field.
   - **Free-form prompt textarea** for one-shot instructions ("translate to French", "make this rhyme") — submit on Enter, Shift+Enter for newline.
   - **"Open in chat" escape hatch** for genuine multi-turn iteration — hands the selection + the entered prompt to `AiChatContext` as a starting message.

3. **Selection actions run on the standalone path with surgical replacement.** The standalone endpoint accepts a `selection: { field, text, start, end }` body parameter; `PanelAgentContext.selection` propagates it; the tool-selection preamble tells the model to call `update_form_state` with a `replace_range` op (or the existing `replace` op scoped to the offsets) so only the selection is rewritten — not the whole field. While running, the popover body switches to the existing `AiActionProgress` component (just like `AiQuickActions` and `FormActions`).

4. **Chat is no longer touched by selection.** `aiChat.setSelection(...)` and the `selection` field on `AiChatContext` are deleted. The only surviving chat-side concept of "context from a selection" is the explicit "Open in chat" handoff, which seeds the chat composer with `> {quoted text}\n\n{prompt}` and clears immediately on send (no persistent selection state).

---

## Non-Goals

- **Replace `FloatingToolbarPlugin` entirely.** Only the `onAskAi` hook point changes. Bold/italic/link controls stay where they are.
- **Build a generic "command palette" inside the popover.** Quick actions are a fixed list pulled from `BuiltInAiActionRegistry` filtered by `appliesTo('selection')`. No fuzzy search, no recently-used, no keyboard navigation between buttons (Tab works because they're real buttons).
- **Persist selection-action history.** Same fire-and-forget model as per-field actions. Undo lives in the editor history, not in a sidebar log.
- **Multi-selection editing.** Popover edits *one* contiguous selection. If the user wants to rewrite three paragraphs into one, they select the whole range or use a resource agent.
- **Block-level selection (richcontent).** Selection means *text* selection. If a user clicks into a builder block and selects nothing, no popover. Block-level AI is a separate surface (`feedback_block_field_detection.md` is the relevant precedent).
- **Migrate the resource-level "AI Agents" dropdown.** That already lives standalone via `FormActions` — out of scope.
- **Voice or image input in the popover.** Text only.

---

## Background

### What's there today (the bridge)

Three field components and one Lexical plugin all funnel selection AI to the chat panel via `aiChat.setSelection`:

| Surface | File | Today |
|---|---|---|
| Plain `TextInput` | `packages/panels/pages/_components/fields/TextInput.tsx:35-48` | `useNativeSelectionAi` shows `✦`, calls `onAskAi(text)`, default impl calls `aiChat.setSelection({ field, text }) + setOpen(true)` |
| `TextareaInput` | `packages/panels/pages/_components/fields/TextareaInput.tsx` | Same pattern |
| `RichContentInput` (Lexical) | `packages/panels/pages/_components/fields/RichContentInput.tsx` | Passes `onAskAi` into `<LexicalEditor>` → `FloatingToolbarPlugin` |
| `FloatingToolbarPlugin` | `packages/panels-lexical/src/lexical/FloatingToolbarPlugin.tsx:138-144` | `handleAskAi()` calls `onAskAi(text)` — never sees offsets |
| Native input hook | `packages/panels/pages/_hooks/useNativeSelectionAi.tsx` | Captures `text` only, drops `selectionStart/End` after the slice |

`AiChatContext` then carries `selection: TextSelection` (`{ field, text }`) into the chat request body until it's cleared on send (`AiChatContext.tsx:618`).

### Why this is wrong

This is the same shape of mistake the per-field `.ai([...])` flow had before Phase 5: an **imperative, scoped action** routed through a **conversational, global** surface. The user gets a textbox they don't need, conversation history they don't want, no anchor to where the action will land, and a "send" button they have to click to trigger something they already decided to do. See `feedback_standalone_field_actions_vs_chat.md`.

It also throws away the offsets, which means the model has no way to surgically replace only the selection — it has to rewrite the whole field via `update_form_state`. The user selects three words, asks "make this casual," and the entire 800-word post regenerates.

### Why a popover, not a modal

`feedback_inline_over_modal.md` — for chat-adjacent, in-the-flow actions, inline UI rooted to the trigger beats modal dialogs. Industry precedent (Notion AI, Linear AI, Cursor inline edit, GitHub Copilot Chat "edit selection", Raycast AI) is unanimous on this.

### Why a separate plan

`project_selection_ai_popover_followup.md` recorded the decision to defer this from Phase 6 of `standalone-client-tools-plan.md`. Phase 6 was final cleanup of the prior plan; bundling would have muddied close-out. This plan also has its own UX questions worth deliberate scoping (textarea behavior, "Open in chat" handoff contract, surgical replacement protocol, plain-input vs Lexical anchor differences) and clears the ~150 LOC bar in `feedback_when_to_write_plan_doc.md`.

---

## Architecture

### Two new primitives, six existing

**New:**
- `<SelectionAiPopover>` — UI component, the only new component on the frontend.
- `useSelectionAi(field, anchorRect, getOffsets)` — hook that owns popover state, wires to `useAgentRun`, threads `AiActionProgress` rendering. Returns `{ open, setOpen, popover }` where `popover` is a renderable React node (or null).

**Reused as-is:**
- `useAgentRun` — already does the full client-tool round-trip via the standalone endpoint.
- `AiActionProgress` — already streams text + tool calls + auto-dismiss + persistent error.
- `BuiltInAiActionRegistry` — gets a new `appliesTo` value (`'selection'`) and selection-friendly defaults.
- Standalone endpoint (`agentRun.handleAgentRun` + `handleAgentRunContinuation`) — gets one new optional body field (`selection`) which passes through to `PanelAgentContext`.
- `PanelAgent.buildTools()` — tools unchanged, but the preamble grows a "selection mode" branch.
- `clientTools.ts` `update_form_state` handler — already supports `replace_range` for plain inputs and a Lexical replace op for richcontent; the model just needs to be told to use it.

### Anchor strategy

- **Lexical (richcontent):** the popover replaces what `FloatingToolbarPlugin` currently routes to `onAskAi`. It uses the same `computePosition` + `autoUpdate` pattern already in that plugin (`FloatingToolbarPlugin.tsx:37-56`), reusing the `range.getBoundingClientRect()` virtual element. The popover positions *below* the selection; the formatting toolbar stays *above*. Both visible at once is OK.
- **Native `<input>` / `<textarea>`:** `useNativeSelectionAi` already computes a position for the `✦` button (`useNativeSelectionAi.tsx:41-43`). That logic is replaced with a real selection rect derived from the input's caret coordinates (use the canvas-measure trick for `<input>`, the well-known `getCaretCoordinates` shim for `<textarea>`). The popover anchors to the *end* of the selection. Plain inputs are short enough that "below the field, beside the right edge" is also acceptable as a fallback if caret-coord measurement is too fragile in early phases.

### Surgical replacement protocol

When `selection` is present in the request, the preamble auto-prepended by `PanelAgent.resolveInstructions()` adds:

> The user has selected text in field `{field}` from offset {start} to {end}: `"{text}"`.
> When you call `update_form_state`, use the `replace_range` op (plain inputs) or `replace_selection` op (rich content) to rewrite **only the selection**. Do NOT regenerate the whole field. The offsets above are stable for the duration of this action.

`update_form_state`'s plain-input handler already accepts `{ op: 'replace_range', start, end, text }`. The Lexical handler needs a small addition: a `replace_selection` op that calls `editor.update(() => { /* set selection from saved range, then insertText */ })`. Saving the range is the gotcha — by the time the action streams back, focus has moved to the popover textarea. The hook captures the selection range *at popover open time* and re-applies it inside the editor update before insertion.

### "Open in chat" handoff contract

When the user clicks "Open in chat" inside the popover:

1. The popover closes immediately (no "loading" state).
2. `AiChatContext.openWith({ initialMessage, attachments })` is called. `initialMessage` is the popover textarea contents (or empty). `attachments` is `[{ type: 'selection', field, text, start, end }]`.
3. Chat panel opens, composer is pre-filled, user can edit and send.
4. On first send, the attachment becomes part of the user message body — chat sees it as a one-time piece of context, not as ongoing state. **Critically: there is no `selection` field on `AiChatContext` anymore.** The handoff is a one-way data shove, not shared state.

This means the same user can have a selection popover open *and* a chat conversation open with no state coupling. Closing the popover does not affect chat; sending in chat does not affect the popover.

---

## Phases

### Phase 1 — Server: accept `selection` on standalone endpoint

- Add `selection?: { field: string; text: string; start: number; end: number }` to the standalone request body schema (`agentRun.ts` initial POST + continuation POST).
- Add `PanelAgentContext.selection?: typeof above` and pass it through `handleAgentRun` / `handleAgentRunContinuation`.
- Round-trip: store `selection` in `runStore` alongside `userId` so continuations see the same offsets.
- No tool changes yet. No preamble changes yet. Verify with a curl test: POST with `selection`, confirm it lands in `context.selection` inside a stub agent's `instructions` callback.

**Touches:** `src/handlers/agentRun.ts`, `src/handlers/agentStream/runStore.ts`, `src/agents/PanelAgent.ts` (`PanelAgentContext` type only).

### Phase 2 — Built-in selection actions + selection-aware preamble

- Add `appliesTo: 'selection' | string[]` to `BuiltInAiActionRegistry` entries. Existing field-typed entries remain unchanged.
- Register selection-mode versions of `rewrite`, `shorten`, `expand`, `fix-grammar`, `make-formal`, `simplify`, `translate`, `summarize` — same instructions, but with `appliesTo: 'selection'` and a `description` referring to "the selected text" rather than "the field". These can share constructors with the field versions; the only difference is the `appliesTo` discriminator.
- Extend `buildToolSelectionPreamble()` in `PanelAgent.ts`: when `context.selection` is set, append the selection block (text, offsets, surgical replacement instructions). Preserve all existing per-field-type guidance.
- Add the Lexical `replace_selection` op to `clientTools.ts` `update_form_state` handler. Plain-input `replace_range` already exists.
- Unit test: simulate a tool dispatch with `replace_range`, assert only the selected slice mutates.

**Touches:** `src/ai-actions/registry.ts`, `src/ai-actions/builtin.ts`, `src/agents/PanelAgent.ts` (preamble), `pages/_components/agents/clientTools.ts`, `pages/_components/agents/updateFormStateHandler.ts`.

### Phase 3 — `SelectionAiPopover` + `useSelectionAi`

- New component `pages/_components/agents/SelectionAiPopover.tsx`:
  - Props: `{ field, selection: {text, start, end}, anchorRect, apiBase, resourceSlug, recordId, onClose, onOpenInChat }`.
  - Body: header (`Ask AI` + close `×`), quick-action chip row (filtered from `BuiltInAiActionRegistry` by `appliesTo === 'selection'`), textarea, `[Submit] [Open in chat ↗]` footer.
  - Owns its own `useAgentRun` instance. While running, body is replaced by `<AiActionProgress entries={entries} status={status} onDismiss={reset} />`.
  - On success: auto-closes after 600ms (matches existing `AiActionProgress` field action behavior).
  - On error: stays open, error visible, user can retry or "Open in chat".
- New hook `pages/_components/agents/useSelectionAi.ts`:
  - Owns `open` state, captured selection rect, captured offsets, captured Lexical range (for richcontent).
  - Returns `{ openFor(args), close, popover }` — caller renders `{popover}` into a portal (or its own subtree).
- Both new files live alongside `useAgentRun.ts` / `AiActionProgress.tsx` so the AI surface code stays colocated (per `reference_panels_ai_surfaces.md` files cheat-sheet).

**Touches:** two new files in `pages/_components/agents/`.

### Phase 4 — Wire popover into existing surfaces

- `FloatingToolbarPlugin`: change the `onAskAi` callback signature from `(text: string) => void` to `(args: { text, start, end, range: RangeSelection }) => void` — caller (`LexicalEditor` → `RichContentInput`) uses these to feed `useSelectionAi.openFor`. The button moves from "always shows when `onAskAi` is set" to "only shows when the parent enables it" — same condition as today, just the callback is richer.
- `useNativeSelectionAi`: same shape change. Compute offsets from `selectionStart`/`selectionEnd`, anchor rect from caret coordinates (or fall back to "beside the field's right edge" — see Architecture).
- `TextInput`, `TextareaInput`, `RichContentInput`: replace the `aiChat.setSelection({ field, text }) + setOpen(true)` body with `selectionAi.openFor({ field, text, start, end, anchorRect, range? })`. Each component instantiates `useSelectionAi` once and renders the returned popover.
- The `onAskAi` prop still exists on `FieldInputProps` so app devs can override the default popover behavior (e.g. route to a custom command palette). If they don't override, they get the popover.

**Touches:** `packages/panels-lexical/src/lexical/FloatingToolbarPlugin.tsx`, `packages/panels-lexical/src/LexicalEditor.tsx` (prop forwarding), `packages/panels/pages/_hooks/useNativeSelectionAi.tsx`, `packages/panels/pages/_components/fields/{TextInput,TextareaInput,RichContentInput}.tsx`, `packages/panels/pages/_components/fields/types.ts` (`onAskAi` type).

### Phase 5 — Delete the chat bridge; docs; memory

- Delete `selection`, `setSelection`, `setSelectionState`, `selectionRef` from `AiChatContext.tsx`. Delete the corresponding clear-on-send (`AiChatContext.tsx:618`) and any `selection` body fields in the chat request payload. Delete `TextSelection` type if nothing else uses it.
- Add `AiChatContext.openWith({ initialMessage, attachments })`. Implement the attachment rendering in the composer as a quoted block above the input. On send, embed in the user message body and clear the attachment immediately.
- Update `reference_panels_ai_surfaces.md` (memory) to add the third surface: "Selection-rooted popover → standalone runner with `selection` body param."
- Update `project_selection_ai_popover_followup.md` to mark DONE with the date and PR list (or delete it — superseded by the architecture reference).
- Update the `panels` README's AI section to mention the popover.
- Update CLAUDE.md if a relevant entry exists (probably not — panels architecture doc lives in `docs/claude/panels.md`).
- Add a new feedback memory if any non-obvious gotcha surfaced during implementation (e.g. Lexical range capture timing).

**Touches:** `pages/_components/agents/AiChatContext.tsx`, `pages/_components/agents/AiChatPanel.tsx` (composer rendering), README, memory.

---

## Open questions to resolve before Phase 3

1. **Caret coordinate measurement on plain inputs.** Phase 3 needs a real anchor rect for `<input>` and `<textarea>`. Do we (a) ship a tiny `getCaretCoordinates` util based on the textarea-caret-position library's algorithm, (b) start with the "below the field" fallback and improve later, or (c) make the popover field-anchored (not selection-anchored) for plain inputs and only true-selection-anchored for Lexical? Recommend (b) — ship fast, improve in a follow-up if anyone notices.

2. **Translate target language.** `Translate…` needs a target. Options: a submenu inside the popover, or a textarea-prompt convention ("translate to French"). Recommend the latter for v1 — the textarea is already there, and a submenu is more UI for an action that's already a chip.

3. **Should the popover survive selection collapse?** Lexical fires `SELECTION_CHANGE` constantly. If the user clicks inside the popover, the editor selection collapses, but the popover should stay open and remember the original range. This is the load-bearing detail in Phase 3 — the hook must capture the range *eagerly* on `openFor()` and not re-read it from the editor until it dispatches the replace op.

4. **Concurrent popover and chat panel.** If chat is open and the user opens a selection popover, both are visible. Is that OK? Recommend yes — they're independent surfaces. The "Open in chat" button is the explicit handoff; nothing else should cross-talk.

5. **Mobile / touch.** Touch selection on iOS Safari triggers the native context menu, which competes with the popover. Out of scope for v1 — log it as a known limitation, revisit if anyone reports it.

---

## Risks

- **Lexical range invalidation.** If the editor reflows (e.g. another collaborator edits) between popover-open and replace-dispatch, the saved offsets are stale. Mitigation: the `replace_selection` Lexical op should look up *node IDs* for the range start/end at capture time, not absolute offsets — Lexical's collab CRDT preserves node identity across remote edits. If the nodes are gone, the op no-ops with an error and the user sees "selection no longer valid" in `AiActionProgress`.

- **Popover overlap with `FloatingToolbarPlugin`.** Both want to be near the selection. Mitigation: formatting toolbar above (`placement: 'top'`), AI popover below (`placement: 'bottom'`). Both use `flip()` so they swap if there's no room.

- **Bundle size.** The popover is its own React component tree but reuses `AiActionProgress` and uses no new libs. Should add ~6KB gzipped. Acceptable.

- **Breaking change for app devs who pass `onAskAi`.** The signature changes from `(text: string) => void` to a structured args object. Mitigation: detect the old signature shape via parameter count and call it with just `args.text` for one minor version, log a deprecation, then remove. Or — given there are zero known external consumers and the panels API is still pre-1.0 — just take the break and document it in the changeset.

- **The "Open in chat" handoff loses the offsets.** Once the user is in chat, the model can't surgically replace the selection any more. That's intentional — chat is conversational, the user might iterate five times, the offsets won't be valid by the third turn. The chat receives the *quoted text* as context, and any "apply this back to the field" decision goes through a normal `update_form_state` call against the live form state. Document this in the popover hover-tip.

---

## Definition of done

- Selecting text in any field type (plain text, plain textarea, Lexical richcontent) shows the popover anchored to the selection. No call to `aiChat.setSelection` exists in the codebase.
- Clicking a quick-action chip surgically rewrites only the selected range in all three field types. Verified by selecting one word in a 500-word richcontent field, clicking `Make formal`, and confirming the rest of the field is byte-identical.
- Free-form prompt submission works (Enter to send, Shift+Enter for newline).
- "Open in chat" opens the chat panel with the quoted selection in the composer and the textarea contents pre-filled. Sending the message clears the quoted attachment. No `selection` state persists in chat.
- `AiActionProgress` renders inside the popover during execution, auto-dismisses on success, persists on error.
- `useAgentRun` is unchanged. `BuiltInAiActionRegistry` has selection-typed entries. The standalone endpoint accepts `selection` in the body and passes it through to `PanelAgentContext`.
- The chat panel's `selection` field, `setSelection` method, `TextSelection` type (if unused), and clear-on-send line are deleted.
- `reference_panels_ai_surfaces.md` updated to describe three surfaces (chat, standalone, selection popover).
- `project_selection_ai_popover_followup.md` either marked DONE with the merge date or deleted (superseded).
- README + `docs/claude/panels.md` updated.
