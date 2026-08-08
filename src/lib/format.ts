const BYTES_PER_MEGABYTE = 1024 * 1024;

export function formatMegabytes(bytes: number): string {
  return `${bytes / BYTES_PER_MEGABYTE} MB`;
}
