// src/pages/Clients/clientCsv.ts
// Traduce entre filas CSV y el modelo de clientes para la carga/descarga masiva.

import type { Client } from '../../types';
import type { BulkClientAction, BulkClientRow } from '../../services/client.service';
import { parseCsv, serializeCsv } from '../../utils/csv';

export const CLIENT_CSV_COLUMNS = [
  'accion', 'id', 'business_name', 'contact_name', 'phone', 'email',
  'address', 'city', 'lat', 'lng', 'notes',
] as const;

type ClientCsvColumn = (typeof CLIENT_CSV_COLUMNS)[number];

const TEXT_FIELDS = ['business_name', 'contact_name', 'phone', 'email', 'address', 'city', 'notes'] as const;
const NUMBER_FIELDS = ['lat', 'lng'] as const;

const ACTION_ALIASES: Record<string, BulkClientAction> = {
  crear: 'create', create: 'create', alta: 'create',
  modificar: 'update', actualizar: 'update', update: 'update',
  eliminar: 'delete', delete: 'delete', baja: 'delete',
};

export interface ParsedClientCsv {
  rows: BulkClientRow[];
  errors: { line: number; message: string }[];
}

const TEMPLATE_EXAMPLE_ROWS: string[][] = [
  ['crear', '', 'Mercado Central', 'Juan Pérez', '+59171234567', 'juan@correo.com', 'Av. Principal 123', 'Santa Cruz', '-17.7833', '-63.1821', ''],
  ['modificar', 'PEGA-AQUI-EL-ID-DEL-CLIENTE', '', 'Nuevo Contacto', '', '', '', '', '', '', ''],
  ['eliminar', 'PEGA-AQUI-EL-ID-DEL-CLIENTE', '', '', '', '', '', '', '', '', ''],
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
    if (cells[field].trim() !== '') data[field] = cells[field].trim();
  });
  NUMBER_FIELDS.forEach((field) => {
    if (cells[field].trim() !== '') data[field] = parseDecimal(cells[field]);
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
    CLIENT_CSV_COLUMNS.map((column) => [column, header.findIndex((name) => name.trim().toLowerCase() === column)])
  ) as Record<ClientCsvColumn, number>;

  if (columnIndexes.business_name < 0) {
    result.errors.push({ line: 1, message: 'Falta la columna "business_name". Descarga la plantilla para ver el formato.' });
    return result;
  }

  dataRows.forEach((cellsRow, rowIndex) => {
    const line = rowIndex + 2;
    const cells = Object.fromEntries(
      CLIENT_CSV_COLUMNS.map((column) => [column, (cellsRow[columnIndexes[column]] ?? '').toString()])
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
