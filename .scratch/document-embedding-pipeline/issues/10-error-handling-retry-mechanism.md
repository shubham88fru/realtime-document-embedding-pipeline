# 10 — Error handling and retry mechanism

**What to build:** Error capture and storage in database, UI error notifications, retry button for failed files, and retry logic that re-queues failed documents.

**Blocked by:** 04 — File upload UI and API, 07 — Embedding generation, 09 — WebSocket progress updates

**Status:** ready-for-agent

- [ ] Error capture and storage in database
- [ ] Persistent inline error treatment on the affected Cloudline document row
- [ ] Toast/notification supplements rather than replaces the persistent error
- [ ] Accessible retry button for failed files
- [ ] Retry logic that re-queues failed documents
- [ ] Error message display to users
- [ ] Transient error detection
- [ ] Retry limit configuration
- [ ] Error logging and monitoring
- [ ] User feedback on retry attempts
- [ ] `retrying` shown only while the retry request is in flight
- [ ] Accepted retry clears the persisted error, resets progress, and returns the document to the real queued/uploaded state
- [ ] Retry-limit response is displayed from backend data rather than inferred in the browser

## Comments

Display the stored user-safe error message; technical diagnostics remain in
structured logs. The browser must not pretend a retry succeeded before the API
accepts and persists the new state.
