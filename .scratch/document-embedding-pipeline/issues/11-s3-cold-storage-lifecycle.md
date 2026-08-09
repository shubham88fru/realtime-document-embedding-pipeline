# 11 — S3 cold storage lifecycle

**What to build:** S3 lifecycle rule configuration, automatic transition to Glacier after 30 days, and cost optimization for long-term storage.

**Blocked by:** 04 — File upload UI and API

**Status:** ready-for-agent

- [ ] S3 lifecycle rule configured
- [ ] Automatic transition to Glacier after 30 days
- [ ] Storage class configuration
- [ ] Cost optimization validation
- [ ] Retrieval mechanism for archived files
- [ ] Monitoring of storage costs
- [ ] Reconciled orphan cleanup for stored objects with no document row
- [ ] Documentation of lifecycle policy
- [ ] Testing of lifecycle transitions

## Comments

Ticket 04 deliberately never deletes storage from an upload request because a
concurrent finalizer may still commit its document row. This ticket owns orphan
garbage collection: verify the object SHA-256/size metadata, confirm no document
row exists, require a safety window substantially longer than the five-minute
upload-finalization lease, and delete the exact S3 `VersionId`.
