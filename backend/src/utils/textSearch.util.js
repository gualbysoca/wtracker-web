// src/utils/textSearch.util.js
// Utilidades para normalización y búsqueda de texto insensible a acentos, mayúsculas y orden de términos

const ACCENTED_CHARS = 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ';
const UNACCENTED_CHARS = 'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc';

/**
 * Normaliza un texto eliminando espacios sobrantes en extremos, convirtiéndolo a minúsculas
 * y quitando diacríticos (acentos, tildes, diéresis).
 * @param {unknown} text
 * @returns {string}
 */
const normalizeSearchText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

/**
 * Divide la consulta de búsqueda en tokens/términos individuales limpios, sin importar el orden.
 * Ignora espacios vacíos adicionales al inicio, fin o entre palabras.
 * @param {unknown} query
 * @returns {string[]}
 */
const tokenizeSearchQuery = (query) => {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  return normalized
    .split(/\s+/)
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '').trim())
    .filter((token) => token.length > 0);
};

/**
 * Escapa caracteres comodín de SQL LIKE (%, _, \) para tratarlos como texto literal.
 * @param {string} text
 * @returns {string}
 */
const escapeSqlLike = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[%_\\]/g, '\\$&');
};

/**
 * Genera una expresión SQL compatible con PostgreSQL que convierte el texto de una o más
 * columnas a minúsculas y sustituye todos los caracteres acentuados por sus equivalentes sin acento.
 * No requiere extensiones externas (como unaccent), funcionando de manera nativa y portable.
 *
 * @param {string} sqlExpression - Expresión o concatenación SQL a normalizar
 * @returns {string}
 */
const buildUnaccentExpression = (sqlExpression) => {
  return `TRANSLATE(LOWER(${sqlExpression}), '${ACCENTED_CHARS}', '${UNACCENTED_CHARS}')`;
};

module.exports = {
  ACCENTED_CHARS,
  UNACCENTED_CHARS,
  normalizeSearchText,
  tokenizeSearchQuery,
  escapeSqlLike,
  buildUnaccentExpression,
};
