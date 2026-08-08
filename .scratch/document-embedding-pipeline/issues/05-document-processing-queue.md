# 05 — Document processing queue

**What to build:** SQS queue setup, Lambda worker skeleton, job distribution from upload to queue, and basic job status tracking.

**Blocked by:** 01 — Project setup and infrastructure foundation, 02 — Database schema and migrations, 04 — File upload UI and API

**Status:** ready-for-agent

- [ ] AWS SQS queue created and configured
- [ ] Lambda function skeleton for document processing
- [ ] Job distribution from upload API to SQS queue
- [ ] Document remains `uploaded` while queued and changes to `processing` only when a worker claims it
- [ ] Job status tracking in database is committed before downstream progress events are emitted
- [ ] Queue message format defined
- [ ] Lambda trigger from SQS configured
- [ ] Basic error handling for queue failures
- [ ] Dead-letter queue configuration
- [ ] Local development queue simulation

## Comments

The queue must preserve the four-state document vocabulary. “Queued” may be
help text for an `uploaded` document, but it is not a fifth persisted status.
Ticket 09 consumes committed document snapshots rather than predicting worker
state from elapsed time.
