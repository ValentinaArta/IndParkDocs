import { useState } from 'react';
import { X } from 'lucide-react';
import { EntitySearch, type EntitySearchResult } from './EntitySearch';
import { RentObjectButtons, getRentObjectDef, type RentObjectType } from './RentObjectButtons';

/** Extract area from entity properties based on object type */
function extractArea(props: Record<string, unknown> | undefined, objectType: RentObjectType): string {
  if (!props) return '';
  // buildings and land_plots use total_area; rooms use area; land_plot_parts use area
  const val = (props.total_area as string) || (props.area as string) || (props.cadastral_area as string) || '';
  return val ? String(val) : '';
}

export interface RentObject {
  entity_id: number | null;
  entity_name: string;
  object_type: RentObjectType;
  area: string;
  rent_rate: string;
  net_rate: string;
  utility_rate: string;
  calc_mode: 'area_rate' | 'fixed';
  comment: string;
  fixed_rent?: string;
}

function emptyRentObject(objectType: RentObjectType = 'room'): RentObject {
  return {
    entity_id: null, entity_name: '', object_type: objectType,
    area: '', rent_rate: '', net_rate: '', utility_rate: '',
    calc_mode: 'area_rate', comment: '', fixed_rent: '',
  };
}

interface Props {
  value: RentObject[];
  onChange: (items: RentObject[]) => void;
  types?: RentObjectType[];
}

export function RentObjectsEditor({ value, onChange, types }: Props) {
  const items = value;

  function update(idx: number, patch: Partial<RentObject>) {
    const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    onChange(next);
  }

  function remove(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    onChange(next);
  }

  function addItem(objectType: RentObjectType) {
    onChange([...items, emptyRentObject(objectType)]);
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <RentObjectBlock
          key={idx}
          index={idx}
          item={item}
          total={items.length}
          onUpdate={(patch) => update(idx, patch)}
          onRemove={() => remove(idx)}
        />
      ))}

      <RentObjectButtons onAdd={addItem} types={types} />
    </div>
  );
}

function RentObjectBlock({ index, item, total, onUpdate, onRemove }: {
  index: number;
  item: RentObject;
  total: number;
  onUpdate: (patch: Partial<RentObject>) => void;
  onRemove: () => void;
}) {
  const def = getRentObjectDef(item.object_type);
  const Icon = def.icon;
  const isEquipment = item.object_type === 'equipment' || item.object_type === 'meter';

  // Calculate monthly from area * rate
  const area = parseFloat(item.area) || 0;
  const rate = parseFloat(item.rent_rate) || 0;
  const isFixed = item.calc_mode === 'fixed';
  const monthly = isFixed ? (parseFloat(item.fixed_rent || '') || 0) : area * rate;

  return (
    <div className="border border-gray-200 rounded-lg p-4 relative border-l-[3px] border-l-blue-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{def.label} {index + 1}</span>
        </div>
        <button type="button" onClick={onRemove}
          className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
          <X size={16} />
        </button>
      </div>

      {/* Entity search */}
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">{def.label}</label>
        <EntitySearch
          value={item.entity_id ? { id: item.entity_id, name: item.entity_name } : null}
          onChange={(val: EntitySearchResult | null) => {
            const areaVal = val ? extractArea(val.properties, item.object_type) : '';
            onUpdate({
              entity_id: val?.id ?? null,
              entity_name: val?.name ?? '',
              ...(areaVal ? { area: areaVal } : {}),
            });
          }}
          entityType={def.entityType}
          placeholder="начните вводить..."
        />
      </div>

      {/* Equipment doesn't need area/rate fields */}
      {!isEquipment && (
        <>
          {/* Calc mode toggle */}
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="radio" name={`calc_mode_${index}`} checked={!isFixed}
                onChange={() => onUpdate({ calc_mode: 'area_rate' })}
                className="w-3.5 h-3.5" />
              По ставке
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="radio" name={`calc_mode_${index}`} checked={isFixed}
                onChange={() => onUpdate({ calc_mode: 'fixed' })}
                className="w-3.5 h-3.5" />
              Фиксированная
            </label>
          </div>

          {/* Area field */}
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Площадь, м²</label>
            <input type="number" step="0.01" value={item.area}
              onChange={(e) => onUpdate({ area: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50" />
          </div>

          {isFixed ? (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Фикс. арендная плата (руб/мес)</label>
              <input type="number" step="0.01" value={item.fixed_rent || ''}
                onChange={(e) => onUpdate({ fixed_rent: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          ) : (
            <>
              <div className="mb-2">
                <label className="block text-xs text-gray-500 mb-1">Ставка (руб/м²/мес)</label>
                <input type="number" step="0.01" value={item.rent_rate}
                  onChange={(e) => onUpdate({ rent_rate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </>
          )}

          {monthly > 0 && (
            <div className="mt-2 py-1.5 px-3 bg-blue-50 rounded-lg text-sm font-medium text-blue-800">
              = {monthly.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} руб/мес
            </div>
          )}
        </>
      )}

      {/* Comment toggle */}
      <CommentToggle value={item.comment} onChange={(v) => onUpdate({ comment: v })} />
    </div>
  );
}

function CommentToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(!!value);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-gray-600 mt-1">
        Добавить комментарий
      </button>
    );
  }

  return (
    <div className="mt-2">
      <label className="block text-xs text-gray-500 mb-1">Комментарий</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 border rounded-lg text-xs" placeholder="..." />
    </div>
  );
}
