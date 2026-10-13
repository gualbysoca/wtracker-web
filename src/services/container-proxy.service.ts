import type { ContainerConfig } from "../configs/container.config";

/**
 * Minimal contract of `ctx.container` (Durable Object Container API) used by this Worker.
 * Acts as a wrapper so the rest of the code does not depend on the runtime shape directly.
 */
export interface ContainerRuntime {
  readonly running: boolean;
  start(options?: Record<string, unknown>): void;
  getTcpPort(port: number): { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> };
  setInactivityTimeout(durationMs: number): Promise<void>;
  monitor(): Promise<void>;
  inspect(): Promise<{ labels: Record<string, string> } | null>;
  destroy(reason?: unknown): Promise<void>;
}

const ENV_FINGERPRINT_LABEL = "env-hash";

export class ContainerNotReadyError extends Error {
  constructor(timeoutMs: number) {
    super(`El contenedor no empezó a escuchar dentro de ${timeoutMs}ms`);
    this.name = "ContainerNotReadyError";
  }
}

const sleep = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));

const computeEnvFingerprint = async (env: Readonly<Record<string, string>>): Promise<string> => {
  const canonical = JSON.stringify(Object.keys(env).sort().map((key) => [key, env[key]]));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

/**
 * Starts the container (if needed), waits until its port accepts connections and proxies requests.
 * `container.start()` returns before the process is listening (see Cloudflare docs), so readiness
 * must be confirmed explicitly; otherwise the first request after a cold start fails with
 * "The container is not listening in the TCP address".
 */
export class ContainerProxyService {
  private isReady = false;
  private monitorGeneration = 0;
  private isMonitoring = false;
  private readinessPromise: Promise<void> | null = null;

  constructor(
    private readonly container: ContainerRuntime,
    private readonly config: ContainerConfig,
    private readonly containerEnv: Readonly<Record<string, string>>,
    private readonly waitUntil: (promise: Promise<unknown>) => void,
  ) {}

  async forward(request: Request): Promise<Response> {
    await this.ensureReady();

    try {
      return await this.container.getTcpPort(this.config.internalPort).fetch(this.buildInternalRequest(request));
    } catch (error) {
      // The process may have died after being marked ready; force a fresh readiness check next time.
      this.isReady = false;
      throw error;
    }
  }

  private async ensureReady(): Promise<void> {
    if (this.isReady && this.container.running) return;

    // Concurrent requests during a cold start share a single readiness wait.
    if (!this.readinessPromise) {
      this.readinessPromise = this.startAndWaitUntilListening().finally(() => {
        this.readinessPromise = null;
      });
    }
    await this.readinessPromise;
  }

  private async startAndWaitUntilListening(): Promise<void> {
    const envFingerprint = await computeEnvFingerprint(this.containerEnv);
    await this.recycleIfEnvChanged(envFingerprint);

    if (!this.container.running) {
      this.container.start({
        env: { ...this.containerEnv },
        enableInternet: true,
        labels: { [ENV_FINGERPRINT_LABEL]: envFingerprint },
      });
    }
    this.watchContainerExit();
    await this.container.setInactivityTimeout(this.config.inactivityTimeoutMs);
    await this.waitUntilListening();
    this.isReady = true;
  }

  // A running container keeps the env it was started with, so changed vars/secrets require a restart.
  private async recycleIfEnvChanged(envFingerprint: string): Promise<void> {
    if (!this.container.running) return;

    const containerInfo = await this.container.inspect();
    if (!containerInfo) return;
    if (containerInfo.labels?.[ENV_FINGERPRINT_LABEL] === envFingerprint) return;

    console.log("Variables de entorno del contenedor desactualizadas; reiniciando contenedor");
    this.invalidateMonitor();
    await this.container.destroy();

    const stopDeadline = Date.now() + this.config.readinessTimeoutMs;
    while (this.container.running && Date.now() < stopDeadline) {
      await sleep(this.config.readinessPollIntervalMs);
    }
  }

  private async waitUntilListening(): Promise<void> {
    const deadline = Date.now() + this.config.readinessTimeoutMs;
    const probeUrl = `${this.config.internalHost}${this.config.readinessProbePath}`;
    const port = this.container.getTcpPort(this.config.internalPort);

    while (Date.now() < deadline) {
      try {
        const response = await port.fetch(probeUrl, { signal: AbortSignal.timeout(1000) });
        await response.body?.cancel();
        if (response.ok) return;
      } catch {
        // Port not accepting connections yet; retry until the deadline.
      }
      await sleep(this.config.readinessPollIntervalMs);
    }
    throw new ContainerNotReadyError(this.config.readinessTimeoutMs);
  }

  private watchContainerExit(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    const generation = this.monitorGeneration;
    this.waitUntil(
      this.container
        .monitor()
        .then(() => console.log("Contenedor detenido"))
        .catch((error) => console.error("El contenedor terminó con error", error))
        .finally(() => {
          // Ignore exits of a container that was intentionally replaced.
          if (generation !== this.monitorGeneration) return;
          this.isReady = false;
          this.isMonitoring = false;
        }),
    );
  }

  private invalidateMonitor(): void {
    this.monitorGeneration += 1;
    this.isMonitoring = false;
    this.isReady = false;
  }

  private buildInternalRequest(request: Request): Request {
    const publicUrl = new URL(request.url);
    const internalUrl = `${this.config.internalHost}${publicUrl.pathname}${publicUrl.search}`;
    const internalRequest = new Request(internalUrl, request);
    internalRequest.headers.delete("host");
    return internalRequest;
  }
}
