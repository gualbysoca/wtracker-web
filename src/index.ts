import { DurableObject } from "cloudflare:workers";
import { CONTAINER_CONFIG } from "./configs/container.config";
import { STORAGE_CONFIG } from "./configs/storage.config";
import { ContainerNotReadyError, ContainerProxyService, type ContainerRuntime } from "./services/container-proxy.service";
import { EvidenceStorageService, type EvidenceBucket } from "./services/evidence-storage.service";
import { isBackendPath, pickStringEntries } from "./utils/request-routing.util";

interface Env {
  MY_CONTAINER: DurableObjectNamespace;
  ASSETS: Fetcher;
  EVIDENCE_BUCKET: EvidenceBucket;
  STORAGE_PROXY_TOKEN?: string;
}

export class MyContainer extends DurableObject<Env> {
  private readonly proxyService: ContainerProxyService | null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const container = (ctx as unknown as { container?: ContainerRuntime }).container;
    this.proxyService = container
      ? new ContainerProxyService(
          container,
          CONTAINER_CONFIG,
          pickStringEntries(env, CONTAINER_CONFIG.forwardedEnvKeys),
          (promise) => ctx.waitUntil(promise),
        )
      : null;
  }

  async fetch(request: Request): Promise<Response> {
    if (!this.proxyService) {
      return new Response("No hay un contenedor configurado para este Durable Object", { status: 503 });
    }

    try {
      return await this.proxyService.forward(request);
    } catch (error) {
      console.error("Error al comunicarse con el contenedor", error);
      const status = error instanceof ContainerNotReadyError ? 503 : 502;
      return new Response("Error al comunicarse con el contenedor interno", {
        status,
        headers: { "Retry-After": "5" },
      });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const evidenceStorage = new EvidenceStorageService(env.EVIDENCE_BUCKET, STORAGE_CONFIG, env.STORAGE_PROXY_TOKEN);

    if (evidenceStorage.isPublicPath(pathname)) {
      return evidenceStorage.handlePublicRequest(request, pathname);
    }
    if (evidenceStorage.isInternalPath(pathname)) {
      return evidenceStorage.handleInternalRequest(request, pathname);
    }

    // Frontend (React SPA) is served from Workers Static Assets; only backend routes reach the container.
    if (!isBackendPath(pathname, CONTAINER_CONFIG)) {
      return env.ASSETS.fetch(request);
    }

    const id = env.MY_CONTAINER.idFromName(CONTAINER_CONFIG.instanceName);
    const stub = env.MY_CONTAINER.get(id);
    return await stub.fetch(request);
  },
};
