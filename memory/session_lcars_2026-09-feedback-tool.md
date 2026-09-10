# Session — the App Feedback tool and the admin usage overview (2026-09-06 → 09-10)

_ROADMAP **Batch 5**, shipped to `main` 2026-09-10 and live. **Not cut as a
version** — pending entries sit in the `VERSIONS` array waiting on a bump._

Read alongside `session_lcars_2026-08-recovery-deletion.md` (why `security
definer` and no Edge Functions) and `session_lcars_2026-09-mobile.md` (the
header row that is also the phone's app menu).

## What shipped

| Area | Outcome |
|---|---|
| Filing | App Feedback button in `.hdr-right`, opening a **non-blocking side panel** — nothing behind it is disabled, because a writer describing a bug needs to keep looking at it |
| Attachment | A **real screenshot**: `getDisplayMedia()` on a computer, a file input on a phone |
| Queue | `/admin`, super admins only, via `admin_list_feedback()` |
| Statuses | New / Implementing / Will revisit / Rejected |
| Reply | One note, landing on the writer's own copy under **My reports**, with a badge |
| Withdrawal | The writer can take a report back at any status; the row goes entirely |
| Purge | Archive and delete both destroy the stored image |
| Usage | `admin_usage_overview()` — per writer: sims, joint sims, snapshots, files, bytes, last active |

Two migrations: `supabase/migrations/2026-09-07-feedback.sql` and
`2026-09-09-feedback-statuses.sql`, both applied. Tests:
`supabase/test/feedback_test.sql` (25 of the 68 checks) and
`test/feedback_browser.js` (39 checks, two contexts — a writer and a super
admin).

## Decisions — do not re-litigate

- **The reply lands on the writer's own report, not in a notification.** There
  is no notification surface in this app (ROADMAP has it as its own deferred
  item). A reply goes where the writer already has a reason to look, and the
  badge is a badge on a button, not a system. When notifications are built they
  can read `writer_seen_at` off the same column.
- **Reports are select-only to their owner; everything else is a function.**
  Filing, actioning, archiving, deleting and withdrawing all go through
  `security definer` functions, so the rate limit and the role checks cannot be
  sidestepped by writing to the table. Same reasoning as `admin_list_writers()`:
  a function is the narrow version of the permission.
- **The bucket is PRIVATE**, unlike `character-pics`. A screenshot can hold
  unposted sim text — on a joint sim, somebody else's. Admins read it over a
  signed URL.
- **Withdrawal deletes the row rather than flagging it.** Half-deleting would
  leave the sim text in the database, which is the most likely reason for
  withdrawing in the first place.
- **The status vocabulary names an OUTCOME.** "Responded" was removed because a
  note reaches the writer whatever the status is, so a status meaning "I
  replied" said nothing the note had not.

## The auto-screenshot question, and how it actually resolved

The roadmap said "auto-screenshot of the currently open pane". **There is no
way to do that silently in a browser.** What was ruled out, and why:

- **html2canvas / html-to-image.** Free and MIT, and could be vendored without a
  build step — cost was never the objection. It does not screenshot; it walks
  the DOM and *redraws* it with its own engine, and **it cannot draw
  `backdrop-filter`** — which on this project is the Epic vibe's frosting, and
  the single property most likely to be causing a visual bug. A capture that
  cannot show the fault is worse than none.
- **`getDisplayMedia()`.** Real pixels, and now what ships. It **cannot be
  silent** — every browser insists on its own confirm and no flag removes it —
  so the button says so rather than looking broken. `preferCurrentTab` puts this
  tab in front of the picker. Not implemented at all on iOS Safari.

**The dead end worth remembering: a DOM-copy "page capture" was built, shipped,
and then removed four days later.** It serialised the live DOM with the
stylesheet linked, which reasoned well and failed in practice — Storage would
not serve it as HTML, and inside a sandboxed frame the stylesheet did not
survive, so an admin got an unstyled wall of text. The user's verdict, which was
right: *"I never asked for this feature."* The roadmap said screenshot; the DOM
copy was a workaround for "screenshots are impossible", and once
`getDisplayMedia` disproved that premise the workaround had outlived its reason
and should have gone immediately rather than being defended.

**The context block was kept** — skin, mode, vibe, viewport, doc type and the
last five console errors, a few hundred bytes of `jsonb`. Not a capture, and
with the page copy gone it is the only thing that makes a report reproducible
rather than merely visible.

## What four rounds on a real phone cost

Every one of these passed a green browser suite first.

1. **An attachment failure threw out of the whole send.** A writer who had just
   described a bug lost every word of it because the *picture* failed. The words
   are the report; an attachment is an extra and must be allowed to fail on its
   own. **Generalise this: never let an optional enrichment take the payload
   with it.**
2. **`window.open()` + `document.write()` is blank on iOS Safari.** The preview
   button was never tested on the platform these reports are filed from — the
   suite ran in headless Chromium, where it works. Anything opening a window
   needs an in-app fallback, and on this project the in-app version should just
   be the default.
3. **Supabase Storage serves an uploaded page as `text/plain`.** An admin
   opening a capture got its source and an offer to save `page.txt`. Not
   fixable from the upload side; render it yourself.
4. **The first error message sent the user looking in the wrong place.** "The
   capture could not be uploaded" hid "Bucket not found". **Relay what the
   server said** — a generic message costs a debugging round every time.

## Migration ordering — the better rule

The documented rule is *deploy before migrating*. This session found its limit.

Migration 2 changed a `check` constraint, where **neither order is safe**:
migrate first and the deployed build writes `in_development` into a column that
refuses it; deploy first and the new build writes `implementing` into a column
that has not learned it. The answer is **a constraint that accepts both
vocabularies**, which makes the order irrelevant. Prefer that to getting the
order right.

**A standalone migration file can also clobber a later one.** Re-running
`2026-09-07-feedback.sql` after `2026-09-09` puts the *original*
`admin_feedback_status()` back via `create or replace`, and Implementing stops
being accepted. Verified, not assumed; a warning is at the top of that file. The
safe habit is to run `schema.sql`, which always ends in the current state.

## Where things are

- `lcars.js` — `fbOpen()` and the writer panel; `fbAdminCard()` / `paintFeedback()`
  and the admin queue; `adminUsageCard()` / `paintUsage()`.
- `LCARS.html` — the button in `.hdr-right` under a phone-only `HELP US` label,
  and `#fb-panel`.
- `supabase/schema.sql` — `feedback_reports`, the `app-feedback` bucket, seven
  functions. `capture_page` is retired but **not dropped**: nullable, unwritten,
  and dropping it would need its own deploy window for no gain.
