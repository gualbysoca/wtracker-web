import type { ChangeEvent } from 'react';

interface SettingNumberFieldProps {
  id: string;
  name: string;
  label: string;
  hint: string;
  value: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const SettingNumberField = ({
  id,
  name,
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: SettingNumberFieldProps) => (
  <div className="form-group settings-field">
    <label htmlFor={id} className="form-label">{label}</label>
    <div className="settings-field-control">
      <input
        id={id}
        type="number"
        name={name}
        inputMode="numeric"
        className="form-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        required
      />
      {unit && <span className="settings-field-unit">{unit}</span>}
    </div>
    <small className="form-hint">{hint} ({min}–{max})</small>
  </div>
);
