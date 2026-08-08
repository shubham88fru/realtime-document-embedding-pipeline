# 09 — WebSocket progress updates

**What to build:** Socket.io server setup, user-scoped committed document events, the Cloudline document queue and status summary, truthful progress display, and reconnect/offline reconciliation.

**Blocked by:** 01 — Project setup and infrastructure foundation, 03 — Google authentication, 05 — Document processing queue

**Status:** ready-for-agent

- [ ] Socket.io server configured
- [ ] WebSocket connection management
- [ ] Real-time progress events (uploaded, processing, complete, error)
- [ ] Event payload carries the committed document id, status, progress percentage, error message, and update timestamp
- [ ] Cloudline document queue and status summary use ticket 13 primitives
- [ ] Frontend shows determinate progress only from persisted `progress_percentage`
- [ ] Unknown processing progress uses an indeterminate treatment
- [ ] User-specific progress channels
- [ ] Connection reconnection handling
- [ ] Reconnect fetches an authoritative document snapshot before applying newer events
- [ ] Visible connected, reconnecting, offline, and stale-data feedback
- [ ] Error handling for WebSocket failures
- [ ] Integration with document status updates
- [ ] End-to-end progress flow tested
- [ ] Progress announcements are throttled for assistive technology

## Comments

The frontend renders only `uploaded`, `processing`, `complete`, and `error`.
It must not label work as extracting, embedding, or storing unless a future
backend contract adds a real persisted phase. WebSocket events are notifications
of committed state, not the source of truth; reconnect reconciliation prevents
missed or out-of-order events from leaving stale progress onscreen.
