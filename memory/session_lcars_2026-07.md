---
name: session-lcars-2026-07
description: Work log and handoff notes for LCARS sessions circa July 2026
metadata:
  type: session-log
---

# LCARS Session Log — July 2026

## Version Status
Current released version: **4.2** (2026-07-14). No pending entries in VERSIONS array.
CHANGELOG.md is only updated on explicit "save new version X.Y" — don't touch it otherwise.

---

## Features & Fixes Shipped (most recent first)

### Selection / Editor UX
- **Text selection collapsing bug** — background timers (normalize 80ms, transformNow 600ms, boldNames 900ms after each keystroke) called `restoreCaret()` which unconditionally calls `removeAllRanges()`, destroying any active selection. Fixed with `hasEditorSel()` guard: all three timer callbacks bail if user has a live non-collapsed selection in the editor.
- **Link insert scrolling to top** — `ed.focus()` after modal close caused browser to scroll editor to default focus point. Fixed with `ed.focus({ preventScroll: true })` in both `doLink` callback and `doUnlinkCurrent`.
- **Link always inserting at sim start** — selection range was lost when modal input stole focus. Fixed by capturing `sel.getRangeAt(0).cloneRange()` before `openModal()` and restoring it after `ed.focus()` in the callback.

### Gist Sync
- **"Failed to fetch" on new computer** — `raw_url` fetch to `gist.githubusercontent.com` fails CORS preflight in fresh browsers (Authorization header blocked). Implemented three-tier fallback: (1) raw_url with auth, (2) raw_url without auth (simple GET, no preflight, works when GitHub session cookie present), (3) API content field (truncated ~1MB).
- **"Unterminated string in JSON" error** — data at ~913KB, API content field gets truncated. JSON parse error now shows clear "data too large" message. User's data is close to 1MB limit — watch this.
- **Status changes not syncing** — `setStatus()` (mark active/complete/archive) now calls `schedSync(5000)` so context-menu status changes push to Gist within 5 seconds. Previously only editor saves triggered sync.

### Scene Features
- **`startedAt` optional date field on scenes** — stored as ms timestamp, null by default. Set via New Scene modal (date picker, blank by default) or right-click → "Edit Scene" (replaces old "Rename"). Displayed in scene detail view meta row. `sceneLastActivityMs()` fallback now prefers `startedAt` over `createdAt` for staleness calculation.
- **`editScene(id)` function** — modal with both name and date fields; re-renders scene view in place if currently open.

---

## Key Architecture Notes

### Editor DOM
- `contenteditable` div `#editor`
- `onEditorInput` handler (added via `addEventListener` in init, not inline) triggers:
  - `_normTimer` (80ms) → `normalizeEditorContent()` — unwraps nested block divs, strips empty attrs
  - `trTimer` (600ms) → `transformNow()` — applies ((Location)) / ((OOC)) / thought/comms/action markers
  - `_bnTimer` (900ms) → `boldNames()` — auto-bolds character names
  - All three now guarded by `hasEditorSel()`
- `saveCaret` / `restoreCaret` save/restore cursor position by character offset (not DOM range) — always collapse to a point, never restore a selection range

### Copy Handler
- `installCopyHandler()` — captures `copy` event, builds `tmp` clone, converts `.lm` → `<strong>` (if boldLocations pref), `.om` → `<em>` (if italicOOC pref), unwraps all spans, replaces empty `<br>`-only blocks with NBSP so blank lines survive paste.

### Gist Sync
- `getSyncConfig()` / `saveSyncConfig()` — localStorage key `lcars_sync_v1` (separate from main data `SKEY`)
- PAT stored in localStorage; not synced between devices — must be re-entered on each new device
- `pushToGist()` — PATCH/POST to `api.github.com/gists/`; 60s debounce after editor save, 5s after status change
- `pullFromGist(silent)` — three-tier fetch (see above); auto-pull on page load if Gist is newer than local

### Link Insertion (`doLink`)
- Saves `cloneRange()` before opening modal
- On OK: `ed.focus({ preventScroll: true })`, restores range, then execCommand or setAttribute
- Edit mode: detects if cursor is inside `<A>` element, pre-populates URL/text, offers "Remove Link" button
- `doUnlinkCurrent()` — selects the `<A>` node, calls `execCommand('unlink')`
- `_editingLink` global holds reference to the `<A>` being edited

### Scene Staleness Dots
- `sceneLastActivityMs(sceneId)` — finds most recent `postedAt` or `updatedAt` (when status=complete) across scene's docs; falls back to `startedAt ?? createdAt`
- Amber dot: ≥2 days since last activity; Red dot: ≥3 days

### Toolbar Layout (current)
- Row 1: ⚠ (title warn) | title input | Auto Format ▾ | Visual Aids ▾ | ✕ close
- Row 2: 📋 | Clear Format | </> | ¶ | separator | B I S 🔗 | separator | indent buttons | marker buttons

---

## Data Size Warning
User's Gist data is ~913KB. The GitHub API content field truncates at ~1MB. If data grows past that, the no-auth raw_url fetch (step 2) must succeed for pulls to work. Long-term fix would be chunking across multiple Gist files. Monitor if user reports pull issues again.

---

## Git Workflow Reminder
- ALWAYS push to `main` only (`git push origin main`)
- `main-ikuxoc` branch has been deleted — do not recreate it
- Pre-commit: `git config user.email noreply@anthropic.com && git config user.name Claude`
- GitHub Pages auto-deploys from `main` (~30s)
