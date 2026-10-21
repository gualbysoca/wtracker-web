// src/models/client.model.js
// Modelo de datos y transformadores DTO para la entidad Client

/**
 * @typedef {Object} ClientEntity
 * @property {string} id - Identificador único UUID
 * @property {string} business_name - Nombre o Razón Social
 * @property {string|null} contact_name - Nombre de la persona de contacto
 * @property {string|null} phone - Teléfono de contacto
 * @property {string|null} email - Correo electrónico
 * @property {string|null} address - Dirección referencial o domicilio
 * @property {string|null} delivery_address - Dirección de entrega específica
 * @property {string|null} stall_number - Número de puesto en mercado (alias nro_puesto)
 * @property {string|null} client_code - Código comercial o ID WooCommerce
 * @property {string|null} city - Ciudad
 * @property {number|null} lat - Latitud GPS (-90 a 90)
 * @property {number|null} lng - Longitud GPS (-180 a 180)
 * @property {string|null} notes - Notas u observaciones
 * @property {boolean} is_active - Estado activo/inactivo
 * @property {string} created_at - Timestamp de creación
 * @property {string} updated_at - Timestamp de última modificación
 */

/**
 * Serializador DTO optimizado para clientes en la aplicación móvil
 * @param {Object} row - Fila cruda obtenida de PostgreSQL
 * @param {number|null} geofenceRadius - Radio de geocerca global en metros (opcional)
 * @returns {Object} DTO de cliente para la app móvil
 */
const toMobileClientDTO = (row, geofenceRadius = null) => {
  if (!row) return null;

  const dto = {
    id: row.id,
    business_name: row.business_name,
    contact_name: row.contact_name ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    delivery_address: row.delivery_address ?? null,
    stall_number: row.stall_number ?? null,
    client_code: row.client_code ?? null,
    lat: row.lat !== null && row.lat !== undefined ? Number(row.lat) : null,
    lng: row.lng !== null && row.lng !== undefined ? Number(row.lng) : null,
    last_visit_status: row.last_visit_status ?? null,
    last_visit_at: row.last_visit_at ?? null,
  };

  if (geofenceRadius !== null && geofenceRadius !== undefined) {
    dto.geofence_radius = geofenceRadius;
  }

  return dto;
};

/**
 * Normaliza y formatea un registro de cliente asegurando tipos de datos numéricos en coordenadas
 * @param {Object} row
 * @returns {Object|null}
 */
const formatClientRecord = (row) => {
  if (!row) return null;

  return {
    ...row,
    contact_name: row.contact_name ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    delivery_address: row.delivery_address ?? null,
    stall_number: row.stall_number ?? null,
    client_code: row.client_code ?? null,
    lat: row.lat !== null && row.lat !== undefined ? Number(row.lat) : null,
    lng: row.lng !== null && row.lng !== undefined ? Number(row.lng) : null,
  };
};

module.exports = {
  toMobileClientDTO,
  formatClientRecord,
};
