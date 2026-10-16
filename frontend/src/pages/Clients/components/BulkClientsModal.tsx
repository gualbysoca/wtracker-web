// src/pages/Clients/components/BulkClientsModal.tsx

import { useRef, useState } from 'react';
import { X, Upload, Download, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientService } from '../../../services/client.service';
import type { BulkClientRow, BulkClientsSummary } from '../../../services/client.service';
import { downloadCsvFile } from '../../../utils/csv';
import { buildTemplateCsv, parseClientCsv } from '../clientCsv';
import type { ParsedClientCsv } from '../clientCsv';

interface BulkClientsModalProps {
  onClose: () => void;
  onCompleted: () => void;
}

const countByAction = (rows: BulkClientRow[]) => ({
  create: rows.filter((row) => row.action === 'create').length,
  update: rows.filter((row) => row.action === 'update').length,
  delete: rows.filter((row) => row.action === 'delete').length,
});

interface UploadErrorShape {
  code?: string;
  message?: string;
  response?: { status?: number; data?: { message?: string } };
}

const getErrorMessage = (error: unknown): string => {
  const { code, message, response } = (error ?? {}) as UploadErrorShape;
  if (response?.data?.message) return response.data.message;
  if (response?.status) return `El servidor respondió con error ${response.status}. Intente de nuevo.`;
  if (code === 'ECONNABORTED') return 'El servidor tardó demasiado en responder. Revise si la carga se aplicó parcialmente.';
  if (code === 'ERR_NETWORK') return 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
  return message ? `Error al procesar el archivo: ${message}` : 'Error al procesar el archivo. Intente de nuevo.';
};

export const BulkClientsModal = ({ onClose, onCompleted }: BulkClientsModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedClientCsv | null>(null);
  const [summary, setSummary] = useState<BulkClientsSummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSummary(null);
    setFileName(file.name);
    setParsed(parseClientCsv(await file.text()));
  };

  const handleUpload = async () => {
    if (!parsed || parsed.rows.length === 0 || isUploading) return;
    const counts = countByAction(parsed.rows);
    if (counts.delete > 0 && !confirm(`Se eliminarán ${counts.delete} cliente(s). ¿Deseas continuar?`)) return;

    setIsUploading(true);
    try {
      const result = await clientService.bulk(parsed.rows);
      setSummary(result);
      setParsed(null);
      setFileName('');
      onCompleted();
      if (result.errors.length === 0) toast.success('Carga masiva completada');
      else toast.error(`Carga finalizada con ${result.errors.length} error(es)`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    onClose();
  };

  const counts = parsed ? countByAction(parsed.rows) : null;
  const allErrors = [...(parsed?.errors ?? []), ...(summary?.errors ?? [])];

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div>
            <div className="card-title">Carga masiva de clientes</div>
            <div className="card-subtitle">Crea, modifica o elimina clientes con un archivo CSV</div>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={handleClose} disabled={isUploading} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Columna <strong>accion</strong>: <code>crear</code>, <code>modificar</code> o <code>eliminar</code>.
            Para modificar o eliminar se requiere la columna <strong>id</strong> (descarga el listado actual para obtenerla).
            Al modificar, las celdas vacías no cambian el valor existente.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => downloadCsvFile('plantilla_clientes.csv', buildTemplateCsv())}
              disabled={isUploading}
            >
              <Download size={16} /> Descargar plantilla
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <FileSpreadsheet size={16} /> Seleccionar archivo CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>

          {fileName && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>
              Archivo: <strong>{fileName}</strong>
            </div>
          )}

          {counts && (
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--color-success)' }}>{counts.create} por crear</span>
              <span style={{ color: 'var(--color-info)' }}>{counts.update} por modificar</span>
              <span style={{ color: 'var(--color-danger)' }}>{counts.delete} por eliminar</span>
            </div>
          )}

          {summary && (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Resultado: <strong>{summary.created}</strong> creados, <strong>{summary.updated}</strong> modificados,{' '}
              <strong>{summary.deleted}</strong> eliminados.
            </div>
          )}

          {allErrors.length > 0 && (
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-danger)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                {allErrors.length} fila(s) con errores {parsed ? '(no se enviarán)' : ''}
              </div>
              {allErrors.map((error) => (
                <div key={`${error.line}-${error.message}`} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
                  Línea {error.line}: {error.message}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isUploading}>
              Cerrar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={isUploading || !parsed || parsed.rows.length === 0}
            >
              <Upload size={16} /> {isUploading ? 'Procesando...' : 'Procesar archivo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
