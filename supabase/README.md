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

Verify: **Table Editor** should now list `writers`, `state`, `snapshots` and
`pin_reset_requests`, each showing "RLS enabled".

The editor's linter warns about "destructive operations" and a table created
without RLS. Both are false alarms: the destructive lines are `drop ... if
exists` guards that let the file be re-run, plus a `delete` inside a function
*body* (defining a function does not run it), and RLS is enabled on every table
a few statements after it is created. "Run and enable RLS" is the safe choice.

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

- **PIN reset runs through a linked account.** The auth email is synthetic and
  cannot receive mail, and Supabase's built-in mailer only delivers to project
  team members — so recovery is a linked Google or Discord identity on the same
  auth user instead. `recovery_email` is gone.
- **A writer who never linked one asks a moderator.** "Request a PIN reset" files
  a row in `pin_reset_requests`; a moderator issues a temporary PIN from
  `/admin` in the app. No dashboard visit needed any more.
- **Bootstrap the first super admin by hand** — there is deliberately no route to
  it from inside the app. The statement is in `schema.sql`, commented out, next
  to the role column.
- **No Edge Functions.** Anything beyond the anon key — removing a login,
  purging an expired deletion — is a `security definer` function in
  `schema.sql`, so applying the schema is the whole deployment.
- **Free tier** pauses a project after ~1 week with no activity. It resumes from
  the dashboard, but is worth knowing during quiet stretches early on.
