/**
 * Evidence object storage served by the Worker through the R2 binding.
 * - Public reads:   GET/HEAD /uploads/<key>
 * - Internal writes: PUT/DELETE /internal/storage/<key> (container only, bearer token)
 */
export const STORAGE_CONFIG = Object.freeze({
  publicPathPrefix: "/uploads/",
  internalPathPrefix: "/internal/storage/",
  // Keys are random UUIDs and never overwritten, so objects can be cached indefinitely.
  publicCacheControl: "public, max-age=31536000, immutable",
  maxObjectKeyLength: 200,
});

export type StorageConfig = typeof STORAGE_CONFIG;
