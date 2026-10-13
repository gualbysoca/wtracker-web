import type { ChangeEvent } from 'react';

interface ToggleSwitchProps {
  id: string;
  name: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLabel?: string;
  offLabel?: string;
}

export const ToggleSwitch = ({
  id,
  name,
  checked,
  onChange,
  onLabel = 'Activada',
  offLabel = 'Desactivada',
}: ToggleSwitchProps) => (
  <label htmlFor={id} className="toggle-switch">
    <span className={`toggle-switch-label ${checked ? 'is-on' : ''}`}>{checked ? onLabel : offLabel}</span>
    <input
      id={id}
      type="checkbox"
      role="switch"
      name={name}
      checked={checked}
      onChange={onChange}
      className="visually-hidden"
    />
    <span className={`toggle-switch-track ${checked ? 'is-on' : ''}`} aria-hidden="true">
      <span className="toggle-switch-thumb" />
    </span>
  </label>
);
