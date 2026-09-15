# The auth gate, the feedback ticket queue, and the front page — September 2026

**Shipped to `main` 2026-09-14/15, in `pending` (not yet cut as a version).**
Read before touching `showAuthGate()` / `gateChoice()` / `GATE_ABOUT`, the
admin feedback queue, `fbViewImage()`, or anything under `img/`.

Three pieces of work in one session, from a list the user brought rather than
from the roadmap: the Admin panel's feedback and storage surfaces, a rebuilt
sign-in gate, and a "What is LCARS?" section under it.

---

## 1. The gate does not use the duty accent, and that is the whole point

The sign-in screen rendered in **Command Red** and read as an alert on a page
whose job is to be welcoming. It looks like a theming mistake. It is not: it is
a category error.

`--ac` is the **duty accent**, and the duty post is a personalisation that only
exists **once somebody has an account**. A signed-out visitor has no duty post,
so `STYLE_DEFAULTS` fell through to `command` — first in the list, the most
saturated of the seven, chosen by nobody.

So the gate has its own fixed palette, a muted slate, and it is **not** part of
the duty system. It still follows light and dark.

**It is set as TOKEN overrides on `#auth-gate`, never as button overrides**, and
that decision is load-bearing. `:root[data-skin="prime"] body .btn-p:not(.st-btn)`
is three classes deep and beats anything that could be written for the gate — so
instead of fighting it, `#auth-gate` redefines `--amber`, `--on-ac`, `--panel`,
`--text` and the rest, and every `.btn` inside inherits slate for free. Nothing
outside `#auth-gate` can see them.

**When sharing those tokens with another element, share the tokens only.** The
image viewer needed the same palette, so it joined the selector — and inherited
the gate's `position`, `inset` and `z-index: 9000` along with it, which put the
viewer back underneath the gate that opened it. Tokens and layout are separate
rules now.

Light is what most people see (`mode` defaults to `system`); dark slate exists
because a bright white gate in front of a dark app is its own kind of jolt.

---

## 2. The trusted / untrusted split in `fbViewImage()`

`fbViewImage()` shows a picture in a sandboxed `srcdoc` iframe. That is the
right shape for a **feedback capture** — arbitrary DOM from a stranger's
browser — and it is not negotiable for that case.

It is the **wrong** shape for a file we ship ourselves, and the failure is
worth remembering because nothing about it is visible locally:

> A sandbox without `allow-same-origin` gives the frame an **opaque origin**, so
> its request for the image is not same-site. A Vercel **preview deployment is
> behind SSO with a `SameSite=Lax` cookie**, which therefore does not go with
> that request. The image came back as a login redirect and the viewer opened
> empty.

It worked on localhost. It would have worked in production. It failed on
**exactly the deployment being reviewed**, which is the only place anybody was
looking. Diagnosed by fetching the preview URL directly and seeing the 302 to
`vercel.com/sso-api`.

`fbViewImage(url, title, trusted)` now takes a third argument. Ours is a plain
`<img>`; a capture still gets the iframe.

**The check that missed it asserted that the frame existed.** The one that
catches it asserts the image **decoded** — `complete` and `naturalWidth > 0`.

Two more things about that viewer: it opens **above** the gate (9500, not the
old 1100), and the `gate-view` class comes **off** on close, or the next
feedback capture opens in slate.

---

## 3. Images in the app, in a project with no build step

Four screenshots live in `img/` as **WebP at 1600px, ~296 KB for all four**,
`loading="lazy"`, only ever fetched on the gate.

- **Not base64.** Inlining them would have added megabytes to `lcars.js`, which
  every writer downloads on every visit.
- **`vercel.json` needs a cache-header entry** — `/img/(.*)` gets
  `max-age=31536000, immutable`, the opposite of the app files, because these
  are content-stable and versioned by name.
- **`api/download.js` is untouched and stays frozen.** `showAuthGate()` returns
  early on `isFileCopy()`, so the gate never renders in the offline copy and the
  images are never needed there. This is the one case where a new shared file
  does *not* mean touching the inliner.
- There is no `cwebp` or PIL on the sandbox. **Chromium encoded them** —
  draw the PNG into a canvas, `toDataURL('image/webp', 0.82)`.

---

## 4. One DOM, two layouts

The "What is LCARS?" grid is a pair of headings side by side with their two
pictures on the row beneath, and on a phone one column with each picture under
its own heading.

Cells are emitted in **reading order** (heading, its picture, the next heading)
— what a phone shows and what a screen reader follows — and the wide
arrangement is `order` on each cell, carried as a `--o` custom property from the
renderer. **A second copy of the markup was rejected**: it would drift out of
step with the first.

