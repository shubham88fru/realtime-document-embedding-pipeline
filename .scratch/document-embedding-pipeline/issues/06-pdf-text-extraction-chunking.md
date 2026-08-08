# 06 — PDF text extraction and chunking

**What to build:** Lambda function to extract text from PDF files, text chunking logic, progress tracking by chunks processed, and chunk storage in database.

**Blocked by:** 05 — Document processing queue

**Status:** ready-for-agent

- [ ] PDF text extraction library integrated
- [ ] Text extraction from S3 files
- [ ] Text chunking algorithm implemented
- [ ] Total chunk count established before determinate embedding progress begins
- [ ] Document remains `processing`; no extraction sub-status is invented
- [ ] Chunk storage in database
- [ ] Error handling for corrupted PDFs
- [ ] Extensible architecture for other file formats
- [ ] Unit tests for extraction and chunking
- [ ] Integration with processing queue

## Comments

Extraction and chunking establish the real denominator used by ticket 07.
Until that denominator exists, consumers receive an indeterminate `processing`
state rather than a fabricated percentage or a new persisted phase.
