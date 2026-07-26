# LCARS SB118 Writing Tool — Roadmap

_Outstanding work only, grouped in phases. Current version: **4.2**._

Each item has a **Done when…** so any session can pick it up and run without asking. Check items off (`- [x]`) as they ship, and delete them once they're rolled into a released version's changelog. This is a living doc — add new outstanding work here rather than in scattered notes.

---

## Phase 1 — Data resilience (highest priority)

The user's Gist payload is ~913 KB and the GitHub API content field truncates near 1 MB. This is the one known ticking issue; everything else is lower stakes.

- [ ] **Add a data-size indicator to Settings → Cloud Sync.**
      Show the current payload size (KB) and warn visibly when it crosses ~800 KB.
      _Done when: the user can see how close they are to the limit without guessing, and gets a clear warning before pulls start failing._

- [ ] **Solve the 1 MB Gist ceiling.**
      Pick and implement one of: (a) chunk the payload across multiple Gist files and reassemble on pull, or (b) gzip/compress the JSON before storing. Must stay backward-compatible with existing single-file Gists (auto-detect and migrate).
      _Done when: a >1 MB dataset round-trips (push then pull on a fresh browser) without truncation or "Unterminated string in JSON" errors._

- [ ] **Harden the three-tier pull fallback.**
      Current order: raw_url+auth → raw_url no-auth → API content field. Confirm each tier degrades gracefully and surfaces an actionable message when all three fail.
      _Done when: a pull failure always tells the user which tier failed and what to do, never a bare "Failed to fetch."_

---

## Phase 2 — Documentation (this session)

- [ ] **ROADMAP.md** — this file.
      _Done when: the next session can pick a task and run without clarifying questions._
- [ ] **TECH_STACK.md** — stack + key libraries in one place.
      _Done when: someone can see the whole stack at a glance._
- [ ] **USER_PROTOCOLS.md** — the user's repeatable operating routine.
      _Done when: the user has a repeatable session routine written down._
- [ ] **CLAUDE.md refresh** — lean, accurate, no stale paths.
      _Done when: a fresh session needs no re-explaining of the basics._

---

## Phase 3 — Backlog (user to prioritise)

Candidates surfaced from project notes. Confirm scope with the user before starting any of these.

- [ ] **Storage headroom.** If `localStorage` (or Gist) growth becomes a recurring pain, evaluate migrating primary storage to IndexedDB.
      _Done when: a decision is recorded in TECH_STACK.md (migrate or explicitly defer, with the reason)._

- [ ] _Add real feature requests here as they come up._ Keep each one to a one-line description plus a **Done when…** so it's pickup-ready.

---

## How to use this file

1. Work top-down by phase; Phase 1 first.
2. When you finish an item, check it off in the same commit as the code change.
3. When a version is cut ("save new version X.Y"), move the shipped items' descriptions into `CHANGELOG.md` and delete them here.
4. Never let an item sit without a **Done when…** — if you can't write one, it's not ready to be on the roadmap.
