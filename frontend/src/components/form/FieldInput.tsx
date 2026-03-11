import type { FieldDefinition } from '../../api/types';

interface Props {
  field: FieldDefinition;
  value: unknown;
  onChange: (name: string, val: unknown) => void;
}

export function FieldInput({ field, value, onChange }: Props) {
  const { name, name_ru, field_type, options, required } = field;
  const strVal = value == null ? '' : String(value);

  const label = (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {name_ru}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none';

  // Skip complex sub-form fields — they'll be handled separately
  if (['act_items', 'subject_buildings', 'subject_rooms', 'subject_land_plots', 'subject_land_plot_parts', 'equipment_list'].includes(field_type)) {
    return null;
  }

  if (field_type === 'boolean') {
    return (
      <div>
        {label}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(name, e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-300"
          />
          <span className="text-sm text-gray-600">Да</span>
        </label>
      </div>
    );
  }

  if (field_type === 'date') {
    return (
      <div>
        {label}
        <input
          type="date"
          value={strVal ? strVal.slice(0, 10) : ''}
          onChange={(e) => onChange(name, e.target.value || null)}
          className={inputCls}
        />
      </div>
    );
  }

  if (field_type === 'number') {
    return (
      <div>
        {label}
        <input
          type="number"
          step="any"
          value={strVal}
          onChange={(e) => onChange(name, e.target.value === '' ? null : Number(e.target.value))}
          className={inputCls}
        />
      </div>
    );
  }

  if (field_type === 'textarea') {
    return (
      <div>
        {label}
        <textarea
          value={strVal}
          onChange={(e) => onChange(name, e.target.value || null)}
          rows={3}
          className={inputCls + ' resize-y'}
        />
      </div>
    );
  }

  if (field_type === 'select' && options.length > 0) {
    return (
      <div>
        {label}
        <select
          value={strVal}
          onChange={(e) => onChange(name, e.target.value || null)}
          className={inputCls}
        >
          <option value="">— не выбрано —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (field_type === 'select_or_custom' && options.length > 0) {
    const isCustom = strVal && !options.includes(strVal);
    return (
      <div>
        {label}
        <select
          value={isCustom ? '__custom__' : strVal}
          onChange={(e) => {
            if (e.target.value === '__custom__') onChange(name, '');
            else onChange(name, e.target.value || null);
          }}
          className={inputCls + ' mb-1'}
        >
          <option value="">— не выбрано —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
          <option value="__custom__">Другое...</option>
        </select>
        {(isCustom || strVal === '') && (
          <input
            type="text"
            value={isCustom ? strVal : ''}
            placeholder="Введите значение"
            onChange={(e) => onChange(name, e.target.value || null)}
            className={inputCls}
          />
        )}
      </div>
    );
  }

  // Default: text input
  return (
    <div>
      {label}
      <input
        type="text"
        value={strVal}
        onChange={(e) => onChange(name, e.target.value || null)}
        className={inputCls}
        required={required}
      />
    </div>
  );
}
