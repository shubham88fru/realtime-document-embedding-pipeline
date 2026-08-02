# 02 — Database schema and migrations

**What to build:** PostgreSQL database with pgvector extension, users/documents/embeddings tables, migration system (Drizzle or Prisma), and database connection setup.

**Blocked by:** 01 — Project setup and infrastructure foundation

**Status:** done

- [x] PostgreSQL database connection configured
- [x] pgvector extension installed and enabled
- [x] Migration system selected and configured (Drizzle or Prisma)
- [x] Users table schema (id, email, name, photo, created_at, updated_at)
- [x] Documents table schema (id, user_id, status, progress_percentage, error_message, created_at, updated_at, file_url, s3_key)
- [x] Embeddings table schema (id, document_id, vector, chunk_index, content)
- [x] Migration scripts created and tested
- [x] Database seeding for development
- [x] Connection pooling configured

## Comments

### Prisma, at a pinned version

Prisma over Drizzle, at the user's direction. Pinned to **7.9.0** with
`--save-exact`: on this machine's npm proxy the `latest` dist-tag resolves to a
dev prerelease (`7.10.0-dev.35`), so an unpinned install would have shipped a
prerelease ORM.

Prisma 7 drops the Rust query engine in favour of driver adapters, so
`@prisma/adapter-pg` is a runtime dependency and the pool is configured in
application code rather than through connection-string parameters.

### Where the pieces live

- `prisma/schema.prisma` — models, the `document_status` enum, pgvector via
  `postgresqlExtensions`
- `prisma/migrations/20260802164354_init/` — one migration, creates the
  extension itself so a fresh RDS instance needs no manual preparation
- `src/lib/db.ts` — client singleton, pool sizing, `EMBEDDING_DIMENSIONS`
- `prisma/seed.ts` — a dev user and one document per status
- `scripts/load-env-files.ts` — shared by `prisma.config.ts` and the integration
  test config, because neither Prisma nor Vitest loads `.env` files the way
  Next.js does

### Decisions worth knowing about

**Pool size is derived, not configured.** `poolSizeFor()` returns
`MAX_PROCESSING_CONCURRENCY + 5`. Each document being processed can hold a
connection, so a pool merely equal to the concurrency would let a saturated
pipeline starve page loads. Raising concurrency now widens the pool
automatically — ticket 12 should not need to think about this.

**Progress bounds are enforced in the database.** Prisma has no syntax for check
constraints, so `documents_progress_percentage_range` is hand-written SQL
appended to the migration. Progress is rendered straight into a progress bar; a
worker bug should not be able to persist a value the UI cannot display.

**`photoUrl`, not `photo`.** The criterion above says `photo`. The column stores
a URL from the OAuth provider, not an image, and the name should say so. Same
field, more honest name — ticket 03 will see `photoUrl` on the generated type.

**`fileName` was added** beyond the columns listed. Nothing else in the row
identifies a document to a human, and tickets 09/10 have to render a list of
them. `file_url` is a location, not a name.

**No vector index.** Similarity search is explicitly out of scope, and an HNSW
index would tax every write for a query nobody makes yet. Add one with the first
query that needs it.

**Vectors are 1536-dimensional**, matching `text-embedding-3-small` from the
spec. `EMBEDDING_DIMENSIONS` in `src/lib/db.ts` is the constant code should
read. Prisma cannot see `Unsupported` columns, so embedding reads and writes go
through raw SQL — see `prisma/seed.ts` and the integration tests for the shape.

### Testing

Split in two. `npm test` is unit-only and needs no database. `npm run
test:integration` uses a separate `vitest.integration.config.ts` and a real
Postgres, requiring `TEST_DATABASE_URL`.

The integration harness **drops the schema and replays every migration** before
each run, so migrations are proven against an empty database every time rather
than assumed. It refuses to start if `TEST_DATABASE_URL` matches `DATABASE_URL`.

15 integration tests cover unique email, the progress check constraint at its
bounds and outside them, enum rejection, `s3_key` uniqueness, foreign keys,
chunk uniqueness per document, a 1536-dimension vector round-trip, dimension
mismatch rejection, and cascade deletes at both levels.

### For ticket 08 — pgvector or OpenSearch?

**The spec contradicts itself.** It names "PostgreSQL with pgvector on RDS" for
storage and separately lists "Vector Database: OpenSearch". This ticket asked
for an embeddings table with a vector column, so that is what was built, and the
vectors live in Postgres today.

Ticket 08 has to settle it. If OpenSearch wins, the `vector` column becomes dead
weight and should be dropped in a migration rather than left to rot. If pgvector
wins, ticket 08 is mostly about the write path. Nothing here forecloses either
choice.

### For ticket 03 — a pre-existing Edge runtime warning

`src/instrumentation.ts` (from ticket 01) calls `process.exit(1)`, which the
build flags as unsupported in the Edge runtime. Harmless today because nothing
runs on Edge. Ticket 03 adds NextAuth, and auth middleware typically does run on
Edge — guard the call with `process.env.NEXT_RUNTIME === "nodejs"` at that
point. Left alone here to keep this ticket's diff honest.

### Review findings, all addressed

1. **Migrations were never proven to apply from scratch.** The harness ran
   `migrate deploy` against an already-migrated database, which is a no-op. It
   now drops the schema first, so the acceptance criterion is actually tested.
2. **Duplicated URL-scheme checking** in `src/lib/env.ts`; extracted `hasScheme`,
   which the http and postgres validators now share.
3. **Interpolated SQL in a test.** `$executeRawUnsafe` with a template literal
   was replaced by a parameterised `$executeRaw`, so the pattern copied into
   later tickets is the safe one.
