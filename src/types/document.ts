/**
 * Lifecycle of an uploaded document as it moves through the embedding
 * pipeline. The database schema (ticket 02) and the progress events pushed
 * over WebSocket (ticket 09) both derive from this vocabulary.
 */
export const DOCUMENT_STATUSES = [
  "uploaded",
  "processing",
  "complete",
  "error",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
