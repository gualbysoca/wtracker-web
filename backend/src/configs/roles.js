// src/configs/roles.js
// Fuente única de verdad para los grupos de roles y la política de acceso por canal

const WEB_ROLES   = Object.freeze(['admin', 'supervisor']);
const FIELD_ROLES = Object.freeze(['reponedor', 'vendedor', 'cobrador', 'repartidor']);

const LOGIN_CHANNELS = Object.freeze({
  web: Object.freeze({
    allowedRoles: WEB_ROLES,
    deniedMessage: 'Acceso denegado: Solo el personal administrativo puede acceder al sistema web.',
  }),
  mobile: Object.freeze({
    allowedRoles: FIELD_ROLES,
    deniedMessage: 'Acceso denegado: La app móvil es exclusiva para el personal de campo.',
  }),
});

module.exports = { WEB_ROLES, FIELD_ROLES, LOGIN_CHANNELS };
