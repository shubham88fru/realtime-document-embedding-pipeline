# 07 — Embedding generation

**What to build:** OpenAI API integration for text-embedding-3-small, chunk processing with progress updates, embedding generation, and error handling for API failures.

**Blocked by:** 06 — PDF text extraction and chunking

**Status:** ready-for-agent

- [ ] OpenAI API client configured
- [ ] text-embedding-3-small model integration
- [ ] Persisted progress calculated from successfully embedded chunks divided by the total chunk count
- [ ] Progress updated only after each chunk embedding succeeds
- [ ] Embedding generation from text chunks
- [ ] API rate limiting and retry logic
- [ ] Error handling for API failures
- [ ] Extensible architecture for other embedding models
- [ ] Cost tracking for embedding usage
- [ ] Unit tests for embedding generation

## Comments

`progress_percentage` is the authoritative processing percentage consumed by
ticket 09. It may reach 100 while the document still has status `processing`;
ticket 08 changes the status to `complete` only after vector storage succeeds.
The UI must not infer named internal phases from the percentage.
