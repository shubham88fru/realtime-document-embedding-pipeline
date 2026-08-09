const BYTES_PER_MEGABYTE = 1024 * 1024;

export function formatMegabytes(bytes: number): string {
  return `${bytes / BYTES_PER_MEGABYTE} MB`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < BYTES_PER_MEGABYTE) {
    return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  }
  return `${(bytes / BYTES_PER_MEGABYTE).toFixed(1)} MB`;
}
