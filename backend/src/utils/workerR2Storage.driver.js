// src/utils/workerR2Storage.driver.js
// Driver para Cloudflare R2. El contenedor no tiene credenciales de R2: escribe y borra
// a través de un endpoint interno del Worker (que sí tiene el binding), autenticado con token.

const createWorkerR2StorageDriver = ({ proxyUrl, proxyToken, proxyTimeoutMs }) => {
  if (!proxyUrl || !proxyToken) {
    throw new Error('[Storage] STORAGE_PROXY_URL y STORAGE_PROXY_TOKEN son obligatorios para el driver r2-worker');
  }

  const requestObject = async (method, key, init = {}) => {
    const response = await fetch(`${proxyUrl.replace(/\/$/, '')}/${encodeURIComponent(key)}`, {
      ...init,
      method,
      headers: { ...init.headers, Authorization: `Bearer ${proxyToken}` },
      signal: AbortSignal.timeout(proxyTimeoutMs),
    });
    return response;
  };

  return Object.freeze({
    async putObject(key, buffer, contentType) {
      const response = await requestObject('PUT', key, {
        body: buffer,
        headers: { 'Content-Type': contentType },
      });
      if (!response.ok) {
        throw new Error(`[Storage] Error al subir ${key} a R2: HTTP ${response.status}`);
      }
    },

    async deleteObject(key) {
      const response = await requestObject('DELETE', key);
      if (!response.ok && response.status !== 404) {
        throw new Error(`[Storage] Error al borrar ${key} de R2: HTTP ${response.status}`);
      }
    },
  });
};

module.exports = { createWorkerR2StorageDriver };
