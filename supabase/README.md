# Supabase setup

Project: `nyjpqaelilrqzmnangft`
URL: `https://nyjpqaelilrqzmnangft.supabase.co`

The anon/public key is safe to embed in `LCARS.html` — row-level security is what
protects the data, not the key. The **service_role** key must never appear in this
repo or in the app.

## 1. Run the schema

Dashboard → **SQL Editor** → **New query** → paste all of `schema.sql` → **Run**.

Expect "Success. No rows returned." Every statement is idempotent, so re-running
after a change is safe.

Verify: **Table Editor** should now list `writers`, `state` and `snapshots`, each
showing "RLS enabled".

## 2. Turn off email confirmation

Writer-ID accounts use a synthetic address (`<writerid>@lcars.local`) that cannot
receive mail, so confirmation must be off or nobody can sign in.

**Authentication → Sign In / Providers → Email** → turn **Confirm email** off.

## 3. Enable Google and Discord (optional, can be done later)

**Authentication → Sign In / Providers**, enable each and paste in the client ID
and secret from that provider's developer console. Each needs this callback URL:

```
https://nyjpqaelilrqzmnangft.supabase.co/auth/v1/callback
```

- Google: <https://console.cloud.google.com/apis/credentials> → OAuth client ID → Web application
- Discord: <https://discord.com/developers/applications> → New Application → OAuth2

## 4. Allow the app's URLs

**Authentication → URL Configuration**:

- Site URL: `https://sb118-lcars.vercel.app`
- Redirect URLs: add `https://sb118-lcars.vercel.app/**` and `http://localhost:*/**`

Without this, OAuth logins bounce back to the wrong place.

## Notes

- **PIN reset is not self-serve yet.** Because the auth email is synthetic, the
  standard "forgot password" mail has nowhere to go. For now a forgotten PIN is
  reset from Dashboard → Authentication → Users. `writers.recovery_email` exists
  so a writer can be identified; wiring up genuine self-serve reset needs an Edge
  Function and is tracked in `ROADMAP.md`.
- **Free tier** pauses a project after ~1 week with no activity. It resumes from
  the dashboard, but is worth knowing during quiet stretches early on.
