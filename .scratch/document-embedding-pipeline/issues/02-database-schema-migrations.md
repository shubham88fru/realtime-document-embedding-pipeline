# 02 — Database schema and migrations

**What to build:** PostgreSQL database with pgvector extension, users/documents/embeddings tables, migration system (Drizzle or Prisma), and database connection setup.

**Blocked by:** 01 — Project setup and infrastructure foundation

**Status:** ready-for-agent

- [ ] PostgreSQL database connection configured
- [ ] pgvector extension installed and enabled
- [ ] Migration system selected and configured (Drizzle or Prisma)
- [ ] Users table schema (id, email, name, photo, created_at, updated_at)
- [ ] Documents table schema (id, user_id, status, progress_percentage, error_message, created_at, updated_at, file_url, s3_key)
- [ ] Embeddings table schema (id, document_id, vector, chunk_index, content)
- [ ] Migration scripts created and tested
- [ ] Database seeding for development
- [ ] Connection pooling configured
