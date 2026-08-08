# 12 — Concurrency and rate limiting

**What to build:** SQS concurrency limit (10 documents), per-user rate limiting (10 files, 5MB each), and multi-user queue handling.

**Blocked by:** 05 — Document processing queue, 03 — Google authentication

**Status:** ready-for-agent

- [ ] SQS concurrency limit configured (10 documents)
- [ ] Per-user rate limiting (10 files, 5MB each)
- [ ] Multi-user queue handling
- [ ] Rate limiting middleware for API endpoints
- [ ] User-specific quota tracking
- [ ] API returns machine-readable limit, remaining-capacity, and retry timing data where applicable
- [ ] Cloudline UI displays server-provided quota/rate-limit feedback using ticket 13 notice primitives
- [ ] Browser selection counters are guidance only and never treated as authoritative server quota
- [ ] Queue priority configuration
- [ ] Monitoring of concurrency metrics
- [ ] Testing of concurrent uploads

## Comments

The upload deck may truthfully show local selection capacity such as “3 of 10
files selected.” Any account-level remaining quota or retry time must come from
the server response; the UI must not invent it from local state.
