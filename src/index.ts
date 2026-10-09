import { DurableObject } from "cloudflare:workers";

interface Env {
  MY_CONTAINER: DurableObjectNamespace;
}

export class MyContainer extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    
    // Reescribe la URL para enviarla al puerto expuesto por el contenedor (puerto 3001)
    const targetUrl = new URL(`http://127.0.0.1:3001${url.pathname}${url.search}`);
    const newRequest = new Request(targetUrl.toString(), request);
    
    // Utiliza ctx.container o la API de fetch de workers si aplica
    if (this.ctx && (this.ctx as any).container) {
      // Verificando el estado a través del contenedor
      try {
        return await (this.ctx as any).container.fetch(newRequest);
      } catch (err) {
        console.error("Error al comunicarse con el contenedor", err);
        return new Response("Error al comunicarse con el contenedor interno", { status: 502 });
      }
    }

    // Fallback de fetch estándar hacia el localhost del contenedor
    return await fetch(newRequest);
  }
}

export default {
  async fetch(request: Request, env: Env) {
    // Redirige todo el tráfico hacia la instancia del contenedor Durable Object
    const id = env.MY_CONTAINER.idFromName("global-app-container");
    const stub = env.MY_CONTAINER.get(id);
    return await stub.fetch(request);
  }
};
