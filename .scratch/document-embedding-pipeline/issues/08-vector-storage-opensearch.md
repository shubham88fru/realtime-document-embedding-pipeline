# 08 — Vector storage in OpenSearch

**What to build:** OpenSearch domain setup, embedding storage with document references, vector indexing configuration, and database-OpenSearch integration.

**Blocked by:** 02 — Database schema and migrations, 07 — Embedding generation

**Status:** ready-for-agent

- [ ] OpenSearch domain created and configured
- [ ] Resolve the spec's OpenSearch-versus-pgvector contradiction and document the canonical vector backend before provisioning
- [ ] Vector index configuration
- [ ] Embedding storage with document references
- [ ] Database-OpenSearch integration
- [ ] Batch insertion for embeddings
- [ ] Error handling for storage failures
- [ ] Extensible architecture for other vector databases
- [ ] Connection pooling and optimization
- [ ] Integration tests for vector storage
- [ ] Document changes to `complete` with `progress_percentage = 100` only after all vectors are durably stored

## Comments

Ticket 02 implemented the requested pgvector column while the spec also names
OpenSearch. Resolve that architecture decision before implementation; do not
write to both stores by default merely to satisfy contradictory text.

Whatever backend is selected, `complete` means durable vector storage has
succeeded. Until then the document remains `processing`, even if embedding
generation has reached 100%.
