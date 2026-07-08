# Design: Post-transcription Edit→Feedback flow, markdown editing, and credits revert

Date: 2026-07-09
App: `hela-voice-web`
Primary file: `src/app/[locale]/dashboard/dashboard-content.tsx`

## Problem

1. After a transcription completes, the feedback ("Help us improve") modal pops up
   immediately — before the user has even seen their result. Feedback is being asked
   at the wrong moment.
2. Users should get a chance to review/edit the fresh transcription (and optionally
   translate it) first. Only after they close that review should feedback be requested.
3. The edit experience should support markdown so users can format the transcript as
   they prefer.
4. A previous change renamed the user-facing "credits" currency to "minutes" across the
   UI (both `en` and `si` dictionaries plus some hardcoded strings). This is being
   reverted back to "credits" because it reads better and matches the data model
   (`profiles.credits`, `deduct_credit`/`add_credits` RPCs; 1 credit = 1 minute of audio).

## Current state (as of exploration)

- `handleTranscriptionComplete` (`dashboard-content.tsx:183`) currently calls
  `setFeedbackTranscriptionId(transcriptionId)` immediately, which pops the feedback
  modal (modal JSX at ~lines 1475–1594).
- The **Edit modal** (`dashboard-content.tsx:1264–1394`) already provides:
  - Two-pane Sinhala | English editing (`editText`, `editEnglishText`).
  - When `english_translation === null`, the English pane shows a **Translate** button
    (`setTranslateTarget(...)`) that opens the credit-cost **Translate Confirm modal**
    (`1396–1473`), which uses `dict.credits.credit` / `dict.credits.credits` for units
    and renders the panes side-by-side once translated.
  - Close paths: backdrop click, ✕ button, Cancel button (all `setEditTranscription(null)`),
    and successful `handleSaveEdit` (`457–499`).
- `openEdit(t)` (`450–455`) sets `editTranscription`, `editText`, `editEnglishText`.
- Display surfaces for transcript text:
  - View modal Sinhala pane (`~1208`) and English pane (`~1238`) — `whitespace-pre-wrap`.
  - One-line list preview (`1022`, `line-clamp-1`).
  - Live processing text (`905`) — accumulating, not yet saved.
  - `handleCopy` (`418`) and `handleDownload` (`425`, `.txt`).
- Terminology: `src/lib/i18n/dictionaries/en.json` and `si.json` currency values were
  changed to "minutes" / "විනාඩි"; i18n **keys** (`buyCredits`, `credits`, etc.) are unchanged.
  Legitimate duration uses of "minute" are intermixed. `hela-voice-web` is a git repo.
  No markdown dependency is installed yet.

## Feature A — Completion flow: Edit modal first, then feedback

1. Add state `pendingFeedbackId: string | null` (default `null`).
2. Change `handleTranscriptionComplete(_text, creditsRemaining, transcriptionId)`:
   - Keep `setCredits(...)`, `fetchTranscriptions()`, `resetState()`,
     `toast.success(d.transcriptionComplete)`.
   - Replace `setFeedbackTranscriptionId(transcriptionId)` with:
     - Open the Edit modal on the just-finished transcription. Construct the minimal
       `Transcription` object needed by `openEdit` from the data on hand
       (`id = transcriptionId`, `transcription_text = _text`, `english_translation = null`),
       or look it up from the refreshed list. Use `openEdit(...)`.
     - `setPendingFeedbackId(transcriptionId)`.
3. Add a single close handler for the Edit modal, e.g. `closeEditModal()`, that:
   - `setEditTranscription(null)` (and any edit-state cleanup already done today).
   - If `pendingFeedbackId` is set: `setFeedbackTranscriptionId(pendingFeedbackId)` then
     `setPendingFeedbackId(null)`.
   Wire **all** close paths (backdrop, ✕, Cancel, and the end of `handleSaveEdit`) through
   this handler so feedback fires regardless of how the user leaves the modal.
4. Opening the Edit modal from the recording list (`openEdit` via the list row) must NOT set
   `pendingFeedbackId`, so editing an old transcription never triggers feedback.

Result: complete → Edit modal (review, optionally translate side-by-side via existing
confirm) → close → feedback modal. Exactly one feedback prompt per completed transcription.

## Feature B — Markdown editor + live preview

Dependencies: add `react-markdown` and `remark-gfm`.

Shared component: create `src/components/markdown-view.tsx` — a small wrapper around
`react-markdown` + `remark-gfm` with Tailwind classes matching the app (`sinhala-text`
applied for the Sinhala pane). Used by both the Edit preview and the View modal.

Edit modal panes (Sinhala and English each):
- Add a per-pane **Write | Preview** toggle (local UI state, e.g. `sinhalaMode`,
  `englishMode`, each `'write' | 'preview'`, default `'write'`).
