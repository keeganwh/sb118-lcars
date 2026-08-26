# Session log — output fidelity (ROADMAP Batch 2)

_2026-08-26. Branch `claude/output-fidelity-audit-loplbx`, merged to `main`.
The standing item "[+7] Sim editor formatting — accuracy of output to Google
Groups and Gmail". Read alongside `session_lcars_2026-08-share-links.md`, which
ends on the same subject._

## The shape of the problem

Three passes turn a stored sim into something someone reads, and they have to
agree:

| Pass | Where | What it is |
|---|---|---|
| The editor's `copy` handler | `lcars.js`, `installCopyHandler` | **The authority.** What lands in Gmail and Google Groups. |
| `lrToReadingHtml()` | `lcars-render.js` | The share viewer at `/s/<token>`. |
| `applyMarkers` / `lrApplyMarkers` | both | **A writer's aid only.** Tints markers so they can be spotted mid-sim. Nothing a reader sees comes from it. |

The audit drove one sim — locations, dialogue tags, OOC, thoughts, action and
comms markers, two indent levels, bullets, a link, coloured characters, and a
genuine Google Docs paste — through all three and compared the results.

**Seventeen things already agreed** and are worth not re-deriving: colour of
every kind (character colours included) is absent from both reader passes,
marker tint spans reach neither, marker punctuation survives as plain text in
both, locations/OOC/thoughts follow the same three prefs in both, and bullets,
links, auto-bolded names and blank lines round-trip correctly.

## What was wrong, and what it taught

### 1. Google Docs pastes came in bold and lost their own bold

The big one, and the one the writer could see. Docs wraps a copied selection in

```html
<b id="docs-internal-guid-..." style="font-weight:normal">
```

— a bold tag that its own style switches back off — and marks the words that are
genuinely bold as `<span style="font-weight:700">`. `cleanPasteHTML` kept `<b>`
(it is in the `keep` list), stripped every attribute including the style that
was defusing it, and unwrapped the spans that carried the real bold.

So a pasted sim was stored bold, showed bold in the editor and on a share link,
and then copy-out dropped the `<b>` again and the group received it un-bold.
Three surfaces, three answers, on the same sim.

**Weight, slant and strike are now read off the style, not just off the tag.** A
bold or italic tag whose own style contradicts it is unwrapped; any element whose
style says bold/italic/strikethrough becomes a real `<strong>`/`<em>`/`<s>`
before its own tag is discarded. Word and Outlook use the same
span-with-a-style shape and benefit identically.

**The lesson worth keeping:** the project's rule is *normalise on the way out,
not at paste time* — that is right for `<p>`/`<div>`, where nothing is lost by
waiting. It is wrong here, and this is the exception, because the information is
**destroyed** at paste time otherwise. Ask which it is: is the incoming markup
merely inconvenient, or is it being actively misread? Misread means fix it on
the way in.

### 2. Sims already pasted were still stored broken

The paste fix helps new pastes only. A one-shot migration (`_docsWrapV1`, beside
`_pasteCleanV1` in the `loadState` block) unwraps the stored wrapper in existing
sims **and templates**, on the signature that the bold tag contains whole
paragraphs — real bold applied by a writer never wraps a `<div>` or a `<p>`.
Bold inside the wrapper is left exactly where it is.

Note what the repair **cannot** do: the bold and italic Docs originally carried
were destroyed at paste time, so sims pasted before the fix lose the stray bold
but do not get their real formatting back. The user re-pasted into a fresh sim
to verify the forward path.

### 3. A mail client's stylesheet is not ours

Reported from the real Gmail and Groups paste test, not found by the harness: a
bulleted list arrived with a gap above and below it that is not there in the
editor. Mail clients give `ul`/`ol` a block margin of their own; LCARS zeroes it
in `lcars.css`, and **a paste target never sees `lcars.css`**.

Copy-out now states `margin:0` and a padding inline, after the attribute strip
that would otherwise remove it. This is a deliberate exception to "keep
`margin-left` and nothing else". Generalise it: anything whose appearance
depends on an LCARS rule has to carry that rule inline on the way to the
clipboard.

### 4. `lrToReadingHtml()` was not keeping its own promise

Its comment says it produces exactly what copy-out puts on the clipboard, with
no colour of any kind. It did not — inline `color`, `font-family` and `<p>` went
straight through. `/s/<token>` was never actually wrong, because `share.js`
sanitises to `margin-left` first and `share.html` styles `<p>` itself.

**But the guarantee was living in the caller.** The next surface to use that
function — the `TOOLKIT.md` parsing contract in Batch 10, an export, a print
view — would have had neither safeguard. It now strips and normalises itself.

`ind-1..4` are left as **classes** on purpose, where copy-out converts them to
inline margins: share.html scales indents down on a narrow screen, and an inline
margin could not be overridden. Any consumer without a stylesheet maps them at
2em per level. That divergence from copy-out is intentional and is commented in
both places.

### 5. `jpMakeJoint` wrote three settings that do not exist

`format: { boldLoc: !!S.settings.boldLoc, italOOC: …, italThoughts: … }` — none
of those three names appear anywhere else in the app. The real prefs are
`boldLocations` / `italicOOC` / `thoughtItalic`, under `S.settings.prefs`. Every
joint sim therefore published its reader formatting as all-off.

Nothing reads `jp_docs.format` yet, which is the only reason nobody saw it. It
now matches `sharePayload()`'s shape and reads the same prefs. Worth a general
suspicion: a settings object assembled at a call site rather than from a shared
helper is where key names drift.

## The test, in two halves

Neither half is sufficient alone, and that is the point.

- **`test/fidelity_browser.js`** — drives one sim through all three passes in a
  real browser, including a paste/copy round trip using synthetic
  `ClipboardEvent`s with a `DataTransfer`, and compares the results. 24 checks,
  all passing at merge. It catches the passes drifting apart. **It cannot tell
  you what Gmail or Groups actually do with the output.**
- **`test/OUTPUT-FIDELITY-TEST.md`** — the hand-run half. The sample sim, the
  Google Doc it has to be pasted from (typing the same words does not reproduce
  the bug — the markup has to come out of Docs), and thirteen checks in Gmail,
  Groups and the share link, with a reporting format.

Two harness mechanics worth remembering:

- **`openDoc()` calls `flushSave()` first.** Seeding `doc.content` and then
  reopening the doc saved the empty editor straight over it. Clear `curId`
  before reopening.
- **Measure what the writer sees, don't infer it from the markup.** The
  all-bold bug was proven with `getComputedStyle(el).fontWeight`, not by reading
  the HTML — the stored markup looked plausible either way.

## Deliberately not done

- **Step 5 of the hand test, reading the delivered message rather than the
  compose window.** The user declined: if it composes right and sends wrong,
  that is Gmail's or Groups' behaviour and out of their hands. Recorded so it is
  not re-proposed.
- **A built-in "Formatting test" template.** The user raised making the sample
  sim a permanent fixture, possibly super-admin-only. Deferred deliberately so
  the template ships already-correct rather than baking the bugs into a
  reference sim. Still open if wanted.

## State at merge

`APP_VERSION` untouched at 4.24. Twelve pending entries in `VERSIONS`;
`CHANGELOG.md` deliberately not touched — it carries released versions only, and
the pending block goes in at the next bump, which stays the user's call.

Batch 1 and Batch 2 are both ticked in `ROADMAP.md` but not deleted, because
neither is in a released version yet.