A picture row holding one picture would push the next heading into the second
column and shear every row below it, so the renderer emits a filler cell. The
current six groups never hit it.

**Verify this by reading the cells back in VISUAL order** — top to bottom, then
left to right. DOM order is deliberately different, so checking DOM order agrees
with itself whichever layout is actually on screen.

---

## 5. The feedback queue became a ticket system

- `title` (100 chars) and `ticket_no` on `feedback_reports`; numbers backfilled
  oldest first, **computed rather than drawn from the sequence**, because
  `nextval()` inside an `UPDATE` is not handed out in the order of the `ORDER BY`.
- The admin queue is one scannable row per ticket, opening on click, in a
  scrolling box with a search over number, headline, writer, status and body.
- **The context line and console errors fold away behind Technical details.**
  They were the first thing on every ticket and said nothing to anyone reading
  the queue. `ResizeObserver loop completed with undelivered notifications` is
  browser chatter, not a bug, and was arriving five times per report; it is
  filtered at capture *and* on the way out, because reports already filed still
  carry it. The user-agent is condensed to `Chrome 152 on Windows`, raw string
  behind the fold.
- The note back to the writer is **prefilled and editable**, which forced
  `p_clear_note`: with the box prefilled, empty means the admin deleted the
  reply, and a null could not say that.
- Every new RPC argument has a **default**, and the client retries without them
  on `PGRST202`, so the deploy can go out before the migration.

### Storage & Usage

`admin_usage_overview()` counted sims with `jsonb_array_length(payload->'docs')`
— but **`S.docs` is an object keyed by sim id, not an array**. Postgres raised
`cannot get array length of a non-array` and took the whole report down rather
than one column.

**The test fixture used an array**, which is the only reason 68 passing checks
never caught it. The fixture is the real shape now, and both shapes are tested.

The panel leads with **two capacity bars, never one**: Supabase meters the
database and the file buckets against **separate allowances**, so a combined bar
would be a number that does not exist. `db_bytes` is `pg_database_size()` — the
whole database — because that is what the allowance is measured against; the
app's own three tables are drawn as segments of it and the remainder is
"Everything else".

The limits are **hardcoded** as `SUPA_DB_LIMIT` / `SUPA_FILE_LIMIT`; Supabase
publishes no API that reports the plan.

---

## 6. What the phone found that the harness did not

The Learn more prompt under the card was off screen on a real phone. The card
was **672px**; a phone with its browser chrome showing has roughly **640–700px
of `svh`**, so the card filled the screen by itself and anything after it was
below the fold by definition.

It passed at 390×844 with 62px to spare. **844 is the height with the chrome
hidden.** `CLAUDE.md` already carried the landmine — *Playwright cannot tell
`svh` from `dvh`; test at a viewport shorter than the worst case* — and it was
not followed, because 62px of margin read as comfortable.

Fixed to 569px with **no content cut**: the two provider buttons share a row
(the section heading already carries the verb, so they only name the provider),
the work-in-progress note lost two words to fit on one line, and phone-only
spacing was tightened. Air, not words.

Note on that note: dropping only the word "and" was **not** enough — "project."
stayed behind as a widow on a line of its own, which was the actual complaint.
It took two more words.

Still 41px short at 360×600. Left there deliberately; fixing it needs the hint
pinned to the bottom edge, or copy cut.

---

## Decisions not to re-litigate

- **The gate is outside the duty system.** It is not a missing theme rule.
- **Four screenshots, not six.** A picture under every heading turns the
  section into a gallery; two of the groups have nothing a photograph explains.
- **Gold screenshots against slate chrome**, the user's call — they sit warm
  against the gate rather than echoing it.
- **The offline download stays frozen.** The gate does not render there.
- **Admin-only changes get at most one changelog line.** Ten pending entries
  were folded into four: entries are read by writers, and two of the ten were
  about a screen only one person can open.

## Demo data

`memory/` does not hold it, but there is a scrubbed `.lcars` export used for the
screenshots: one invented character (Ensign Elle Carrs) plus filler sims taken
from a real account with **every other character name replaced** — 465
occurrences across 16 names. If more screenshots are ever shot from it, note
that `Amity Outpost` and `Pintarr Station` are still real place names in the
filler sim bodies. No shipped screenshot shows either.

One trap from that job worth keeping: a replacement name must use the **same
apostrophe** as the existing data. `R'Vell` (straight) and `R’Vell` (curly) are
two different characters to `detectChars`, `applyNameBold` and `charColors` —
one of which gets no colour and no attribution.
