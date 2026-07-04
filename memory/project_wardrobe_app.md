---
name: project-wardrobe-app
description: "The Wardrobe & Outfit Planner PWA project — stack, constraints, and repo layout gotcha"
metadata: 
  type: project
---

Wardrobe & Outfit Planner: a private, zero-cost, mobile-first PWA for two partners to catalog separate wardrobes and plan outfits. Started 2026-07-02 from a brief in the user's Downloads.

**Hard constraints:** Zero cost (free tiers only). Frictionless mobile UX — one user is easily frustrated by clunky/password friction. Two wardrobes stay independent (RLS-enforced, never merged).

**Stack (user approved "your call" on backend):** Vite + React + TS SPA, installable iOS PWA (vite-plugin-pwa). Supabase (Postgres + Storage + Auth) free tier. Client-side WebP image compression before upload, original discarded. Chose Supabase over Firebase because Firebase Storage now needs a billing card.

**Auth model (user's idea):** "master password once per device, PIN every time." Each person is a separate Supabase account; real password = `MASTER::PIN`. Master cached in localStorage per device; daily login is just a 4-digit PIN. Seed script creates the two accounts.

**Repo layout GOTCHA:** `D:\Claude Work` is a general workspace, NOT the LCARS folder — but it has the sb118-lcars git repo initialized at its root (LCARS files sit at the top level, not nested). So anything created under `D:\Claude Work` lands in that repo's working tree by default. Wardrobe (`D:\Claude Work\Wardrobe`) was given its OWN nested git repo to keep history separate. No remote yet. User may later move it to its own top-level folder.

Deferred to later (per brief): AI/smart outfit matching, wear history. Data model already rolls tags up per outfit to support AI matching later.
