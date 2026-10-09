// src/pages/CrossData/CrossDataPage.tsx
// Matriz de cruce Reponedor vs Vendedor por cliente

import { useState } from 'react';
import { GitCompare, CheckCircle2, XCircle } from 'lucide-react';
import type { CrossDataRow } from '../../types';

const MOCK_CROSS: CrossDataRow[] = [
  { client_id: '1', client_name: 'Supermercado Central Norte', address: 'Av. Principal 1200', sellers: ['Ana López'], replenishers: ['Carlos Muñoz'], total_visits: 8, total_failed: 1 },
  { client_id: '2', client_name: 'Minimarket La Esquina',      address: 'Calle Sur 45',       sellers: ['Ana López'], replenishers: null,            total_visits: 3, total_failed: 0 },
  { client_id: '3', client_name: 'Farmacia Popular',           address: 'Av. Las Palmas 890', sellers: null,          replenishers: ['Carlos Muñoz'], total_visits: 5, total_failed: 2 },
  { client_id: '4', client_name: 'Botillería El Barril',       address: 'Pasaje Roble 12',    sellers: ['Pedro Vera'], replenishers: ['Pedro Vera'],  total_visits: 6, total_failed: 0 },
  { client_id: '5', client_name: 'Almacén Doña Rosa',          address: 'Villa El Sol 34',    sellers: null,           replenishers: null,            total_visits: 0, total_failed: 0 },
];

const CellIndicator = ({ names }: { names: string[] | null }) => {
  if (!names || names.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-danger)', fontSize: '0.8rem' }}>
        <XCircle size={14} />
        Sin tarea
      </div>
    );
  }
  return (
    <div>
      {names.map((name) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-success)', fontSize: '0.8rem' }}>
          <CheckCircle2 size={14} />
          {name}
        </div>
      ))}
    </div>
  );
};

export const CrossDataPage = () => {
  const [rows] = useState<CrossDataRow[]>(MOCK_CROSS);

  const bothPresent = rows.filter(r => r.sellers?.length && r.replenishers?.length).length;
  const onlySeller  = rows.filter(r => r.sellers?.length && !r.replenishers?.length).length;
  const onlyReplen  = rows.filter(r => !r.sellers?.length && r.replenishers?.length).length;
  const neither     = rows.filter(r => !r.sellers?.length && !r.replenishers?.length).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Cruce de Información</h1>
          <p>Auditoría de tareas: Vendedores vs. Reponedores por cliente</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card success">
          <div className="stat-icon-wrapper success"><GitCompare size={20} /></div>
          <div><div className="stat-value">{bothPresent}</div><div className="stat-label">Ambos registraron tarea</div></div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon-wrapper warning"><CheckCircle2 size={20} /></div>
          <div><div className="stat-value">{onlySeller}</div><div className="stat-label">Solo Vendedor</div></div>
        </div>
        <div className="stat-card primary">
          <div className="stat-icon-wrapper primary"><CheckCircle2 size={20} /></div>
          <div><div className="stat-value">{onlyReplen}</div><div className="stat-label">Solo Reponedor</div></div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon-wrapper danger"><XCircle size={20} /></div>
          <div><div className="stat-value">{neither}</div><div className="stat-label">Sin tarea</div></div>
        </div>
      </div>

      {/* Cross Matrix Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table className="table cross-table" id="cross-data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Dirección</th>
                <th>🛒 Vendedor</th>
                <th>📦 Reponedor</th>
                <th>Tareas</th>
                <th>Fallidas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const hasBoth = row.sellers?.length && row.replenishers?.length;
                return (
                  <tr key={row.client_id} className={hasBoth ? 'both-present' : ''}>
                    <td style={{ fontWeight: 500 }}>{row.client_name}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{row.address}</td>
                    <td className={row.sellers?.length ? 'has-data' : ''}><CellIndicator names={row.sellers} /></td>
                    <td className={row.replenishers?.length ? 'has-data' : ''}><CellIndicator names={row.replenishers} /></td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.total_visits}</td>
                    <td style={{ textAlign: 'center' }}>
                      {row.total_failed > 0
                        ? <span className="badge badge-danger">{row.total_failed}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
