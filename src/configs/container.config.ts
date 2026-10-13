/**
 * Runtime configuration for the backend container proxied by the Worker.
 * Values mirror the Dockerfile (EXPOSE 3001) and the Express health route.
 */
export const CONTAINER_CONFIG = Object.freeze({
  instanceName: "global-app-container",
  internalPort: 3001,
  internalHost: "http://container",
  readinessProbePath: "/health",
  readinessTimeoutMs: 30_000,
  readinessPollIntervalMs: 300,
  // Keeps the container warm between requests to avoid a cold start on each visit (max 6h per Cloudflare docs).
  inactivityTimeoutMs: 15 * 60 * 1000,
  // Paths served by the Express backend; everything else is the React SPA served from Workers Static Assets.
  // /uploads is served directly from R2 by the Worker (see storage.config.ts).
  backendPathPrefixes: ["/api/"],
  backendExactPaths: ["/api", "/health"],
  // Worker vars/secrets copied into the container environment (set with `wrangler secret put <KEY>`).
  forwardedEnvKeys: [
    "FRONTEND_URL",
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "DB_SSL",
    "DB_POOL_MAX",
    "DB_CONNECTION_TIMEOUT_MS",
    "JWT_SECRET",
    "JWT_EXPIRES_IN",
    "JWT_REFRESH_SECRET",
    "JWT_REFRESH_EXPIRES_IN",
    "MAX_FILE_SIZE_MB",
    "STORAGE_DRIVER",
    "STORAGE_PROXY_URL",
    "STORAGE_PROXY_TOKEN",
  ],
});

export type ContainerConfig = typeof CONTAINER_CONFIG;
