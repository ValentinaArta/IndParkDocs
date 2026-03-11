import { useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';

const CHARGE_TYPES = ['Повторяющийся', 'Разовый', 'Доп. услуги'] as const;
const FREQUENCIES = ['Ежемесячно', 'Ежеквартально', 'Раз в полгода', 'Ежегодно'] as const;

export interface ContractItem {
  name: string;
  unit: string;
  quantity: string;
  price: string;
  amount: string;
  charge_type: string;
  frequency: string;
  payment_date: string;
  equipment_ids: number[];
  equipment_names: string[];
}

function emptyItem(): ContractItem {
  return {
    name: '', unit: '', quantity: '', price: '', amount: '',
    charge_type: 'Повторяющийся', frequency: 'Ежемесячно',
    payment_date: '', equipment_ids: [], equipment_names: [],
  };
}

interface Props {
  value: ContractItem[];
  onChange: (items: ContractItem[]) => void;
  showChargeType?: boolean;
}

export function ContractItemsEditor({ value, onChange, showChargeType = true }: Props) {
  const items = value.length > 0 ? value : [emptyItem()];

  function update(idx: number, patch: Partial<ContractItem>) {
    const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    onChange(next);
  }

  function remove(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    onChange(next.length ? next : [emptyItem()]);
  }

  function add() {
    onChange([...items, emptyItem()]);
  }

  // Auto-calc total
  const total = items.reduce((sum, it) => {
    if (!it.charge_type || it.charge_type === 'Повторяющийся') {
      return sum + (parseFloat(it.amount) || 0);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <ContractItemRow
          key={idx}
          index={idx}
          item={item}
          total={items.length}
          showChargeType={showChargeType}
          onUpdate={(patch) => update(idx, patch)}
          onRemove={() => remove(idx)}
        />
      ))}

      <div className="flex items-center justify-between">
        <button type="button" onClick={add}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
          <Plus size={14} /> Добавить позицию
        </button>
        {total > 0 && (
          <span className="text-xs text-gray-500">
            Итого (повторяющиеся): {total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб
          </span>
        )}
      </div>
    </div>
  );
}

function ContractItemRow({ index, item, total, showChargeType, onUpdate, onRemove }: {
  index: number;
  item: ContractItem;
  total: number;
  showChargeType: boolean;
  onUpdate: (patch: Partial<ContractItem>) => void;
  onRemove: () => void;
}) {
  const isOneTime = item.charge_type === 'Разовый';
  const isExtra = item.charge_type === 'Доп. услуги';
  const borderColor = isOneTime ? 'border-l-amber-300' : isExtra ? 'border-l-green-300' : 'border-l-blue-300';

  return (
    <div className={`border border-gray-200 rounded-lg p-3 border-l-[3px] ${borderColor}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          {/* Row 1: name + amount */}
          <div className="grid grid-cols-[1fr_140px] gap-2">
            <input type="text" value={item.name} placeholder="Наименование работы/услуги"
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm" />
            <input type="number" step="0.01" value={item.amount} placeholder="Сумма"
              onChange={(e) => onUpdate({ amount: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm text-right" />
          </div>

          {/* Row 2: charge type + frequency */}
          {showChargeType && (
            <div className="flex gap-2 flex-wrap">
              <select value={item.charge_type}
                onChange={(e) => onUpdate({ charge_type: e.target.value })}
                className="px-2 py-1 border rounded text-xs text-gray-600">
                {CHARGE_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
              </select>
              {item.charge_type === 'Повторяющийся' && (
                <select value={item.frequency}
                  onChange={(e) => onUpdate({ frequency: e.target.value })}
                  className="px-2 py-1 border rounded text-xs text-gray-600">
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              )}
              {isOneTime && (
                <input type="date" value={item.payment_date}
                  onChange={(e) => onUpdate({ payment_date: e.target.value })}
                  className="px-2 py-1 border rounded text-xs text-gray-600" />
              )}
            </div>
          )}
        </div>

        {total > 1 && (
          <button type="button" onClick={onRemove}
            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 mt-1">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
