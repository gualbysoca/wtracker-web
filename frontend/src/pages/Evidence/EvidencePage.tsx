// src/pages/Evidence/EvidencePage.tsx
// Galería de auditoría de evidencias con metadatos validados

import { useState } from 'react';
import { Image, MapPin, Calendar, User } from 'lucide-react';
import { formatDate } from '../../utils/formatDate';

interface EvidenceItem {
  id: string;
  type: 'foto' | 'firma_digital';
  file_url: string;
  client_name: string;
  user_name: string;
  user_role: string;
  lat: number;
  lng: number;
  captured_at: string;
}

// Placeholder images usando un servicio de imágenes de demostración
const MOCK_EVIDENCE: EvidenceItem[] = [
  { id: '1', type: 'foto', file_url: 'https://picsum.photos/seed/ev1/400/300', client_name: 'Supermercado Central', user_name: 'Carlos Muñoz', user_role: 'reponedor', lat: -33.4489, lng: -70.6693, captured_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'foto', file_url: 'https://picsum.photos/seed/ev2/400/300', client_name: 'Minimarket Sur',       user_name: 'Ana López',    user_role: 'vendedor',  lat: -33.4580, lng: -70.6520, captured_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', type: 'foto', file_url: 'https://picsum.photos/seed/ev3/400/300', client_name: 'Farmacia Popular',     user_name: 'Carlos Muñoz', user_role: 'reponedor', lat: -33.4350, lng: -70.6800, captured_at: new Date(Date.now() - 1800000).toISOString() },
  { id: '4', type: 'foto', file_url: 'https://picsum.photos/seed/ev4/400/300', client_name: 'Botillería El Barril', user_name: 'Juan Pérez',   user_role: 'cobrador',  lat: -33.4700, lng: -70.6400, captured_at: new Date(Date.now() - 5400000).toISOString() },
  { id: '5', type: 'foto', file_url: 'https://picsum.photos/seed/ev5/400/300', client_name: 'Supermercado Central', user_name: 'Ana López',    user_role: 'vendedor',  lat: -33.4489, lng: -70.6690, captured_at: new Date(Date.now() - 900000).toISOString() },
  { id: '6', type: 'firma_digital', file_url: 'https://picsum.photos/seed/sign1/400/300', client_name: 'Almacén Doña Rosa', user_name: 'Juan Pérez', user_role: 'cobrador', lat: -33.5200, lng: -70.5900, captured_at: new Date(Date.now() - 2700000).toISOString() },
];

const EvidenceCard = ({
  item,
  onClick,
}: {
  item: EvidenceItem;
  onClick: () => void;
}) => {
  const time = new Date(item.captured_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const date = formatDate(item.captured_at);

  return (
    <div className="evidence-card" onClick={onClick} id={`evidence-card-${item.id}`}>
      <div style={{ position: 'relative' }}>
        <img src={item.file_url} alt={`Evidencia de ${item.client_name}`} className="evidence-card-img" />
        <span
          className={`badge ${item.type === 'firma_digital' ? 'badge-info' : 'badge-neutral'}`}
          style={{ position: 'absolute', top: '0.5rem', left: '0.5rem' }}
        >
          {item.type === 'firma_digital' ? '✍️ Firma' : '📷 Foto'}
        </span>
      </div>
      <div className="evidence-card-body">
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          {item.client_name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <User size={12} />
            {item.user_name} · <span style={{ textTransform: 'capitalize' }}>{item.user_role}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Calendar size={12} />
            {date} · {time}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.72rem', color: 'var(--color-accent-400)' }}>
            <MapPin size={11} />
            {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
          </div>
        </div>
      </div>
    </div>
  );
};

export const EvidencePage = () => {
  const [filter, setFilter] = useState<'all' | 'foto' | 'firma_digital'>('all');
  const [selected, setSelected] = useState<EvidenceItem | null>(null);

  const filtered = MOCK_EVIDENCE.filter(e => filter === 'all' || e.type === filter);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Galería de Evidencias</h1>
          <p>Fotografías y firmas digitales capturadas en campo con metadatos validados</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['all', 'foto', 'firma_digital'] as const).map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
              id={`evidence-filter-${f}`}
            >
              {f === 'all' ? 'Todos' : f === 'foto' ? '📷 Fotos' : '✍️ Firmas'}
            </button>
          ))}
        </div>
      </div>

      <div className="evidence-grid">
        {filtered.map((item) => (
          <EvidenceCard
            key={item.id}
            item={item}
            onClick={() => setSelected(item)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <Image size={48} className="empty-state-icon" />
            <div className="empty-state-title">Sin evidencias</div>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div>
                <div className="card-title">Evidencia — {selected.client_name}</div>
                <div className="card-subtitle">Metadatos verificados en campo</div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(null)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body">
              <img
                src={selected.file_url}
                alt="Evidencia"
                style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}
              />
              <div className="form-grid">
                <div className="form-group">
                  <div className="form-label">Cliente</div>
                  <div style={{ fontWeight: 500 }}>{selected.client_name}</div>
                </div>
                <div className="form-group">
                  <div className="form-label">Capturado por</div>
                  <div style={{ fontWeight: 500 }}>{selected.user_name} ({selected.user_role})</div>
                </div>
                <div className="form-group">
                  <div className="form-label">Coordenadas GPS</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-accent-400)' }}>
                    {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
                  </div>
                </div>
                <div className="form-group">
                  <div className="form-label">Timestamp validado</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {formatDate(selected.captured_at)} {new Date(selected.captured_at).toLocaleTimeString('es-CL')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
