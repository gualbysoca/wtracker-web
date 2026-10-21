// src/pages/Clients/clientCsv.ts
// Traduce entre filas CSV y el modelo de clientes para la carga/descarga masiva.

import type { Client } from '../../types';
import type { BulkClientAction, BulkClientRow } from '../../services/client.service';
import { parseCsv, serializeCsv } from '../../utils/csv';

export const CLIENT_CSV_COLUMNS = [
  'accion',
  'id',
  'business_name',
  'client_code',
  'contact_name',
  'phone',
  'email',
  'address',
  'delivery_address',
  'stall_number',
  'city',
  'lat',
  'lng',
  'notes',
] as const;

type ClientCsvColumn = (typeof CLIENT_CSV_COLUMNS)[number];

const TEXT_FIELDS = [
  'business_name',
  'client_code',
  'contact_name',
  'phone',
  'email',
  'address',
  'delivery_address',
  'stall_number',
  'city',
  'notes',
] as const;

const NUMBER_FIELDS = ['lat', 'lng'] as const;

const ACTION_ALIASES: Record<string, BulkClientAction> = {
  crear: 'create', create: 'create', alta: 'create',
  modificar: 'update', actualizar: 'update', update: 'update',
  eliminar: 'delete', delete: 'delete', baja: 'delete',
};

const COLUMN_ALIASES: Record<string, ClientCsvColumn> = {
  accion: 'accion',
  action: 'accion',
  id: 'id',
  business_name: 'business_name',
  negocio: 'business_name',
  mercado: 'business_name',
  razon_social: 'business_name',
  client_code: 'client_code',
  codigo: 'client_code',
  codigo_cliente: 'client_code',
  code: 'client_code',
  contact_name: 'contact_name',
  contacto: 'contact_name',
  phone: 'phone',
  telefono: 'phone',
  tel: 'phone',
  celular: 'phone',
  email: 'email',
  correo: 'email',
  address: 'address',
  direccion: 'address',
  direccion_referencial: 'address',
  delivery_address: 'delivery_address',
  direccion_entrega: 'delivery_address',
  entrega: 'delivery_address',
  stall_number: 'stall_number',
  nro_puesto: 'stall_number',
  puesto: 'stall_number',
  numero_puesto: 'stall_number',
  city: 'city',
  ciudad: 'city',
  lat: 'lat',
  latitud: 'lat',
  lng: 'lng',
  longitud: 'lng',
  notes: 'notes',
  notas: 'notes',
  observaciones: 'notes',
};

export interface ParsedClientCsv {
  rows: BulkClientRow[];
  errors: { line: number; message: string }[];
}

const TEMPLATE_EXAMPLE_ROWS: string[][] = [
  [
    'crear',
    '',
    'Mercado Central',
    '1045',
    'Juan Pérez',
    '+59171234567',
    'juan@correo.com',
    'Av. Principal 123',
    'Calle Comercio #45 Galpón B',
    'Puesto 12',
    'Santa Cruz',
    '-17.7833',
    '-63.1821',
    '',
  ],
  [
    'modificar',
    'PEGA-AQUI-EL-ID-DEL-CLIENTE',
    '',
    '1046',
    'Nuevo Contacto',
    '',
    '',
    '',
    'Dirección de Entrega Actualizada',
    'Puesto 15',
    '',
    '',
    '',
    '',
  ],
  [
    'eliminar',
    'PEGA-AQUI-EL-ID-DEL-CLIENTE',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
];

export const buildTemplateCsv = (): string =>
  serializeCsv([[...CLIENT_CSV_COLUMNS], ...TEMPLATE_EXAMPLE_ROWS]);

const formatNumber = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

export const buildClientsExportCsv = (clients: Client[]): string => {
  const body = clients.map((client) => {
    const record = client as unknown as Record<string, unknown>;
    return CLIENT_CSV_COLUMNS.map((column) => {
      if (column === 'accion') return 'modificar';
      return formatNumber(record[column]);
    });
  });
  return serializeCsv([[...CLIENT_CSV_COLUMNS], ...body]);
};

const resolveAction = (rawAction: string, hasId: boolean): BulkClientAction | null => {
  const normalized = rawAction.trim().toLowerCase();
  if (!normalized) return hasId ? 'update' : 'create';
  return ACTION_ALIASES[normalized] ?? null;
};

const parseDecimal = (rawValue: string): number => Number(rawValue.trim().replace(',', '.'));

const buildRowData = (cells: Record<ClientCsvColumn, string>): Record<string, string | number> => {
  const data: Record<string, string | number> = {};
  TEXT_FIELDS.forEach((field) => {
    if (cells[field] && cells[field].trim() !== '') data[field] = cells[field].trim();
  });
  NUMBER_FIELDS.forEach((field) => {
    if (cells[field] && cells[field].trim() !== '') data[field] = parseDecimal(cells[field]);
  });
  return data;
};

const validateRow = (action: BulkClientAction, id: string, data: Record<string, string | number>): string | null => {
  const invalidNumber = NUMBER_FIELDS.find((field) => field in data && Number.isNaN(data[field]));
  if (invalidNumber) return `El valor de "${invalidNumber}" no es un número`;
  if (action !== 'create') return id ? null : 'Se requiere el id del cliente';
  if (!data.business_name) return 'business_name es requerido';
  if (data.lat === undefined || data.lng === undefined) return 'lat y lng son requeridos';
  return null;
};

export const parseClientCsv = (text: string): ParsedClientCsv => {
  const [header, ...dataRows] = parseCsv(text);
  const result: ParsedClientCsv = { rows: [], errors: [] };

  if (!header) {
    result.errors.push({ line: 1, message: 'El archivo está vacío' });
    return result;
  }

  const columnIndexes = Object.fromEntries(
    CLIENT_CSV_COLUMNS.map((column) => {
      const idx = header.findIndex((name) => {
        const clean = name.trim().toLowerCase();
        return clean === column || COLUMN_ALIASES[clean] === column;
      });
      return [column, idx];
    })
  ) as Record<ClientCsvColumn, number>;

  if (columnIndexes.business_name < 0) {
    result.errors.push({ line: 1, message: 'Falta la columna "business_name". Descarga la plantilla para ver el formato.' });
    return result;
  }

  dataRows.forEach((cellsRow, rowIndex) => {
    const line = rowIndex + 2;
    const cells = Object.fromEntries(
      CLIENT_CSV_COLUMNS.map((column) => {
        const idx = columnIndexes[column];
        return [column, idx >= 0 ? (cellsRow[idx] ?? '').toString() : ''];
      })
    ) as Record<ClientCsvColumn, string>;

    const id = cells.id.trim();
    const action = resolveAction(cells.accion, Boolean(id));
    if (!action) {
      result.errors.push({ line, message: `Acción desconocida "${cells.accion}" (use crear, modificar o eliminar)` });
      return;
    }

    const data = buildRowData(cells);
    const problem = validateRow(action, id, data);
    if (problem) {
      result.errors.push({ line, message: problem });
      return;
    }

    result.rows.push({ line, action, id: id || undefined, data: action === 'delete' ? undefined : data });
  });

  return result;
};
