# 03 — Google authentication

**What to build:** NextAuth.js v5 with Google OAuth, user session management, protected routes, and user profile storage in database.

**Blocked by:** 01 — Project setup and infrastructure foundation, 02 — Database schema and migrations

**Status:** done

- [x] NextAuth.js v5 installed and configured
- [x] Google OAuth provider configured with credentials
- [x] User session management implemented
- [x] Protected route middleware created
- [x] User profile storage in database on first login
- [x] Sign-in/sign-out UI components
- [x] Session persistence and refresh
- [x] Environment variables for OAuth credentials
- [x] Authentication flow tested end-to-end

## Comments

### Auth.js configuration

Auth.js v5 beta 32 is pinned exactly. Google is the only production provider.
The public route is `/sign-in`; `src/proxy.ts` protects application routes and
excludes static assets. The OAuth callback to register in Google Cloud Console
is:

```text
http://localhost:3000/api/auth/callback/google
```

Production and staging use the equivalent HTTPS origin. `AUTH_SECRET`,
`AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` are required and validated during
Node startup.

### Identity and sessions

The session is an encrypted, HTTP-only JWT cookie with a 30-day maximum age.
Active sessions refresh through Auth.js and expose the application's UUID as
`session.user.id`.

Google's stable OpenID Connect `sub` is stored as `users.google_subject`; email
is not used as the long-term identity. A first login can safely attach Google to
an existing seed/import row with the same email, but a row already owned by a
different Google subject is never reassigned.

Only Google profiles with `email_verified: true` are accepted. Name, email and
photo refresh on each sign-in.

### Tests

The agreed public seams are covered:

- route authorization policy, including public auth endpoints
- first-login user creation, later profile refresh, existing-email linking and
  cross-subject takeover rejection against a freshly migrated Postgres
- anonymous and signed-in UI states
- Auth.js HTTP flow using an in-process test provider: CSRF, callback, encrypted
  session cookie creation, database persistence, session restoration with the
  application user ID, cookie refresh and sign-out invalidation
- the production server was exercised anonymously: `/` redirects to `/sign-in`,
  the sign-in page is public, Google appears in `/api/auth/providers` with the
  expected callback, and `/api/auth/session` returns `null`

A live Google consent-screen round trip requires developer-owned OAuth
credentials and remains a manual environment check; no credentials are
committed.

### Review findings, all addressed

1. The initial profile upsert failed if a seed/import row already had the Google
   email. Identity reconciliation now links an unclaimed row transactionally
   and rejects takeover of an already linked row.
2. Initial tests did not exercise session creation/refresh/sign-out. The Auth.js
   HTTP integration test now covers the complete cookie lifecycle.
3. Ticket state still said `ready-for-agent` while README claimed completion.
   The canonical ticket is now marked `done`.
4. Concurrent first sign-ins could surface a serializable-transaction conflict.
   Identity synchronization now retries bounded `P2034`/`P2002` conflicts and
   has a concurrent convergence integration test.
5. The proxy exempted every image-like pathname, which could let a future API
   route such as `/api/documents/private.png` bypass authentication. Only
   framework-owned static/image paths and the favicon are now excluded.
6. The README tech-stack footer still listed authentication and PostgreSQL as
   planned work. It now distinguishes completed from future infrastructure.

### Visual follow-up

Ticket 13 owns the visual redesign of the sign-in page and authenticated shell.
It must preserve the authentication behavior and test seams completed here.