- **Write** = existing `<textarea>` (unchanged behavior/bindings).
- **Preview** = `<MarkdownView>` rendering the current `editText` / `editEnglishText`.
- Minimal formatting toolbar above the active textarea (bold, italic, heading, list) that
  inserts markdown at the cursor/selection. Toolbar only shows in Write mode.
  (If undesired, the toolbar can be dropped without affecting the rest of the feature.)
- The English pane's empty-state (Translate button) and side-by-side-after-translation
  behavior are preserved; the toggle applies once there is text to show.

Display surfaces — render markdown where full text is shown:
- **View modal** Sinhala (`~1208`) and English (`~1238`) panes: replace the plain `<p>`
  with `<MarkdownView>`.
- **One-line list preview** (`1022`): stays plain text (block markdown in a clamped single
  line is not meaningful).
- **Live processing text** (`905`): stays plain (not yet saved).
- **Copy / Download**: keep the raw markdown source (no change).

Out of scope: the mobile app (`hela-voice-app`) is a separate React Native codebase and is
not updated here. Stored transcript text is already free-form text, so persisting markdown
requires no schema change.

## Feature C — "minutes" → "credits" terminology revert

Approach: revert user-facing **values** (not i18n keys) string-by-string, preserving
genuine audio-duration uses of "minute".

- Files: `src/lib/i18n/dictionaries/en.json`, `src/lib/i18n/dictionaries/si.json`, and
  hardcoded strings in pricing/landing/navbar/signup/login/recording-modal/etc. that were
  changed to "minutes".
- English mapping: currency-sense "Minute(s)" → "Credit(s)". Keep "minute" where it denotes
  duration (e.g. "1 credit = 1 minute of audio", "read your transcript minutes later",
  "try again in a few minutes", "$X/minute" pricing-per-minute where that is the intended
  copy). Each string judged individually.
- Sinhala mapping: currency-sense "විනාඩි" → **"ක්‍රෙඩිට්"**; keep "විනාඩි" where it means
  duration. Keep `perMinute`-style "per minute" phrasing that describes the rate.
- The pricing model is unchanged: 1 credit = 1 minute of audio; users still "pay per minute
  of audio" — only the name of the spendable balance reverts to credits.
- No logic/math changes — labels/copy only.

## Testing

- Manual: record/upload short audio → confirm Edit modal opens (not feedback); translate
  via confirm modal → panes render side-by-side; close via each of Save/Cancel/✕/backdrop →
  feedback modal appears each time, exactly once. Editing an old list item → no feedback.
- Markdown: type `**bold**`, `# heading`, `- list` in a pane → Preview renders formatting;
  View modal renders the saved markdown; list preview shows plain text; copy yields raw text.
- Terminology: `grep -i "minute"` across UI surfaces shows only duration uses; balance/CTA
  labels read "Credits" (en) / "ක්‍රෙඩිට්" (si). `yarn lint` and `yarn build` pass.

## Open questions

None outstanding — all decisions confirmed with the user.

## Implementation status (2026-07-09)

Implemented and verified with `tsc --noEmit` + `eslint` (both clean). A full `yarn build`
was not run: esbuild's native binary fails to execute under the sandbox (a pre-existing
wrangler dependency issue, unrelated to these changes).

- **Feature A** — `dashboard-content.tsx`: `handleTranscriptionComplete` now opens the Edit
  modal on the fresh transcription (via `fetchTranscriptions()` return + lookup) and stores
  `pendingFeedbackIdRef`. New `closeEditModal()` is wired to all close paths (backdrop, ✕,
  Cancel, and both `handleSaveEdit` exits); it pops feedback only when a pending id is set.
  List edits do not set the ref, so they never trigger feedback.
- **Feature B** — new `src/components/markdown-view.tsx` (GFM renderer) and
  `src/components/markdown-editor-pane.tsx` (Write|Preview toggle + bold/italic/heading/list
  toolbar). Both Edit-modal panes use `MarkdownEditorPane`; the View modal renders both panes
  via `MarkdownView`. Scoped `.markdown-body` styles added to `globals.css`. List one-line
  preview and copy/download left as raw text, as designed. Deps added: `react-markdown`,
  `remark-gfm`.
- **Feature C** — currency label revert done in `en.json`/`si.json` (21 strings each, Sinhala
  uses ක්‍රෙඩිට්), `pricing-content.tsx` (11), `pricing/page.tsx` (2),
  `signup-content.tsx` (2), `login-content.tsx` (2), plus a navbar comment. Rate/duration/
  clock-time uses of "minute" intentionally preserved (e.g. "1 minute of audio uses 1 credit",
  "$X/minute", "a few minutes").

Not committed — repo left dirty for user review.
