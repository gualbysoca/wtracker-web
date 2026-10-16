// src/components/ui/PaginationBar.tsx

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  itemLabel: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export const PaginationBar = ({ page, pageSize, total, itemLabel, disabled = false, onPageChange }: PaginationBarProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
      gap: '0.75rem', padding: '0.75rem 1.5rem', borderTop: '1px solid var(--surface-border)', flexShrink: 0,
    }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Mostrando <strong style={{ color: 'var(--text-primary)' }}>{firstItem}–{lastItem}</strong> de{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{total.toLocaleString('es-BO')}</strong> {itemLabel}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Página <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> de {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
