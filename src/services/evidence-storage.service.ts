import type { StorageConfig } from "../configs/storage.config";
import { hasValidBearerToken } from "../utils/auth.util";

/**
 * Minimal contract of the R2 binding used by this Worker (wrapper over the runtime API).
 */
export interface EvidenceBucket {
  get(key: string): Promise<{ body: ReadableStream; httpEtag: string; size: number; writeHttpMetadata(headers: Headers): void } | null>;
  head(key: string): Promise<{ httpEtag: string; size: number; writeHttpMetadata(headers: Headers): void } | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | null, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
}

const OBJECT_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

const jsonError = (message: string, status: number) =>
  Response.json({ success: false, message }, { status });

export class EvidenceStorageService {
  constructor(
    private readonly bucket: EvidenceBucket,
    private readonly config: StorageConfig,
    private readonly internalToken: string | undefined,
  ) {}

  isPublicPath(pathname: string): boolean {
    return pathname.startsWith(this.config.publicPathPrefix);
  }

  isInternalPath(pathname: string): boolean {
    return pathname.startsWith(this.config.internalPathPrefix);
  }

  async handlePublicRequest(request: Request, pathname: string): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") return jsonError("Método no permitido", 405);

    const key = this.extractKey(pathname, this.config.publicPathPrefix);
    if (!key) return jsonError("Archivo no encontrado", 404);

    const object = request.method === "HEAD" ? await this.bucket.head(key) : await this.bucket.get(key);
    if (!object) return jsonError("Archivo no encontrado", 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", this.config.publicCacheControl);
    headers.set("Content-Length", String(object.size));

    const body = "body" in object ? object.body : null;
    return new Response(body, { headers });
  }

  async handleInternalRequest(request: Request, pathname: string): Promise<Response> {
    if (!hasValidBearerToken(request, this.internalToken)) return jsonError("No autorizado", 401);

    const key = this.extractKey(pathname, this.config.internalPathPrefix);
    if (!key) return jsonError("Clave de objeto inválida", 400);

    if (request.method === "PUT") {
      await this.bucket.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get("Content-Type") ?? "application/octet-stream" },
      });
      return new Response(null, { status: 201 });
    }

    if (request.method === "DELETE") {
      await this.bucket.delete(key);
      return new Response(null, { status: 204 });
    }

    return jsonError("Método no permitido", 405);
  }

  // Flat keys only (uuid.ext): rejects traversal and nested paths.
  private extractKey(pathname: string, prefix: string): string | null {
    let key: string;
    try {
      key = decodeURIComponent(pathname.slice(prefix.length));
    } catch {
      return null;
    }
    if (!key || key.length > this.config.maxObjectKeyLength || !OBJECT_KEY_PATTERN.test(key)) return null;
    return key;
  }
}
