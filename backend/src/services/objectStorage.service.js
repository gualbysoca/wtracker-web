// src/services/objectStorage.service.js
// Fachada de almacenamiento de archivos. El resto de la app no conoce el proveedor
// (disco local o Cloudflare R2): cambiarlo solo requiere un nuevo driver.

const path = require('path');
const { STORAGE_CONFIG, STORAGE_DRIVERS } = require('../configs/storage');
const { createLocalDiskStorageDriver } = require('../utils/localDiskStorage.driver');
const { createWorkerR2StorageDriver } = require('../utils/workerR2Storage.driver');

const createStorageDriver = () => {
  if (STORAGE_CONFIG.driver === STORAGE_DRIVERS.workerR2) {
    return createWorkerR2StorageDriver(STORAGE_CONFIG);
  }
  return createLocalDiskStorageDriver(STORAGE_CONFIG);
};

const storageDriver = createStorageDriver();

const buildPublicUrl = (key) => `${STORAGE_CONFIG.publicPrefix}${key}`;

const extractKeyFromPublicUrl = (publicUrl) => {
  if (!publicUrl || !publicUrl.startsWith(STORAGE_CONFIG.publicPrefix)) return null;
  return path.basename(publicUrl);
};

const putObject = (key, buffer, contentType) => storageDriver.putObject(key, buffer, contentType);

const deleteObject = (key) => storageDriver.deleteObject(key);

module.exports = { putObject, deleteObject, buildPublicUrl, extractKeyFromPublicUrl };
