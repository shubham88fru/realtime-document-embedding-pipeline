# Document Embedding Pipeline

Upload documents, convert them into vector embeddings, and watch the progress in
real time.

Authenticated users upload PDFs; the files land in S3, a queue hands them to
workers that extract text, chunk it, generate embeddings, and write the vectors
to a vector store. Progress streams back to the browser over WebSocket. This is
an **ingestion pipeline only** — querying the embeddings is out of scope.

The full problem statement, user stories and technical decisions live in
[`.scratch/document-embedding-pipeline/spec.md`](.scratch/document-embedding-pipeline/spec.md).
Work is tracked as numbered tickets under
[`.scratch/document-embedding-pipeline/issues/`](.scratch/document-embedding-pipeline/issues/).

## Status

Ticket 01 (project foundation) is complete. The application scaffold, validated
environment configuration, UI component library and test harness are in place.
Authentication, uploads, the queue and the embedding pipeline itself arrive in
tickets 02–12.

## Prerequisites

- Node.js 20 or newer (developed against 24)
- npm 10 or newer

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs at http://localhost:3000.

`.env.local` works as copied — every variable it needs has either a value in the
example or a sensible default. Configuration is validated at startup, so a
missing or malformed variable stops the boot with a message naming it rather
than failing later at the point of use.

## Commands

| Command             | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Development server with hot reload         |
| `npm run build`     | Production build                           |
| `npm start`         | Serve a production build                   |
| `npm test`          | Run the test suite once                    |
| `npm run test:watch`| Re-run tests on change                     |
| `npm run typecheck` | Type-check without emitting                |
| `npm run lint`      | ESLint                                     |

## Configuration

Variables are declared and validated in [`src/lib/env.ts`](src/lib/env.ts), and
documented in [`.env.example`](.env.example).

`APP_ENV` (`development` / `staging` / `production`) is kept separate from
`NODE_ENV` because Next.js only recognises development, test and production —
it has no notion of staging. Read configuration through `serverEnv()` rather
than `process.env` so that validation and typing are not bypassed; server
configuration throws if it is reached from the browser, and `clientEnv()`
exposes only the `NEXT_PUBLIC_` subset.

Pipeline limits (`MAX_UPLOAD_FILES`, `MAX_FILE_SIZE_MB`,
`MAX_PROCESSING_CONCURRENCY`) default to the values in the spec — 10 files, 5 MB
each, 10 documents processed concurrently — and can be overridden per
environment.

## Project structure

```
src/
├── app/          Next.js App Router — routes, layouts, API handlers
├── components/
│   └── ui/       shadcn/ui primitives
├── lib/          Framework-agnostic utilities (env config, helpers)
├── services/     Business logic — the seam unit tests target
├── types/        Shared domain types
└── instrumentation.ts   Validates configuration once, at server startup
```

`services/` is deliberately separate from `app/`: the spec names the service
layer as the primary test seam, so business logic lives there rather than inside
route handlers.

## Testing

[Vitest](https://vitest.dev) with Testing Library. Tests sit next to the code
they cover as `*.test.ts`.

Tests run in the **node** environment by default. jsdom defines a global
`window`, which trips the browser guard in `serverEnv()` and would make every
service-layer test fail for the wrong reason. Component tests opt into a DOM
with a docblock at the top of the file:

```ts
// @vitest-environment jsdom
```

```bash
npm test                    # everything
npm test -- src/lib/env     # one file
```

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
shadcn/ui · Zod · Vitest

Planned for later tickets: NextAuth v5 with Google OAuth, PostgreSQL with
pgvector, AWS S3 + SQS + Lambda, OpenAI embeddings, OpenSearch, Socket.io.

## Troubleshooting

**`npm error code EALLOWREMOTE` on install.** Some corporate npm proxies serve
package metadata whose tarball URLs point at a different host, which npm 12
classifies as "remote" and blocks by default. Install with:

```bash
npm_config_allow_remote=all npm install
```
