import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

export const SearchableSelect = ({ options, value, onChange, placeholder = 'Seleccionar...', searchPlaceholder = 'Buscar...' }: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className="form-input"
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          width: '100%',
          textAlign: 'left',
          background: 'var(--surface-panel)',
          cursor: 'pointer'
        }}
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          width: '100%',
          marginTop: '4px',
          background: 'var(--surface-panel)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--surface-border)' }}>
            <div className="search-bar" style={{ margin: 0 }}>
              <Search size={14} className="search-bar-icon" style={{ left: '10px' }} />
              <input
                type="text"
                autoFocus
                className="form-input"
                style={{ padding: '0.4rem 0.4rem 0.4rem 2rem', fontSize: '0.85rem' }}
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <div
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: value === '' ? 'var(--color-primary-transparent)' : 'transparent',
                color: value === '' ? 'var(--color-primary)' : 'var(--text-primary)',
              }}
              onClick={() => { onChange(''); setIsOpen(false); }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = value === '' ? 'var(--color-primary-transparent)' : 'transparent'}
            >
              <span>{placeholder}</span>
              {value === '' && <Check size={16} />}
            </div>
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <div
                key={opt.value}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: value === opt.value ? 'var(--color-primary-transparent)' : 'transparent',
                  color: value === opt.value ? 'var(--color-primary)' : 'var(--text-primary)',
                }}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = value === opt.value ? 'var(--color-primary-transparent)' : 'transparent'}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check size={16} />}
              </div>
            )) : (
              <div style={{ padding: '8px 12px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
