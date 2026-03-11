import { useState, useCallback, useEffect } from 'react';
import { Plus, X, Building2, TreePine } from 'lucide-react';
import { EntitySearch } from './EntitySearch';

export interface RentObject {
  entity_id: number | null;
  entity_name: string;
  object_type: 'room' | 'land_plot' | 'land_plot_part';
  area: string;
  rent_rate: string;
  net_rate: string;
  utility_rate: string;
  calc_mode: 'area_rate' | 'fixed';
  comment: string;
  fixed_rent?: string;
}

function emptyRentObject(objectType: RentObject['object_type'] = 'room'): RentObject {
  return {
    entity_id: null, entity_name: '', object_type: objectType,
    area: '', rent_rate: '', net_rate: '', utility_rate: '',
    calc_mode: 'area_rate', comment: '', fixed_rent: '',
  };
}

interface Props {
  value: RentObject[];
  onChange: (items: RentObject[]) => void;
}

export function RentObjectsEditor({ value, onChange }: Props) {
  const items = value.length > 0 ? value : [emptyRentObject()];

  function update(idx: number, patch: Partial<RentObject>) {
    const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    onChange(next);
  }

  function remove(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    onChange(next.length ? next : [emptyRentObject()]);
  }

  function addItem(objectType: RentObject['object_type']) {
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

      {/* Add buttons */}
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => addItem('room')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
          <Plus size={14} /> Помещение
        </button>
        <button type="button" onClick={() => addItem('land_plot')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
          <Plus size={14} /> Земельный участок
        </button>
      </div>
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
  const isRoom = item.object_type === 'room';
  const isLand = item.object_type === 'land_plot' || item.object_type === 'land_plot_part';
  const typeLabel = isRoom ? 'Помещение' : 'Земельный участок';
  const entityType = isRoom ? 'room' : 'land_plot';

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
          {isRoom ? <Building2 size={14} className="text-gray-400" /> : <TreePine size={14} className="text-gray-400" />}
          <span className="text-sm font-semibold text-gray-700">{typeLabel} {index + 1}</span>
        </div>
        {total > 1 && (
          <button type="button" onClick={onRemove}
            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Entity search */}
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">{typeLabel}</label>
        <EntitySearch
          value={item.entity_id ? { id: item.entity_id, name: item.entity_name } : null}
          onChange={(val) => onUpdate({
            entity_id: val?.id ?? null,
            entity_name: val?.name ?? '',
          })}
          entityType={entityType}
          placeholder="начните вводить..."
        />
      </div>

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

      {isFixed ? (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Фикс. арендная плата (руб/мес)</label>
          <input type="number" step="0.01" value={item.fixed_rent || ''}
            onChange={(e) => onUpdate({ fixed_rent: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      ) : (
        <>
          {/* Rate */}
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Ставка (руб/м²/мес)</label>
            <input type="number" step="0.01" value={item.rent_rate}
              onChange={(e) => onUpdate({ rent_rate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          {/* Monthly display */}
          {monthly > 0 && (
            <div className="text-xs text-gray-500 mb-2">
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
