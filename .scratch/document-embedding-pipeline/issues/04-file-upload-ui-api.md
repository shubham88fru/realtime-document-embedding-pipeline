# 04 — File upload UI and API

**What to build:** A Cloudline upload deck with drag-and-drop and file browsing, truthful client transfer progress, API endpoint for file upload, S3 storage, file validation, and creation of the authenticated user's document record.

**Blocked by:** 01 — Project setup and infrastructure foundation, 03 — Google authentication, 13 — Design system and application shell

**Status:** ready-for-agent

- [ ] Cloudline upload deck built from ticket 13 primitives
- [ ] Keyboard-accessible drag-and-drop and file browsing
- [ ] Multiple file selection (up to 10 files)
- [ ] File size validation (max 5MB per file)
- [ ] File type validation (PDF initially)
- [ ] Per-file byte transfer progress while the HTTP upload is active
- [ ] Selected, validating, uploading, uploaded, and upload-failed client states
- [ ] API endpoint for file upload
- [ ] AWS S3 integration for file storage
- [ ] Document record created as `uploaded` with `progress_percentage = 0` only after S3 storage succeeds
- [ ] User authorization check on upload
- [ ] Inline, accessible validation and upload failure feedback
- [ ] Mobile layout prioritizes tap-to-browse and never requires drag-and-drop

## Comments

`uploading` is not a database status. It exists only in the browser while bytes
are sent. After the API confirms S3 storage and document creation, the row
renders the persisted `uploaded` state. Processing progress belongs to ticket
09 and must not be simulated here.
