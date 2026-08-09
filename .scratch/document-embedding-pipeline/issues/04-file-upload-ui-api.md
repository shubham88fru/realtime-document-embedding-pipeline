# 04 — File upload UI and API

**What to build:** A Cloudline upload deck with drag-and-drop and file browsing, truthful client transfer progress, API endpoint for file upload, S3 storage, file validation, and creation of the authenticated user's document record.

**Blocked by:** 01 — Project setup and infrastructure foundation, 03 — Google authentication, 13 — Design system and application shell

**Status:** done

- [x] Cloudline upload deck built from ticket 13 primitives
- [x] Keyboard-accessible drag-and-drop and file browsing
- [x] Multiple file selection (up to 10 files)
- [x] File size validation (max 5MB per file)
- [x] File type validation (PDF initially)
- [x] Per-file byte transfer progress while the HTTP upload is active
- [x] Selected, validating, uploading, uploaded, and upload-failed client states
- [x] API endpoint for file upload
- [x] AWS S3 integration for file storage
- [x] Document record created as `uploaded` with `progress_percentage = 0` only after S3 storage succeeds
- [x] User authorization check on upload
- [x] Inline, accessible validation and upload failure feedback
- [x] Mobile layout prioritizes tap-to-browse and never requires drag-and-drop

## Comments

`uploading` is not a database status. It exists only in the browser while bytes
are sent. After the API confirms S3 storage and document creation, the row
renders the persisted `uploaded` state. Processing progress belongs to ticket
09 and must not be simulated here.

### Implementation

- The Cloudline upload deck supports keyboard browsing, desktop drag/drop,
  multiple selection, per-file removal, validation, retryable failures, and
  independent XHR transfer progress.
- Client states are truthful: `selected` → real signature `validating` →
  `uploading` while bytes transfer → indeterminate `finalizing` after the upload
  stream closes → the persisted document status returned by the server.
- The Node route streams multipart data through Busboy. File, part, header, and
  total request limits terminate the input instead of buffering an unbounded
  form before validation. A PDF exactly at the configured limit is accepted.
- Validation runs on both boundaries: count, non-empty file, `.pdf` name,
  `application/pdf` MIME, size, and `%PDF-` signature.
- Every request uses the authenticated session UUID; no client owner field is
  accepted.

### Object storage and persistence

The production adapter uses the AWS S3 SDK. Local development uses pinned MinIO
images from `compose.storage.yaml` and the same adapter; `npm run storage:start`
creates separate versioned development and test buckets.

Objects use a generated, user-scoped key:

```text
users/{userId}/documents/{uploadId}.pdf
```

The browser keeps `uploadId` stable across retries and sends it as
`Idempotency-Key`. S3 uses conditional `If-None-Match: *` writes and stores
SHA-256/size metadata. Lost or conflicting responses are reconciled with
`HeadObject` before any database work. A retry returns the existing row rather
than creating another object or document.

The document is created only after S3 confirms storage, with status `uploaded`
and progress `0`. Request handlers never delete stored content because another
finalizer may still commit against it. Verified objects without a row remain
in-flight for five minutes; after that lease, the same upload UUID can finalize
the database row against the existing object. Exact `VersionId` deletion is
available to a later reconciled GC/lifecycle job.

AWS deployments omit the local endpoint/static credentials, use the default
credential chain (normally an IAM role), and request S3-managed AES-256
encryption. Buckets remain private because no public ACL or URL is created;
`file_url` stores an internal `s3://` URI.

### Verification

- 68 unit/component tests and 23 database/S3 integrations pass.
- The full route integration crosses streaming multipart parsing, authenticated
  ownership, versioned MinIO, Prisma, idempotent retry, and cleanup.
- A production browser build uploaded a real 512 KB PDF at mobile width with
  `201 Created`; MinIO reported the exact byte length, content type, version ID,
  and SHA-256 metadata, while Postgres stored the session user, `uploaded`
  status, and zero progress. Desktop/mobile layouts had no horizontal overflow
  or console warnings. The exact QA versions and rows were removed afterward.
- Typecheck, ESLint, and the production build pass.

### Review findings, all addressed

1. Multipart parsing originally buffered before enforcing the 5 MB ceiling; it
   now streams with hard limits and early cancellation.
2. The S3 client could leak across Next.js hot reloads; it now follows the
   database client's `globalThis` development-cache pattern.
3. A lost response could duplicate objects/rows; stable upload IDs, conditional
   writes, metadata verification, and database reconciliation make retries
   idempotent.
4. Synchronous rollback could delete a version while another finalizer still
   committed its database row. Request-path deletion was removed; exact-version
   deletion remains integration-tested for a future reconciled GC.
5. The UI originally showed `uploading` after bytes had finished; progress is
   capped below 100 until the upload stream's `load` event, then changes to
   truthful `finalizing`.
6. Unknown transfer progress is indeterminate, persisted statuses drive live
   announcements, and focus remains on or returns to a logical action.
7. Ambiguous S3 and database outcomes now preserve consistency: S3 content is
   verified before adoption, conditional-write losers cannot overwrite, and an
   unreadable database commit outcome never triggers destructive cleanup.
8. The AWS default credential chain remains intact so temporary
   `AWS_SESSION_TOKEN` credentials work in Lambda, STS, and assumed roles.
9. S3 409 and 412 conditional conflicts both remain non-owning. A matching
   object without a row is reported in progress; after a five-minute verified
   lease it can be reclaimed safely instead of poisoning retries forever.
10. Mixed valid/invalid batches keep the focused action mounted as a disabled
    “Resolve file issues” control rather than dropping keyboard focus. Row
    removal is disabled while any upload is active, when the browse target is
    unavailable.
11. Content equality does not prove writer ownership. No request finalizer
    deletes content; verified stale objects are finalized after the lease,
    eliminating the race between deletion and a concurrent database commit.
12. Busboy now decodes multipart filename parameters as UTF-8, with a
    non-ASCII filename route test, so names are not persisted as mojibake.
