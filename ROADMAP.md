# LCARS SB118 Writing Tool — Roadmap

_Outstanding work only. Current version: **4.25**, released 2026-09-05 — Batches 1 and 2 and the Batch 4 mobile pass are all in it, and their entries are now in `CHANGELOG.md`. There are no pending changelog entries._

Live at **https://sb118-lcars.vercel.app/**. GitHub Pages still serves the same `main` with a moving notice.

> **Context.** The platform shift shipped 2026-08-14 and Joint Posts shipped in 4.24. What shipped, why, and the landmines are in `memory/` — **read `memory/MEMORY.md` first, then the files it flags for the batch you are starting.**

---

## How this file works

Restructured 2026-08-24. Three things changed and none of them should be re-litigated without a reason:

**1. Everything is categorised.** Every item is a **New Component** (core-product feature that doesn't exist), a **Component Revision** (change to something we already have), an **External Connection** (ours, LCARS-related, not the app itself), a **Future Integration** (a separate system we may connect to), or **Testing** (needs poking, not building).

**2. Everything is scored.** Priority is a points total, not a feeling:

| Test | Points |
|---|---|
| Is it fixing something broken now? | **+3** |
| Is it removing something we don't want any more? | **+3** |
| Is it a revision to something we already have? | **+2** |
| Does it close a gap or a loop in the design? | **+2** |
| Is it foundational — do other items build on it? | **+2** |
| Will it be costly to implement? | **−1** |
| Is it marked for later testing? | **−2** |
| Is it a future integration? | **−2** |

Scores are shown as `[+n]`. They are a starting position, not a verdict — the user reprioritises batches freely, and a score that misleads is noted where it does.

**3. Work is grouped into batches, not sessions-by-priority.** Items are bundled by **code locality** — same functions, same view, or the same schema migration — because the expensive part of a session on this project is loading context on a subsystem, not typing the change. Batches are ordered by their highest-scoring member. **The user may reprioritise any batch at any time**; the ordering is a default, not a queue.

Each item keeps a **Done when…**. Check items off (`- [x]`) as they ship, and delete them once they're rolled into a released version's changelog.

---

# BATCH 1 — Characters & name detection

**Top score [+7]. Category: mostly Component Revision.**

**Why these together:** all four touch the same two things — the character data model (`S.characters`, `getAllNamesForChar`) and the detection passes that read it (`detectChars` ~line 3601, `applyNameBold` ~line 4567). Fixing alias matching while also deleting half the character record is one coherent job; splitting them means loading the same code twice and risking the removal undoing the fix.

- [x] **[+7] Fix alias detection.** _Broken now._
      Both detection sites build their alias list as `if (alias && /[\s.]/.test(alias))` — **only aliases containing a space or a period are registered.** A single-word alias never enters that pass. It falls through to `CREX`, which matches any capitalised word followed by a colon, so it usually *bolds* — which is why the bug looks like it isn't there — but it is matched as a generic name rather than as your character, so attribution, colouring and `myChars` can miss it. Anything not starting `[A-Z]` (`d'Ihnn`, a lowercase nickname) or containing a digit fails every pass.
      Fix once, in a shared helper both call sites use.
      _Done when: a single-word alias, a lowercase alias and a multi-word alias all attribute to the right character in a real sim — bolding, colour and `myChars` alike._

- [x] **[+6] Characters rework.** _Removing + revision + foundational._
      - Rename **Manifest → Characters** — the view, the route (`/manifest` → `/characters`), the header link and the labels.
      - **Remove Service History and Ribbons entirely** — tabs, data, UI, and `RIBBON_CATALOG`, `buildRibbonLookup`, `copySRWikitext`, `copyRibbonsWikitext`, `copyMissionLogWikitext`, `moveRibbon`.
      - **Keep aliases.**
      _Why the removal: SB118 HQ already tracks character data, and duplicating it now creates redundancy that makes a later integration harder. This is the first decision made on HQ's behalf — see the HQ note in Batch 9._
      _Done when: the view is called Characters, has its own route, holds only identity, colour and aliases, and nothing in the app references ribbons or the service record._

- [x] **[+6, part of the above] Fix the alias editor's index-addressing.**
      `removeAlias(i)` / `updateAlias(i)` (~lines 8217–8230, 7392–7425) address rows by array index in inline handlers despite rows carrying stable `id`s.
      _Done when: adding, editing and removing aliases is correct with the list in any order._

- [x] **[+2] Detect the author character from the sim title.** _New Component._
      Infer which character is writing from the title and select them automatically. Depends on the alias fix landing first.
      _Done when: opening or creating a sim whose title names a character selects that character without being asked._

> **Landmine for this batch:** `stripFormattingHtml()` runs on open, on paste and on applying source view. Anything structural added here is stripped repeatedly, not once — so a feature can appear to work and quietly revert next time the sim is opened.

---

# BATCH 2 — Output fidelity

**Top score [+7]. Category: Component Revision.**

**Why alone:** this is the product's core promise, and it touches `lrToReadingHtml()` in `lcars-render.js`, the editor's `copy` handler, and the `<p>`/`<div>` normalisation — a region where a subtle regression is invisible until a sim lands wrong in a real group. It needs undivided attention and a genuine round-trip test.

- [x] **[+7] Sim editor formatting — accuracy of output to Google Groups and Gmail.** _Standing item; re-run whenever reports come in._
      Priority is that what a writer sees is what arrives in the group. The known trap is documented: `<p>` and `<div>` look identical while writing and copy out double-spaced, which the copy handler normalises on the way *out* rather than at paste time.
      _Done when: a sim containing locations, dialogue tags, OOC, thoughts, markers, indentation and pasted-from-Docs content copies into both Gmail and a Google Groups compose window looking exactly as it did in the editor._

      **Last run 2026-08-26 — passed.** Verified by the user in Gmail, Google Groups and a share link. Five fixes shipped:
      1. **Google Docs pastes came in entirely bold and lost their own bold and italic.** Docs wraps a copied selection in `<b id="docs-internal-guid-…" style="font-weight:normal">` and marks real bold as `<span style="font-weight:700">`; `cleanPasteHTML` kept the tag, dropped the style that neutralised it, and unwrapped the spans. Weight and slant are now read off the **style**, not only off the tag.
      2. **A one-shot repair** (`_docsWrapV1`) unwraps that stored wrapper in existing sims and templates, on the signature that it contains whole paragraphs — real bold never wraps a `<div>`.
      3. **Bulleted lists arrived with a gap** above and below in Gmail and Groups. Mail clients give `ul`/`ol` a margin LCARS zeroes in its own stylesheet, which a paste target never sees; copy-out states it inline now.
      4. **`lrToReadingHtml()` was not keeping its own promise** — inline colour, fonts and `<p>` passed straight through. `/s/<token>` was never wrong because `share.js` sanitises first, but the guarantee lived in the caller.
      5. **`jpMakeJoint` published `format` from three setting names that do not exist**, so every joint sim stored it as all-off. Unread so far; fixed before anything reads it.

      **The harness is `test/fidelity_browser.js`** — it drives one sim through all three passes and compares them, 24 checks. **The hand-run half is `test/OUTPUT-FIDELITY-TEST.md`** — the sample sim, the Google Doc to paste from, and thirteen things to check in Gmail and Groups. Re-run both when this item comes round again.

---

# BATCH 3 — Freeze offline, open Joint Posts

**Top score [+5]. Category: Component Revision + Testing.**

**Why these together, and in this order:** the download freeze has to land **before** Joint Posts opens to everyone, or the one-file offline build starts silently shipping a feature it structurally cannot support. Everything else here is joint-sim adjacent and small.

- [ ] **[+5] Freeze the offline download.** _Decision, then a small change._
      **Settled 2026-08-24, do not re-litigate.** The one-file download stops here. Declare the current version the last one `api/download.js` carries, and stop updating it rather than shoehorning online-only features into it.
      - Note the freeze in `CLAUDE.md`, `TECH_STACK.md`, and the Settings download-button copy so a writer knows what they're getting.
      - Flag a later follow-up to decide whether to build a purpose-made, deliberately simplified **"LCARS Lite"** offline app instead of maintaining the inlined one.
      _This is also what unblocks the build-step question that has been gating real-time writing — a bundler no longer costs the one-file copy, because the one-file copy is frozen._
      _Done when: the download is documented as frozen at a stated version, and the app says so where a writer downloads it._

- [ ] **[+4] Open Joint Posts to everyone.**
      `jpCanCreate()` at `lcars.js:9486` is `return isCloud() && isSuperAdmin();` — only a super admin can **start** a joint sim or convert a solo one. Anyone invited can already join, take turns and write. Change it to `return isCloud();` and verify all three call sites: the convert path (~4183), button visibility (~9334) and the create guard (~9465, which currently toasts "Joint sims are still being tested.").
      _Done when: any signed-in writer can start a joint sim._

- [ ] **[+4] Joint Posts follow-ups — review, don't assume.**
      Some of these may already work. Verify each, then fix or delete:
      - **Per-member mission/scene filing.** Likely already done — there is a long comment at `lcars.js:9488` explaining that filing lives in each writer's own payload precisely because missions are private per writer. Confirm and close.
      - **A joint sim cannot be turned back into a solo one.** The dialog says so rather than pretending otherwise. Decide whether that stands.
      - **Snapshots on a joint sim are per writer**, since `snapshots` is keyed by `writer_uid`. Defensible as "my revisions", but it should be a deliberate choice rather than a leftover.
      _Done when: each has been exercised and is either fixed or recorded as intended behaviour._

- [ ] **[0] Test: publishing a share link on a joint sim.** _Testing._
      `shared_docs` is keyed by `doc_id` and stores `authors` as a list precisely so this works, but it has never been exercised.
      _Done when: a joint sim publishes, renders and expires correctly at `/s/<token>`._

- [ ] **[0] Test: deleting an account while the server is unreachable.** _Testing._
      Covered by `account-check.js offline`, never done by hand. Folded in here because it is the same offline-path headspace as the freeze.
      _Done when: the flow has been walked through by hand with the network off._

---

# BATCH 4 — Workspace layout

**Top score [+5]. Category: Component Revision + New Component.**

**Why these together:** the original reasoning was that doing them apart means laying out the sim details panel twice. **In the event the mobile half shipped first** (2026-09-05), because the reorder needs a field order from the user and nothing in the mobile layout depended on it. The panel is laid out generically on a phone — it is the drawer's second tab — so reordering its fields does not require the mobile work to be redone.

- [ ] **[+5] Reorganise the sim details panel.** _Revision._
      Reorder the fields and tools from **most fundamental to most specific** — what someone needs first, first. Fix the alignment and visual consistency, which have drifted as things were added.
      _Done when: the panel reads in a sensible order and its rows line up._

- [x] **[+4] Mobile optimisation of the workspace.** _New Component. Shipped 2026-09-05; changelog entry pending._
      Under 820px the workspace is now one bar (header + sim title), one grouped toolbar (Copy, Bold, Italic, Format, Insert, Tools), the editor, and a right-hand rail that opens both sidebars as a single tabbed drawer, plus a control that clears the furniture for writing. The dashboard, the app menu and the Manifest's zoom-on-focus bug went with it.
      **Read `memory/session_lcars_2026-09-mobile.md` before touching any of it** — the decisions, the options tried and rejected, and what the build actually cost (six rounds of skin-specificity traps, and the `data-vibe` axis that no skin sweep covered).
      _Done when: a sim can be read, written and copied out on a phone without pinch-zooming._ **Met, confirmed on the user's own phone.**

> **Landmine for this batch:** responsive rules go in the one `RESPONSIVE` section at the foot of `lcars.css`, **after** the skin overrides — anything earlier is silently outranked by the `:root[data-skin="prime"]` blocks. Breakpoint is 820px.

---

# BATCH 5 — Admin surfaces & the feedback loop

**Top score [+4]. Category: New Component + Component Revision.**

**Why these together:** both need a new table, both need a new `security definer` function, and both add a panel to `#view-admin`. That is **one schema migration instead of two** — and migrations here carry a deploy-ordering rule, so halving the number is worth real money.

- [ ] **[+4] Bug report / feature request tool.** _New Component._
      A button in the **upper toolbar** opening a **non-blocking side panel** — the writer must be able to keep using the app while it is open.
      - Choose **Bug** or **Feature request**.
      - Free text: what went wrong, or what is being asked for.
      - **Auto-screenshot of the currently open pane**, attached to the report.
      - Reports land in `#view-admin`, visible to **super admins only**.
      _Done when: a writer can file a bug from inside the app without losing their place, and it appears in the admin view with its screenshot._

- [ ] **[+3] Admin usage overview.** _Revision — the admin panel exists._
      Total storage used across all writers, plus a per-writer breakdown: who is using it most, when they last used it, how many sims, how much storage.
      **Super admins only.** Via an `admin_list_*`-style `security definer` function, never a widened policy on `writers` — that table is read by every writer on boot and must stay untouched.
      _Done when: a super admin can see total and per-writer usage at a glance._

> **Landmine for this batch:** **deploy before running the schema migration, never after.** New app code tolerates columns it no longer uses; old app code does not tolerate columns that have vanished.

---

# BATCH 6 — Move data out of the payload blob

**Score [+5]. Category: Component Revision. Almost certainly several sessions.**

**Why alone:** the largest correctness risk on the board, and it gates the Google Groups extension. The staging exists so each step is independently reversible — that is the whole point.

**The picture item below is the exception and can be taken on its own, well before the big one.** It is the same argument — bytes that do not belong in the payload blob — at a fraction of the risk: no correctness question, no offline outbox, and the bucket it needs already exists. It is a fair rehearsal for the reasoning in the main item, and it is small enough to close in one short session.

- [ ] **[+5] Docs out of the blob.**
      **Why it is worth doing.** `saveToCloud()` POSTs the *entire* payload every few seconds while you type, so the cost of saving one sentence scales with how much you have ever written — and it gets worse every month. It also means two tabs of your *own* account clobber each other, and it is the reason a share link has to be a snapshot copy rather than a live view (a policy on the blob row is all-or-nothing).
      **Do it staged, never as a cutover:**
      1. Add the `docs` table. Change nothing else; the blob stays authoritative.
      2. Dual-write — the app writes both, still reads the blob. If the per-doc writes fail, nothing is lost. Leave it running as long as it takes.
      3. Flip reads behind a setting, one account first, then everyone.
      4. Stop writing the blob.
      _The hard part is offline: per-doc means a real outbox — dirty flags, a replay queue, and a decision about a queued edit that conflicts with a newer server version. That is the piece most likely to go wrong._
      _`jp_docs`, the membership helpers and the two-accessor discipline from Joint Posts are what this builds on._
      _Done when: saving a sentence uploads one sim, not the archive._

- [ ] **[+4] Character pictures into the storage bucket the schema already made for them.** _Small, standalone — take it before the item above, not with it._
      `supabase/schema.sql` creates a public `character-pics` bucket with four RLS policies, commented *"replaces base64 pictureDataUrl"*. **The app never calls it** — there is no reference to `character-pics` or `/storage/v1` anywhere in `lcars.js`. Pictures are still resized to 200×200, JPEG'd at 0.82 and base64'd into `c.pictureDataUrl` (`onCharPicFile`, `loadCharPicFromUrl`, `resizePicture` ~line 7909), which puts them **inside the payload blob**.
      **Why it matters more than its size suggests.** Base64 inflates a picture by a third, and the payload is uploaded whole on every save and downloaded whole on every load — so a writer with eight characters carries ~150 KB of image data in every sync, forever, against the 500 MB database quota, while the 1 GB file-storage quota created for exactly this sits at zero. It is a cost paid repeatedly where it should be paid once. Measured 2026-08-26: 34 MB of database and 92 MB of egress across 17 writers, so this is not urgent — but egress is the quota with a shape to it, and this is the cheapest thing that flattens it.
      **No migration needed** — the bucket and its policies are already applied. Upload on set, store a URL, and let the browser cache it.
      **Handle the orphans in the same pass, not after:** deleting a character, replacing its picture, and deleting an account must all delete the file, or the bucket fills with things nothing points at. Account deletion in particular already has a grace period and a `security definer` path — check what it does with storage.
      **Existing pictures need a one-time migration** out of `pictureDataUrl` and into the bucket, on a signed-in boot, in the manner of `backfillSnapshots`. Offline-only writers keep the data URL and must keep working: `isCloud()` gates it, like everything else that touches the network.
      _Done when: setting a character picture uploads a file and stores a URL, existing pictures are migrated once, removing a picture or a character removes the file, and an offline-only writer is unaffected._

---

# BATCH 7 — Real-time simultaneous writing

**Score [+5]. Category: Component Revision — this is a revision to the Joint Post system, not a new component. Its own session, probably several.**

**Read `memory/session_lcars_2026-08-realtime-brief.md` first.**

- [ ] **[+5] Yjs-backed simultaneous editing.**
      This reverses the earlier "explicitly NOT building simultaneous typing" line, deliberately and at the user's request, after turn-based Joint Posts was built, shipped in 4.24 and used by two writers. The reason is competitive, in their words: _"otherwise people will just choose Google Docs over LCARS."_
      The CRDT is the easy half — **Yjs is solved and must not be hand-rolled.** The project is that this editor is a hand-rolled `contenteditable` whose marker, name-bolding and character-colour passes rewrite its HTML in bulk, which a character-level CRDT binding cannot survive.
      **The build-step question is now settled by Batch 3.** The offline download is frozen, so a bundler no longer costs the one-file copy. Vendoring a pre-built bundle remains an option; it is no longer forced.
      **Keep the turn-based system as the offline and fallback path** — it is not superseded by this, it is what this falls back to.
      _Reads much better after Batch 1 has simplified the detection passes._
      _Done when: two writers can type into the same sim at once without losing each other's words._

---

# BATCH 8 — Signatures

**Score [+1]. Category: New Component.**

**Why here:** genuinely new, and it needs Batch 1 (the Characters page hosts the setting), Batch 2 (insertion must respect the output rules) and Batch 3 (joint-post compatibility) to exist first. Small once those land.

- [ ] **[+1] Per-character signatures.**
      At least one and ideally several standard signatures per character, set from the Characters page, automatically added to a sim when that character is in the scene. **Must work in joint sims.**
      _Done when: a writer sets a signature on a character and it appears correctly in a solo sim and a joint one._

---

# BATCH 9 — Guide rebuild

**Score [+3]. Category: External Connection.**

**Why alone, and why late:** it documents the app, so every batch above changes what it has to say. Building it before Batches 1–5 means writing it twice.

- [ ] **[+3] A new guide, from the ground up.**
      `LCARS-Guide-v2.html` predates accounts, Delta Prime, Joint Posts, share links and the importer removal. Start fresh and rethink the format rather than patching.
      **Two tiers:**
      1. **"What you need to get started"** — short, and **merged with the current wizards and popups** so the in-app onboarding and the guide are one thing rather than two that drift.
      2. **Full feature reference** — everything else, in detail.
      **Plus:** a working **search**, and a clear, accessible **sidebar table of contents whose structure mirrors the Settings menu**, so the guide and the app agree on how the tool is organised. Styled to match the app.
      _Done when: the guide matches the shipped app, onboarding is not duplicated between the wizard and the guide, and a writer can find any feature by searching or by scanning the sidebar._

---

# BATCH 10 — Documentation for other people

**Score [+3]. Category: External Connection + Future Integration.**

**Why these together:** all writing, no code, no app state to load. A single clean session. **This batch could move much earlier** — it is zero-risk, and the HQ note in particular is *more* useful before Batch 1 than after, since Batch 1 is the first thing making a decision on HQ's behalf.

- [ ] **[+2] `TOOLKIT.md` — the parsing contract.**
      For the sim-parsing tool a friend is already building. Clear, current, tech-stack-oriented guidance on how we handle the input/output process: character colouration, and how the components of a sim are parsed and represented — locations, dialogue tags, OOC, thoughts, markers, indentation.
      _Authoritative sources are `lcars-render.js` (`lrToReadingHtml()`) and the editor's `copy` handler — not `applyMarkers`, which is a writer's aid and tints things a reader should never see._
      _Done when: someone outside this repo can write a parser against it without reading `lcars.js`._

- [ ] **[—] SB118 HQ integration note → `memory/`.**
      What HQ owns, what LCARS must not duplicate, and where the identity seam goes. Written **now** so it constrains later design rather than being reconstructed under pressure. See Batch 12.
      _Done when: a memory file exists that a future session can read before making any decision that touches character data or identity._

---

# BATCH 11 — Housekeeping & verification sweep

**Top score [+3]. Category: Testing + Component Revision.**

**Why these together:** every item is small, none needs deep context, and several may close with no code at all. One sweep beats five interruptions.

- [ ] **[+3] Retire GitHub Pages.** _Removing._
      No harm in it running while it actively forwards people to Vercel, but it is a second origin holding separate `localStorage` and a second copy of `main`.
      _Done when: Pages is switched off._

- [ ] **[+2] Reconcile prompt — decide, then close.**
      The "show me what's mismatched" ask **is already built.** `cloudBoot()` (~line 1950) lists, by title and date, the sims that exist only on this device and only in the account, under two headings saying exactly which set is lost by each choice — and it only raises the prompt when this device is *ahead* of the account. What is still missing is only the original "I'm not sure" merge option (union of missions, scenes and docs).
      _Done when: the merge option is either built or the item is deleted as not worth it._

- [ ] **[0] Test: linking a provider account already linked to a different Writer ID.** _Testing._
      Should refuse with "That account is already linked". The translation exists in `prettyOAuthError`, but the live refusal text has never been seen, so the match may not fire.
      _Done when: the refusal has been triggered against the live project and reads correctly._

- [ ] **[−2] Test: cross-device snapshot history.** _Testing._
      Probably works; fix surgically if not.
      _Done when: a sim written on device A shows its full snapshot history on device B._

- [ ] **[−2] Confirm orphaned auth users are clear.** _Testing._
      Logins whose `writers` row was deleted by hand still hold their Writer ID. Find with a left join from `auth.users`; delete from the dashboard or with a `created_at` guard so an in-progress signup is never caught. **Believed already handled by the user** — historical only, since deletion through LCARS no longer does this.
      _Done when: the query returns nothing, and this item is deleted._

- [ ] **[—] Cobweb sweep.**
      Dead code, stale comments, orphaned CSS, unused functions, half-migrated patterns. **Bounded to one subsystem per pass, never open-ended** — it is closer to testing than to fixing, and an unscoped version of it scores far higher than it deserves.
      _Done when: the chosen subsystem has nothing left in it that no longer runs._

---

# BATCH 12 — Blocked or deferred

**No batch scheduled.** Each is gated on something above, or on an external party. Listed with what unblocks it.

## External Connections

- [ ] **[+1] Google Groups extension.** → **after Batch 6.**
      New `extension/` directory, MV3, content script scoped to `groups.google.com`, porting the existing dev-console script into a "Send to LCARS" button. Writes to Supabase as an inbox row so LCARS need not be open. Loaded unpacked.
      _Explicitly blocked on the docs-storage architecture — build it once we know how sims live in the database._
      _An iframe cannot work — Google sends `X-Frame-Options`. A bookmarklet is fragile against their CSP._
      _Done when: a real thread can be grabbed and appears in the LCARS inbox with formatting intact._

- [ ] **[+1] Post → email, or direct to Google Groups.**
      Click the Post button and have the sim become an email — or post straight to the group, if a Google account is linked. Same underlying architecture question as the extension.
      _Done when: posting a finished sim does not require a manual copy-paste._

## New Components

- [ ] **[+1] Notifications.** _Low priority, future follow-up._
      There is no notification surface anywhere in the app. It would serve joint sims (nobody is told when a sim is handed to them by the deletion transfer, or when they are removed from one), the moderator PIN-reset queue (currently a bare count in the header), share links expiring, a forced PIN change on a temporary PIN, and later anything HQ pushes at a writer.
      _Note: the Groups extension writes "an inbox row" and notifications need somewhere to land. Decide deliberately whether that is one surface or two._
      _Done when: a writer is told about things that happen to them without having to go looking._

- [ ] **[−1] Side-by-side reference view.**
      Open previous sim(s) in the same scene alongside the editor, for reading and copy/paste of content.
      _Done when: a writer can read an earlier sim in the scene and copy from it without leaving the editor._

- [ ] **[−1] Mission Log — bring it back, as its own tab.** → **needs the sim-archive link to exist.**
      **Currently hidden — `renderMissionLog()` returns `''` unless `isSuperAdmin()`.** Shipped in Batch 1 under the sims list when the Service History tab it lived in was removed, then gated, because on its own it is half a feature: the value is writing a summary per mission and **exporting it as wikitext along with a list of that character's scenes and sims**, and there is nothing to cite until a posted sim resolves to an archive URL. Data is untouched — `c.missionNotes` and `c.srMissionSortDesc` are still stored and still sync, so notes already written come back with it.
      **When it returns it wants to be a tab again, not a section under the sims list** — buried under a long sims list is why it was gated rather than left visible. If it is ever shown inline instead, the sims list needs a capped height with its own scroll and/or collapsible mission headers, or the log is unreachable in practice.
      _Same gate as the quote export below, and the same reason. Do both in one session._
      _Done when: a writer can write a mission summary and export it, with the scenes and sims it covers, as wikitext whose citations resolve to the archive._

- [ ] **[−1] Wikitext quote export.** → **needs the sim-archive link to exist.**
      Select a portion of a sim and export it as a **formatted wikitext quote with a citation**, where the citation links to the sim in the archive.
      _Whole-sim wikitext export was considered and dropped: people should link to the sim archive rather than copying whole sims onto the wiki._
      _Done when: a selection exports as a citable wikitext quote that resolves to the archived sim._

## Future Integrations

- [ ] **[+1] SB118 HQ.** _The big one._
      HQ is being developed now and manages a lot of information, including user accounts and character data. The tool will be pitched to the user's group as a free "feel free to use this", and the first question will be if and how it integrates with HQ.
      **The near-term work is not integration — it is building capacity for it now**, and eliminating things that would make it harder or create redundancy. That is already why the character wiki import was scrapped and why Service History and Ribbons are being removed in Batch 1. Keep an identity seam so HQ SSO can slot in later (this is also why Google/Discord were rejected as a primary sign-in: the fleet's own SSO is the likely long-term route, and building OAuth now would mean building it twice).
      _Done when: LCARS can read character and account data from HQ rather than holding its own copy._

- [ ] **[−2] Sim-parsing tool.** _A friend's project, already underway._
      Near-term deliverable is `TOOLKIT.md` in Batch 10, not code. Overlaps conceptually with Joint Posts — compare notes before building anything.
      _Done when: the two tools agree on a format without either having to read the other's source._

- [ ] **[−3] SB118 public sim archive / Google Groups lookup.**
      The tool should be able to do some basic work to figure out how a posted sim can be found online. Prerequisite for both the wikitext quote export and the Mission Log's return above.
      _Done when: a posted sim can be resolved to its archive URL from inside LCARS._

---

# Parallel processes

Not development, not batched, and **user-triggered** — they run when the user says so.

- [ ] **Positioning & pitch document.**
      Documenting the features and benefits of LCARS **in comparison to what people currently use to write sims** — Google Docs, plain Gmail, Word — so it can be sold properly, with anticipated pushback identified and answered in advance.
      This is parallel to development and important, but it is **not part of the development queue**. The user will trigger it when the time is right.

---

# Decisions on record

Settled, with reasons. Do not re-open without a new one.

- **The one-file offline download is frozen.** _2026-08-24._ Stops at a stated version rather than absorbing online-only features. A purpose-built "LCARS Lite" is the preferred future answer over shoehorning. See Batch 3.
- **Character wiki import — scrapped.** _2026-08-24._ `parseServiceRecordWikitext()` / `parseRibbonsWikitext()` and the whole import idea are dropped, along with the service record and ribbon data they would have filled. SB118 HQ already tracks character data; building it here creates redundancy that makes integration harder.
- **Whole-sim wikitext export — dropped.** _2026-08-24._ Replaced by the quote-with-citation idea. People should link to the archive.
- **Snapshot diffs — dropped.** _2026-08-14._ The benefit disappeared when snapshots moved out of the synced payload. Diffs would add a failure mode (one corrupt diff breaks the reconstruction chain) to solve a problem that no longer exists.
- **Custom domain — no.** The `.vercel.app` subdomain stands.
- **Google / Discord as the primary sign-in — no.** Writer ID + PIN is sufficient, and the fleet's own SSO is the likely long-term route. They remain a *linked* identity for recovery.
- **No Edge Functions and no recovery email.** Both were considered at length and rejected — the reasoning is in `memory/session_lcars_2026-08-recovery-deletion.md`.
- **Views are routed inside one app, not separate pages.** Settled 2026-08-14. Share links are the deliberate exception — a genuinely separate minimal page, so a reader does not download the whole application.

---

# How to use this file

1. **Pick a batch, not an item.** The batches exist so one session loads one subsystem. Reprioritise batches freely; the order is a default.
2. **Read what the batch tells you to read first** — `memory/MEMORY.md` and the files it flags.
3. **Check items off in the same commit as the code change.**
4. **When a version is cut**, move the shipped items' descriptions into `CHANGELOG.md` and delete them here.
5. **Never let an item sit without a "Done when…"** — if you can't write one, it isn't ready to be on the roadmap.
6. **Never let an item sit without a category and a score.** If a score looks wrong, say so in the item rather than silently reordering.
