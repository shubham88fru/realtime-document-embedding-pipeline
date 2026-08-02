# 01 — Project setup and infrastructure foundation

**What to build:** Next.js project with TypeScript, shadcn/ui, TailwindCSS, environment configuration, basic folder structure, and local development setup.

**Blocked by:** None — can start immediately

**Status:** done

- [x] Next.js project initialized with TypeScript
- [x] shadcn/ui components installed and configured
- [x] TailwindCSS configured with custom theme
- [x] Environment configuration setup (development, staging, production)
- [x] Basic folder structure (components, lib, services, types)
- [x] Local development server running
- [x] Git repository initialized with .gitignore
- [x] README with setup instructions

## Comments

**Implementation notes**

- Next.js 16.2.12 (App Router, Turbopack), React 19.2.4, Tailwind v4, TypeScript
  strict, `src/` layout with the `@/*` alias.
- `create-next-app` refuses to scaffold over a directory containing `.scratch/`
  and `AGENTS.md`, so the app was generated in a temp directory and moved in.
  Its own `AGENTS.md`, `CLAUDE.md` and `.git` were discarded.
- **`APP_ENV` is separate from `NODE_ENV`.** Next.js only recognises
  development/test/production and has no notion of staging, which the spec
  requires. `APP_ENV` is required with no default, so a staging deploy cannot
  silently report itself as development.
- **Test seam.** Vitest + Testing Library, node environment by default.
  `parseServerEnv` /
  `parseClientEnv` are pure functions over a supplied source object, so config
  behaviour is tested without mutating `process.env`. `readServerEnv` takes an
  injectable `isBrowser` flag for the same reason. 12 tests cover validation,
  aggregate error reporting, environment discrimination, limit coercion and the
  server/client boundary, plus the `serverEnv()` / `clientEnv()` accessors.
- **Pipeline limits live in config**, defaulting to the spec's values (10 files,
  5 MB, 10 concurrent). Ticket 04 should read `limits.maxUploadFiles` and
  `limits.maxFileSizeBytes` rather than re-deriving them; ticket 12 should read
  `limits.maxProcessingConcurrency`.
- **Custom theme** adds `status-{uploaded,processing,complete,error}` colour
  tokens keyed to `DocumentStatus` in `src/types/document.ts`, for tickets 09
  and 10 to render against.
- Fixed a latent bug in the generated scaffold: shadcn's theme reads
  `--font-sans`, but the layout defined `--font-geist-sans`, leaving
  `--font-sans` self-referential and the font silently falling back.
- `src/services/` is empty apart from a `.gitkeep`; it is the seam the spec
  names for business logic, to be populated from ticket 04 onward.

**Environment caveat**

Installs fail with `npm error code EALLOWREMOTE` behind the npm proxy configured
on this machine: it serves metadata whose tarball URLs point at
`ms-feed-*.pkgs.visualstudio.com`, a different host from the registry, which npm
12 classifies as "remote" and blocks by default. Workaround, documented in the
README:

```bash
npm_config_allow_remote=all npm install
```

Left as a per-command override rather than a committed `.npmrc`, so the stricter
npm default still applies for anyone not behind that proxy.

**Deferred**

- No CI workflow — not in the acceptance criteria, and no ticket covers it.
- `npm audit` reports high-severity advisories from transitive dev dependencies
  of the scaffold; none are in the runtime path. Worth a look before deploy.

**Review findings addressed**

`/code-review` raised three issues against the first pass; all are fixed.

1. **Configuration was never validated at boot** (medium). `serverEnv()` is
   lazy and memoised, so validation ran on the first HTTP request, not at
   startup — contradicting both the README and `.env.example`. A misconfigured
   deployment booted healthy and then 500'd every request, which is exactly the
   failure mode that passes a container health check and lets a bad rollout go
   green. Fixed with `src/instrumentation.ts`, which validates in Next's
   `register()` hook. Next catches errors thrown from that hook and keeps
   serving, so the handler exits the process explicitly. Verified:
   `APP_ENV=bogus npm start` now exits 1 naming the offending variable, where
   before it served 500s indefinitely.
2. **jsdom tripped the browser guard in every test** (medium). The global
   `environment: "jsdom"` meant `typeof window !== "undefined"` was always
   true, so `serverEnv()` threw in any test that touched it — which would have
   hit ticket 04 and 12 the moment they read `limits`. The default is now
   `node`; component tests opt in per-file with a `// @vitest-environment
   jsdom` docblock, and the setup file registers DOM matchers only when a
   document exists.
3. **The accessors application code actually calls were untested** (low), and
   one assertion was weak — `.toThrowError(/server/i)` would have passed
   against `TypeError: readServerEnv is not a function`. Tightened to match the
   guard message, and added coverage for `serverEnv()` memoisation and
   `clientEnv()`. 12 tests → 15.

The review confirmed the rest: `positiveInteger` rejects `""`, whitespace,
decimals, exponents and negatives while defaulting correctly; memoisation
doesn't cache failures; no secrets leak into error messages; the custom theme
compiles; and the `--font-sans` fix genuinely takes effect in the cascade.
