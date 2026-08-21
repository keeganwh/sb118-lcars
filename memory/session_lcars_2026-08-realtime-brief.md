# Brief — Real-time simultaneous writing (next session)

_Written 2026-08-21, after two rounds of feedback on turn-based Joint Posts.
Read `session_lcars_2026-08-joint-posts.md` first — this replaces its turn model,
it does not sit beside it._

**The user's reason, in their words:** _"Otherwise people will just choose Google
Docs over LCARS."_ That is the bar. Not "two cursors work"; "good enough that a
writer does not leave for Google Docs."

**This reverses an earlier decision.** The original roadmap said simultaneous
typing was explicitly NOT being built and should not be reopened. The user has
reopened it deliberately, with the turn-based system built and used. Do not
re-argue it — argue only about *how*.

---

## The honest size of it

Turn-based Joint Posts was one session. This is not that.

The hard part is **not** the CRDT. Yjs is a solved, well-tested library and the
merge logic is not something to hand-roll. The hard part is that **this app's
editor is a hand-rolled `contenteditable` with several passes that rewrite its
HTML underneath the writer**:

- `applyMarkers()` tints markers on input
- `boldNames()` rewrites `<strong class="cn">` in place
- `applyCharColors()` colours by character
- `normalizeEditorContent()`, `stripFormattingHtml()` on open/paste/source-view

Every one of those is a bulk DOM rewrite. A CRDT binding must see *character
level* edits; a pass that replaces the innerHTML looks like "deleted everything,
inserted everything", which destroys concurrent edits and moves everyone's
cursor. **Reconciling those passes with a CRDT binding is the project.** The
merge algorithm is the easy half.

### The three routes, with the real cost

1. **Yjs + y-prosemirror, replacing the editor.** The route that actually works
   long-term. Cost: the editor is rebuilt, and markers, character colouring,
   copy-out, snapshots, Academy mode and the source view all have to be
   re-expressed as ProseMirror schema and plugins. Also **needs a bundler**,
   which breaks the zero-dependency rule and `api/download.js` — see below.
2. **Yjs + y-quill or similar.** Same bundler problem, less rework than 1, but
   the marker passes still have to become editor plugins rather than DOM sweeps.
3. **Hand-rolled OT on the existing editor.** Avoids the bundler. Do not do
   this. Text OT with cursor transformation is exactly the class of problem
   where bugs are rare, silent, and eat people's writing — and the failure mode
   here is a lost sim, which is the one thing this app must never do.

**Recommendation: route 1, staged, with route 2 as the fallback if the editor
rework proves too deep.**

### The bundler question, which is now unavoidable

`api/download.js` inlines three files into one offline `LCARS.html`, and the
no-npm rule is what keeps that working. Yjs cannot be used without a build step.

Two ways out, and the user should pick:
- **Vendor a pre-built bundle** into the repo as a plain `.js` file, built once
  out-of-band. Keeps `download.js` working (it is just another file to inline),
  keeps no-npm-at-runtime. Ugly but honest, and reversible.
- **Accept a build step** for the app, and give the offline copy a turn-based or
  read-only fallback.

The first preserves what the offline download is for. Prefer it unless the user
says otherwise.

### Answer to the user's scaling question

They asked whether the cost scales exponentially with more writers, and whether
it is MB or GB.

- **Storage: MB, comfortably.** A long sim is tens of KB of text. A Yjs document
  carries per-character metadata plus edit history; with garbage collection on,
  expect roughly **2–5× the plain text** for a document being actively written,
  settling lower once compacted. A sim that is 40 KB of prose is a few hundred
  KB at worst. **Hundreds of joint sims would be well under 100 MB.** Supabase's
  free tier is 500 MB of database; this is not what would exhaust it.
- **It does not scale exponentially with writers.** CRDT size grows with the
  number of *edits*, not with writers squared — ten writers making the same
  total number of edits cost about the same as two. Network traffic is O(writers)
  per edit, which at PBEM's two-to-five writers is nothing.
- **The real growth risk is history, not concurrency.** An un-garbage-collected
  Yjs doc grows forever with every keystroke ever typed. Snapshot and compact —
  that is a known, solved operational step, but it must be deliberate.

So: **not a storage problem. A correctness-and-editor-rework problem.**

---

## What to keep from the turn-based system

Do not delete it. It should stay as the fallback for:
- **offline** (a CRDT still cannot merge safely with no server, and read-only
  offline was the right call and remains it);
- **anyone on the one-file offline download**;
- the moment real-time fails to connect.

The lock, the version check and `jp_save()` all stay useful under that.

## Things that will bite

- **The marker/bold/colour passes** — the whole problem, see above.
- **`stripFormattingHtml()` runs on open, paste and source view**, so anything
  structural a CRDT binding adds to the markup will be stripped repeatedly.
- **Presence is polling today** and that stays fine for the turn-based fallback;
  a real-time route brings a WebSocket anyway, at which point presence rides it.
- **Snapshots are per writer** on a joint sim. With simultaneous editing that
  becomes odder than it already is — worth settling deliberately.

## First session's work, suggested

1. Settle the bundler question with the user.
2. Spike ONLY this: a Yjs-backed ProseMirror editor that round-trips one real
   sim — markers, character colours, copy-out — with nothing shared. If that is
   not convincing, stop and report; everything else depends on it.
3. Only then wire two browsers together.

Do not start by connecting two browsers. The editor is the risk.
