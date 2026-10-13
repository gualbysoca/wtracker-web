import type { ContainerConfig } from "../configs/container.config";

type BackendRouteConfig = Pick<ContainerConfig, "backendPathPrefixes" | "backendExactPaths">;

export const isBackendPath = (pathname: string, config: BackendRouteConfig): boolean =>
  config.backendExactPaths.includes(pathname) ||
  config.backendPathPrefixes.some((prefix) => pathname.startsWith(prefix));

export const pickStringEntries = (source: object, keys: readonly string[]): Readonly<Record<string, string>> => {
  const values = source as Record<string, unknown>;
  return Object.freeze(
    Object.fromEntries(
      keys
        .filter((key) => typeof values[key] === "string" && values[key] !== "")
        .map((key) => [key, values[key] as string]),
    ),
  );
};
