---
name: feedback-changelog
description: Must append pending changelog entry to VERSIONS array in LCARS.html as part of every code-change commit — never defer
metadata: 
  type: feedback
---

After every code change to `LCARS.html`, immediately add a pending entry to the `VERSIONS` array (near the top of the script, after `const SKEY`). Do it in the same commit — never batch or defer.

**Why:** User noticed changelog was not being updated after fixes (e.g. the character manifest crash fix was missing). This broke the version tracking workflow.

**How to apply:** Every time I edit `LCARS.html`, before committing: check if a `pending` entry exists in `VERSIONS` and add to its `changes` array, or create a new one. Format: `{ version: 'pending', date: 'YYYY-MM-DD', changes: ['...'] }`. See [[feedback-git-workflow]] for commit/push rules.
