// src/utils/localDiskStorage.driver.js
// Driver de almacenamiento en disco local (docker-compose / desarrollo).
// Los archivos se sirven con express.static en /uploads.

const fs = require('fs/promises');
const path = require('path');

const createLocalDiskStorageDriver = ({ uploadDir }) => {
  const resolveObjectPath = (key) => path.join(uploadDir, path.basename(key));

  return Object.freeze({
    async putObject(key, buffer) {
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(resolveObjectPath(key), buffer);
    },

    async deleteObject(key) {
      try {
        await fs.unlink(resolveObjectPath(key));
      } catch (error) {
        // Un archivo que ya no existe se considera borrado.
        if (error.code !== 'ENOENT') throw error;
      }
    },
  });
};

module.exports = { createLocalDiskStorageDriver };
